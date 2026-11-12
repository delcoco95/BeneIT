'use strict';

/**
 * Validation d'une demande de contact (lead). Fonction pure, sans I/O,
 * pour pouvoir la tester sans serveur ni base.
 */

const SOURCES = ['diagnostic', 'contact'];
const NEEDS = ['bilan', 'contrat', 'sentinelle', 'depannage', 'rapport', 'autre'];

const LIMITS = { name: 80, company: 120, email: 254, phone: 30, message: 1000 };

const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[a-z]{2,}$/i;
const NAME_RE = /^[\p{L}\p{M}' .-]{2,80}$/u;
const PHONE_RE = /^[0-9+().\s-]{6,30}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Retire les caracteres de controle (retours a la ligne conserves seulement pour le message).
const clean = (value, keepNewlines = false) =>
  String(value)
    .replace(keepNewlines ? /[\u0000-\u0009\u000B-\u001F\u007F]/g : /[\u0000-\u001F\u007F]/g, '')
    .trim();

/**
 * @param {object} body - corps JSON recu
 * @returns {{ ok: true, lead: object } | { ok: false, error: string }}
 */
function validateLead(body) {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Requête invalide.' };

  for (const key of ['name', 'company', 'email', 'phone', 'message', 'need', 'source', 'auditId']) {
    if (body[key] !== undefined && body[key] !== null && typeof body[key] !== 'string') {
      return { ok: false, error: 'Format de champ invalide.' };
    }
  }

  const source = SOURCES.includes(body.source) ? body.source : null;
  if (!source) return { ok: false, error: 'Origine de la demande invalide.' };

  const need = NEEDS.includes(body.need) ? body.need : (source === 'diagnostic' ? 'rapport' : null);
  if (!need) return { ok: false, error: 'Merci de préciser votre besoin.' };

  const name = clean(body.name || '');
  if (name.length < 2) return { ok: false, error: 'Merci d\'indiquer votre nom.' };
  if (name.length > LIMITS.name) return { ok: false, error: 'Nom trop long.' };
  if (!NAME_RE.test(name)) {
    return { ok: false, error: 'Le nom ne peut contenir que des lettres, espaces, apostrophes, points et tirets.' };
  }

  const email = clean(body.email || '').toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > LIMITS.email) {
    return { ok: false, error: 'Adresse e-mail invalide.' };
  }

  const company = clean(body.company || '');
  if (company.length > LIMITS.company) return { ok: false, error: 'Nom d\'entreprise trop long.' };

  const phone = clean(body.phone || '');
  if (phone && !PHONE_RE.test(phone)) return { ok: false, error: 'Numéro de téléphone invalide.' };

  const message = clean(body.message || '', true);
  if (message.length > LIMITS.message) {
    return { ok: false, error: `Le message ne doit pas dépasser ${LIMITS.message} caractères.` };
  }

  const auditId = body.auditId ? clean(body.auditId) : null;
  if (auditId && !UUID_RE.test(auditId)) return { ok: false, error: 'Identifiant de diagnostic invalide.' };
  if (source === 'diagnostic' && !auditId) return { ok: false, error: 'Identifiant de diagnostic manquant.' };

  // Consentement RGPD explicite : un booleen true, pas une chaine.
  if (body.consent !== true) {
    return { ok: false, error: 'Merci d\'accepter que vos données soient utilisées pour vous recontacter.' };
  }

  return {
    ok: true,
    lead: { source, need, name, company: company || null, email, phone: phone || null, message: message || null, auditId },
  };
}

module.exports = { validateLead, NEEDS, SOURCES, LIMITS };
