'use strict';

/**
 * Quota glissant en memoire : au plus `max` envois par cle (adresse) et par fenetre.
 * Remis a zero au redemarrage du processus : suffisant contre le relais de spam.
 */
function createMailQuota({ max = 3, windowMs = 24 * 3600 * 1000 } = {}) {
  const hits = new Map();

  function tryConsume(key, now = Date.now()) {
    const k = String(key).trim().toLowerCase();
    const recent = (hits.get(k) || []).filter((t) => now - t < windowMs);
    if (recent.length >= max) {
      hits.set(k, recent);
      return false;
    }
    recent.push(now);
    hits.set(k, recent);
    if (hits.size > 10000) {
      for (const [other, list] of hits) {
        if (!list.some((t) => now - t < windowMs)) hits.delete(other);
      }
    }
    return true;
  }

  return { tryConsume };
}

module.exports = { createMailQuota };
