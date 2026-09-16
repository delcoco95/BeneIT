'use strict';

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const sentinelleDb = require('../lib/sentinelleDb');
const { sitesLimiter } = require('../middleware/rateLimiters');

const router = express.Router();

/**
 * POST /api/sites — Register a site to monitor and start its subscription.
 * The site is only activated once the Stripe webhook confirms payment
 * (see routes/webhook.js) — this route just creates the pending record
 * and returns a Checkout URL.
 */
router.post('/', sitesLimiter, async (req, res) => {
  try {
    const { url, email, honeypot } = req.body;

    // ── Honeypot — invisible field, only bots fill it
    if (honeypot && honeypot.trim().length > 0) {
      return res.status(400).json({ error: 'Requête invalide.' });
    }

    // ── Validate URL
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL manquante.' });
    }
    let parsedUrl;
    try {
      parsedUrl = new URL(url.trim());
    } catch {
      return res.status(400).json({ error: 'URL invalide. Utilisez un format complet, ex : https://exemple.fr' });
    }
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return res.status(400).json({ error: 'Seules les URL http:// ou https:// sont acceptées.' });
    }

    // ── Validate email (basic format check)
    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ error: 'Adresse email invalide.' });
    }

    // ── Create the pending site record
    const site = sentinelleDb.createSite({
      id: uuidv4(),
      url: parsedUrl.toString(),
      hostname: parsedUrl.hostname,
      email: email.trim(),
      sslAlertThresholdDays: parseInt(process.env.SSL_ALERT_DAYS, 10) || 14,
    });

    // ── Check Stripe configuration
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    const priceId = process.env.SENTINELLE_STRIPE_PRICE_ID;

    if (!stripeKey || !priceId) {
      return res.status(503).json({
        error: 'Le paiement n\'est pas encore configuré. Contactez-nous pour activer la surveillance de votre site.',
      });
    }

    const stripe = require('stripe')(stripeKey);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: site.email,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${frontendUrl}/confirmation.html?site=${site.id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/sentinelle-signup.html?cancelled=true`,
      metadata: { siteId: site.id },
      subscription_data: { metadata: { siteId: site.id } },
    });

    return res.json({ url: session.url });

  } catch (err) {
    console.error('[sites] Erreur :', err.message);
    return res.status(500).json({ error: 'Erreur lors de l\'inscription.' });
  }
});

module.exports = router;
