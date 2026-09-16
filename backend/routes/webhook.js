'use strict';

const express = require('express');
const { getAuditById, saveAudit } = require('../lib/db');
const { generateReport } = require('../lib/pdf');
const sentinelleDb = require('../lib/sentinelleDb');

const router = express.Router();

/**
 * Stripe webhook handler — shared by both products (BeneIT Audit's one-time
 * payment and Sentinelle's subscription), registered on the same Stripe
 * endpoint. Events are told apart by their metadata (auditId vs siteId).
 *
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

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;

      if (session.metadata?.auditId) {
        await handleAuditPaid(session);
      } else if (session.metadata?.siteId) {
        handleSiteActivated(session);
      } else {
        console.warn('[webhook] Session sans auditId ni siteId dans les métadonnées.');
      }
    } else if (event.type === 'customer.subscription.updated') {
      handleSubscriptionUpdated(event.data.object);
    } else if (event.type === 'customer.subscription.deleted') {
      handleSubscriptionDeleted(event.data.object);
    }
  } catch (err) {
    // Never let a webhook processing error surface a 5xx to Stripe for an
    // event we can't retry-fix anyway — log it and acknowledge receipt.
    console.error('[webhook] Erreur de traitement :', err.message);
  }

  res.status(200).send('OK');
});

// ─── BeneIT Audit — one-time report payment ─────────────────────────

async function handleAuditPaid(session) {
  const auditId = session.metadata.auditId;
  const audit = getAuditById(auditId);
  if (!audit) {
    console.warn(`[webhook] Audit ${auditId} introuvable.`);
    return;
  }

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

// ─── Sentinelle — recurring monitoring subscription ─────────────────

function handleSiteActivated(session) {
  const siteId = session.metadata.siteId;
  const site = sentinelleDb.getSiteById(siteId);
  if (!site) {
    console.warn(`[webhook] Site ${siteId} introuvable.`);
    return;
  }

  sentinelleDb.activateSite(siteId, {
    stripeCustomerId: session.customer,
    stripeSubscriptionId: session.subscription,
  });
  console.log(`[webhook] Site ${siteId} (${site.hostname}) activé.`);
}

function handleSubscriptionUpdated(subscription) {
  const site = sentinelleDb.getSiteByStripeSubscriptionId(subscription.id);
  if (!site) return; // not a Sentinelle subscription — ignore

  const activeStatuses = ['active', 'trialing'];
  const nextStatus = activeStatuses.includes(subscription.status) ? 'active' : 'paused';
  sentinelleDb.setSiteStatus(site.id, nextStatus);
  console.log(`[webhook] Site ${site.id} (${site.hostname}) -> ${nextStatus} (Stripe: ${subscription.status}).`);
}

function handleSubscriptionDeleted(subscription) {
  const site = sentinelleDb.getSiteByStripeSubscriptionId(subscription.id);
  if (!site) return;

  sentinelleDb.setSiteStatus(site.id, 'canceled');
  console.log(`[webhook] Site ${site.id} (${site.hostname}) -> canceled.`);
}

module.exports = router;
