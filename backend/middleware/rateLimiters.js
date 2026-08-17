'use strict';

const rateLimit = require('express-rate-limit');

// ─── Audit endpoint (POST /api/audit) — generous limit ─────────

const auditLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de tentatives, réessayez plus tard.' },
  keyGenerator: (req) => req.ip,
});

// ─── AI calls (when freeText is present) — strict limit ────────

const aiLimiterPerHour = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de tentatives, réessayez plus tard.' },
  keyGenerator: (req) => req.ip,
  // Only count requests that actually have freeText
  skip: (req) => {
    return !req.body || !req.body.freeText || req.body.freeText.trim().length === 0;
  },
});

const aiLimiterPerDay = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Limite journalière atteinte, réessayez demain.' },
  keyGenerator: (req) => req.ip,
  skip: (req) => {
    return !req.body || !req.body.freeText || req.body.freeText.trim().length === 0;
  },
});

// ─── Checkout (POST /api/checkout) — anti brute-force ──────────

const checkoutLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de tentatives de paiement, réessayez plus tard.' },
  keyGenerator: (req) => req.ip,
});

// ─── Admin routes — tight limit ────────────────────────────────

const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de tentatives, réessayez plus tard.' },
  keyGenerator: (req) => req.ip,
});

module.exports = {
  auditLimiter,
  aiLimiterPerHour,
  aiLimiterPerDay,
  checkoutLimiter,
  adminLimiter,
};
