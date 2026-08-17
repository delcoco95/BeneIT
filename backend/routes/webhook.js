'use strict';

const express = require('express');
const { getAuditById, saveAudit } = require('../lib/db');
const { generateReport } = require('../lib/pdf');

const router = express.Router();

/**
 * Stripe webhook handler.
 * NOTE: This route must receive the RAW body (not parsed JSON).
 * The raw body middleware is applied in server.js specifically for this route.
 */
router.post('/', async (req, res) => {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeKey || !webhookSecret) {
    console.warn('[webhook] Stripe non configuré, webhook ignoré.');
    return res.status(200).send('OK');
  }

  const stripe = require('stripe')(stripeKey);
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('[webhook] Signature invalide :', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle checkout.session.completed
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const auditId = session.metadata?.auditId;

    if (!auditId) {
      console.warn('[webhook] Session sans auditId dans les métadonnées.');
      return res.status(200).send('OK');
    }

    const audit = getAuditById(auditId);
    if (!audit) {
      console.warn(`[webhook] Audit ${auditId} introuvable.`);
      return res.status(200).send('OK');
    }

    // Mark as paid and generate PDF
    audit.paid = true;
    audit.paidAt = new Date().toISOString();
    audit.stripeSessionId = session.id;

    try {
      await generateReport(audit);
      audit.reportGenerated = true;
    } catch (err) {
      console.error(`[webhook] Erreur génération PDF pour ${auditId}:`, err.message);
      audit.reportGenerated = false;
    }

    saveAudit(audit);
    console.log(`[webhook] Audit ${auditId} marqué comme payé.`);
  }

  res.status(200).send('OK');
});

module.exports = router;
