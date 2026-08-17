'use strict';

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

  // Constant-time comparison to prevent timing attacks
  if (token.length !== adminToken.length) {
    return res.status(403).json({ error: 'Token invalide.' });
  }

  let mismatch = 0;
  for (let i = 0; i < token.length; i++) {
    mismatch |= token.charCodeAt(i) ^ adminToken.charCodeAt(i);
  }

  if (mismatch !== 0) {
    return res.status(403).json({ error: 'Token invalide.' });
  }

  next();
}

module.exports = { requireAdmin };
