'use strict';

const express = require('express');
const { requireCronSecret } = require('../lib/auth');
const { cronLimiter } = require('../middleware/rateLimiters');
const { runChecksForAllSites } = require('../lib/monitor');
const sentinelleDb = require('../lib/sentinelleDb');
const { sendMail } = require('../lib/mailer');

const router = express.Router();

router.use(cronLimiter);
router.use(requireCronSecret);

/**
 * POST /api/cron/run-checks — triggered by the scheduled GitHub Actions
 * workflow every 15-30 min. Runs uptime + SSL checks for every active site.
 */
router.post('/run-checks', async (req, res) => {
  try {
    const results = await runChecksForAllSites();
    res.json({ checked: results.length });
  } catch (err) {
    console.error('[cron] Erreur run-checks :', err.message);
    res.status(500).json({ error: 'Erreur lors des vérifications.' });
  }
});

/**
 * GET /api/cron/health — dead-man's switch, called by an INDEPENDENT
 * external scheduler. If run-checks hasn't reported in for too long, this
 * alerts the site operator (not the customers) so a broken monitor never
 * fails silently.
 */
router.get('/health', async (req, res) => {
  const staleMinutes = parseInt(process.env.CRON_STALE_MINUTES, 10) || 45;
  const lastRunAt = sentinelleDb.getMeta('last_run_at');

  const minutesSinceLastRun = lastRunAt
    ? Math.round((Date.now() - new Date(lastRunAt).getTime()) / 60000)
    : null;

  const stale = minutesSinceLastRun === null || minutesSinceLastRun > staleMinutes;

  if (stale) {
    const lastAlertAt = sentinelleDb.getMeta('health_alert_sent_at');
    const cooldownMinutes = 360; // don't re-alert more than once per 6h while broken
    const shouldAlert = !lastAlertAt || (Date.now() - new Date(lastAlertAt).getTime()) > cooldownMinutes * 60000;

    if (shouldAlert) {
      const adminEmail = process.env.ADMIN_ALERT_EMAIL;
      if (adminEmail) {
        await sendMail({
          to: adminEmail,
          subject: 'Sentinelle — le cron de vérification semble arrêté',
          text: lastRunAt
            ? `La dernière exécution de /api/cron/run-checks remonte à ${minutesSinceLastRun} minutes (seuil : ${staleMinutes} min). Vérifiez le workflow GitHub Actions et le déploiement du serveur.`
            : `Aucune exécution de /api/cron/run-checks n'a encore été enregistrée. Vérifiez que le workflow GitHub Actions est bien configuré et actif.`,
        });
      }
      sentinelleDb.setMeta('health_alert_sent_at', new Date().toISOString());
    }
  }

  res.json({ stale, minutesSinceLastRun, staleThresholdMinutes: staleMinutes });
});

module.exports = router;
