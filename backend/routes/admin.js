'use strict';

const express = require('express');
const { getAudits, getAuditById, deleteAudit } = require('../lib/db');
const sentinelleDb = require('../lib/sentinelleDb');
const leadsDb = require('../lib/leadsDb');
const { runCheckForSite } = require('../lib/monitor');
const { requireAdmin } = require('../lib/auth');
const { adminLimiter } = require('../middleware/rateLimiters');

const router = express.Router();

// All admin routes are rate-limited and require token auth
router.use(adminLimiter);
router.use(requireAdmin);

/**
 * GET /api/admin/audits — List all audits (sorted by date, most recent first).
 */
router.get('/audits', (req, res) => {
  const audits = getAudits()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map(a => ({
      id: a.id,
      profile: a.profile,
      score: a.report?.score,
      paid: a.paid,
      hasFreeText: !!a.freeText,
      hasAi: a.ai?.available || false,
      createdAt: a.createdAt,
    }));

  res.json({ audits, total: audits.length });
});

/**
 * GET /api/admin/audits/:id — Get full details of a single audit.
 */
router.get('/audits/:id', (req, res) => {
  const audit = getAuditById(req.params.id);
  if (!audit) {
    return res.status(404).json({ error: 'Audit introuvable.' });
  }
  res.json(audit);
});

/**
 * DELETE /api/admin/audits/:id — Delete an audit and its PDF.
 */
router.delete('/audits/:id', (req, res) => {
  const deleted = deleteAudit(req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: 'Audit introuvable.' });
  }
  res.json({ success: true });
});

/**
 * GET /api/admin/stats — Quick stats overview.
 */
router.get('/stats', (req, res) => {
  const audits = getAudits();
  const today = new Date().toISOString().slice(0, 10);

  const stats = {
    total: audits.length,
    paid: audits.filter(a => a.paid).length,
    today: audits.filter(a => a.createdAt?.startsWith(today)).length,
    withAi: audits.filter(a => a.ai?.available).length,
    avgScore: audits.length > 0
      ? Math.round(audits.reduce((s, a) => s + (a.report?.score || 0), 0) / audits.length)
      : 0,
  };

  res.json(stats);
});

/**
 * GET /api/admin/leads — Demandes de contact, plus recentes d'abord.
 */
router.get('/leads', (req, res) => {
  const leads = leadsDb.listLeads();
  res.json({ leads, total: leads.length });
});

const LEAD_STATUSES = ['nouveau', 'contacte', 'devis', 'client', 'perdu'];

/**
 * POST /api/admin/leads/:id/status — Suivi commercial d'une demande.
 */
router.post('/leads/:id/status', (req, res) => {
  const { status } = req.body || {};
  if (!LEAD_STATUSES.includes(status)) {
    return res.status(400).json({ error: `Statut invalide (${LEAD_STATUSES.join(', ')}).` });
  }
  if (!leadsDb.setLeadStatus(req.params.id, status)) return res.status(404).json({ error: 'Demande introuvable.' });
  res.json({ success: true });
});

/**
 * DELETE /api/admin/leads/:id — Droit a l'effacement (RGPD).
 */
router.delete('/leads/:id', (req, res) => {
  if (!leadsDb.deleteLead(req.params.id)) return res.status(404).json({ error: 'Demande introuvable.' });
  res.json({ success: true });
});

/**
 * GET /api/admin/sites — List all Sentinelle sites (sorted by date, most recent first).
 */
router.get('/sites', (req, res) => {
  const sites = sentinelleDb.listAllSitesForAdmin();
  res.json({ sites, total: sites.length });
});

/**
 * POST /api/admin/sites/:id/check — Manually trigger a check for one site
 * (useful for support/debugging without waiting for the next cron tick).
 */
router.post('/sites/:id/check', async (req, res) => {
  const site = sentinelleDb.getSiteById(req.params.id);
  if (!site) {
    return res.status(404).json({ error: 'Site introuvable.' });
  }
  try {
    const result = await runCheckForSite(site);
    res.json({ success: true, result });
  } catch (err) {
    console.error('[admin] Erreur vérification manuelle :', err.message);
    res.status(500).json({ error: 'Erreur lors de la vérification.' });
  }
});

module.exports = router;
