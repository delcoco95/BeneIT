'use strict';

const express = require('express');
const { getAuditById, saveAudit } = require('../lib/db');
const { checkoutLimiter } = require('../middleware/rateLimiters');

const router = express.Router();

router.post('/', checkoutLimiter, async (req, res) => {
  try {
    const { auditId } = req.body;

    if (!auditId) {
      return res.status(400).json({ error: 'Identifiant d\'audit manquant.' });
    }

    const audit = getAuditById(auditId);
    if (!audit) {
      return res.status(404).json({ error: 'Audit introuvable.' });
    }

    if (audit.paid) {
      return res.status(400).json({ error: 'Ce rapport a déjà été payé.' });
    }

    // Check Stripe configuration
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    const priceId = process.env.STRIPE_PRICE_ID;

    if (!stripeKey || !priceId) {
      return res.status(503).json({
        error: 'Le paiement n\'est pas encore configuré. Contactez-nous pour obtenir votre rapport.'
      });
    }

    const stripe = require('stripe')(stripeKey);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price: priceId,
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${frontendUrl}/confirmation.html?audit=${auditId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/?cancelled=true`,
      metadata: {
        auditId,
      },
    });

    return res.json({ url: session.url });

  } catch (err) {
    console.error('[checkout] Erreur :', err.message);
    return res.status(500).json({ error: 'Erreur lors de la création de la session de paiement.' });
  }
});

module.exports = router;
