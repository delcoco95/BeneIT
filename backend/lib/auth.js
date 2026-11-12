'use strict';

const crypto = require('crypto');

// Comparaison en temps constant, sans fuite de longueur : on compare les SHA-256.
function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

/**
 * Middleware that checks for a valid admin token in the Authorization header.
 * Expects: Authorization: Bearer <ADMIN_TOKEN>
 */
function requireAdmin(req, res, next) {
  const adminToken = process.env.ADMIN_TOKEN;
  if (!adminToken) {
    return res.status(503).json({ error: 'Administration non configurée.' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token manquant.' });
  }

  const token = authHeader.slice(7);

  if (!safeEqual(token, adminToken)) {
    return res.status(403).json({ error: 'Token invalide.' });
  }

  next();
}

/**
 * Middleware that checks for a valid shared secret on cron-triggered routes.
 * Expects: X-Cron-Secret: <CRON_SECRET>
 */
function requireCronSecret(req, res, next) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return res.status(503).json({ error: 'Cron non configuré.' });
  }

  const provided = req.headers['x-cron-secret'] || '';

  if (!safeEqual(provided, cronSecret)) {
    return res.status(403).json({ error: 'Secret invalide.' });
  }

  next();
}

module.exports = { requireAdmin, requireCronSecret };
