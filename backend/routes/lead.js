'use strict';

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { validateLead, NEEDS } = require('../lib/leadValidation');
const { createMailQuota } = require('../lib/mailQuota');
const leadsDb = require('../lib/leadsDb');
const { getAuditById, saveAudit } = require('../lib/db');
const { generateReport } = require('../lib/pdf');
const { sendMail } = require('../lib/mailer');
const { leadLimiter } = require('../middleware/rateLimiters');

const router = express.Router();

const LABELS = {
  bilan: 'Bilan Découverte (PME)',
  contrat: 'Contrat Sérénité (PME)',
  sentinelle: 'Sentinelle (surveillance de site)',
  depannage: 'Dépannage / intervention',
  rapport: 'Rapport de diagnostic',
  autre: 'Autre demande',
};
// Dérivé de NEEDS : une clé sans libellé retombe sur « Autre demande ».
const NEED_LABELS = Object.fromEntries(NEEDS.map((k) => [k, LABELS[k] || LABELS.autre]));

// Anti-relais de spam : 3 e-mails de confirmation max par destinataire et par 24 h.
const confirmQuota = createMailQuota({ max: 3, windowMs: 24 * 3600 * 1000 });

/**
 * POST /api/lead — Demande de contact (formulaire du site ou fin de diagnostic).
 * Enregistre la demande, previent l'admin par e-mail et, si elle vient d'un
 * diagnostic, genere le rapport PDF et renvoie son lien de telechargement.
 */
router.post('/', leadLimiter, async (req, res) => {
  try {
    // Honeypot : champ invisible que seuls les robots remplissent. Reponse neutre.
    if (typeof req.body?.website === 'string' && req.body.website.trim()) {
      return res.json({ ok: true });
    }

    const result = validateLead(req.body);
    if (!result.ok) return res.status(400).json({ error: result.error });
    const lead = { id: uuidv4(), ...result.lead };

    let audit = null;
    if (lead.auditId) {
      audit = getAuditById(lead.auditId);
      if (!audit) return res.status(404).json({ error: 'Diagnostic introuvable. Recommencez le questionnaire.' });
      // Idempotence : diagnostic déjà rattaché à une demande, rien à recréer ni à renvoyer.
      if (audit.leadId) return res.json({ ok: true, downloadUrl: `/api/report/${audit.id}` });
    }

    // Le PDF d'abord : si sa génération échoue, aucune demande n'est enregistrée.
    if (audit && !audit.reportGenerated) {
      await generateReport(audit);
      audit.reportGenerated = true;
    }

    leadsDb.createLead(lead);

    let downloadUrl = null;
    if (audit) {
      audit.leadId = lead.id;
      saveAudit(audit);
      downloadUrl = `/api/report/${audit.id}`;
    }

    // E-mails : jamais bloquants (sendMail ne leve pas et ignore l'absence de SMTP).
    notifyAdmin(lead, audit).catch(() => {});
    if (downloadUrl && confirmQuota.tryConsume(lead.email)) confirmToVisitor(lead, downloadUrl).catch(() => {});

    return res.json({ ok: true, downloadUrl });
  } catch (err) {
    console.error('[lead] Erreur :', err.message);
    return res.status(500).json({ error: 'Une erreur est survenue. Réessayez ou écrivez-nous directement.' });
  }
});

async function notifyAdmin(lead, audit) {
  const to = process.env.ADMIN_ALERT_EMAIL;
  if (!to) return;
  const lines = [
    `Nouvelle demande : ${NEED_LABELS[lead.need]}`,
    '',
    `Nom : ${lead.name}`,
    lead.company ? `Entreprise : ${lead.company}` : null,
    `E-mail : ${lead.email}`,
    lead.phone ? `Téléphone : ${lead.phone}` : null,
    audit ? `Diagnostic : profil ${audit.profile}, score ${audit.report?.score}/100` : null,
    lead.message ? `\nMessage :\n${lead.message}` : null,
  ].filter((l) => l !== null);
  await sendMail({ to, subject: `[BeneIT] ${NEED_LABELS[lead.need]} — ${lead.name}`, text: lines.join('\n') });
}

async function confirmToVisitor(lead, downloadUrl) {
  const base = (process.env.FRONTEND_URL || '').replace(/\/$/, '');
  if (!base) return;
  await sendMail({
    to: lead.email,
    subject: 'Votre rapport de diagnostic BeneIT',
    text: [
      `Bonjour ${lead.name},`,
      '',
      'Merci pour votre diagnostic. Votre rapport détaillé est disponible ici :',
      `${base}${downloadUrl}`,
      '',
      'Je reviens vers vous rapidement pour en parler si vous le souhaitez.',
      '',
      'BeneIT',
    ].join('\n'),
  });
}

module.exports = router;
module.exports.NEED_LABELS = NEED_LABELS;
