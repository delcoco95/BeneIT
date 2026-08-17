'use strict';

const express = require('express');
const { getAudits, getAuditById, deleteAudit } = require('../lib/db');
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

module.exports = router;
