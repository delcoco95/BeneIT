'use strict';

const tls = require('tls');
const { sendMail } = require('./mailer');
const sentinelleDb = require('./sentinelleDb');

const HTTP_TIMEOUT_MS = 10000;
const SSL_TIMEOUT_MS = 8000;

// ─── Individual checks ─────────────────────────────────────────────

/**
 * Check whether a URL responds with a successful status.
 * Uses the Node 18+ global fetch — no extra dependency.
 */
async function checkHttp(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS);
  const start = Date.now();
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'User-Agent': 'BeneIT-Sentinelle-Monitor/1.0' },
    });
    return {
      ok: res.status >= 200 && res.status < 400,
      statusCode: res.status,
      responseTimeMs: Date.now() - start,
      error: null,
    };
  } catch (err) {
    return {
      ok: false,
      statusCode: null,
      responseTimeMs: Date.now() - start,
      error: err.message || String(err),
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Check the TLS certificate expiry for a hostname on port 443.
 * Returns { daysRemaining, error } — daysRemaining is null if the check failed
 * (e.g. the site isn't served over HTTPS at all, which isn't itself an outage).
 */
function checkSsl(hostname) {
  return new Promise((resolve) => {
    let settled = false;
    const socket = tls.connect(
      { host: hostname, port: 443, servername: hostname, timeout: SSL_TIMEOUT_MS, rejectUnauthorized: false },
      () => {
        if (settled) return;
        settled = true;
        const cert = socket.getPeerCertificate();
        socket.end();
        if (!cert || !cert.valid_to) {
          resolve({ daysRemaining: null, error: 'Certificat introuvable.' });
          return;
        }
        const validTo = new Date(cert.valid_to);
        const daysRemaining = Math.floor((validTo.getTime() - Date.now()) / 86400000);
        resolve({ daysRemaining, error: null });
      }
    );
    socket.on('timeout', () => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve({ daysRemaining: null, error: 'Délai dépassé lors de la vérification SSL.' });
    });
    socket.on('error', (err) => {
      if (settled) return;
      settled = true;
      resolve({ daysRemaining: null, error: err.message });
    });
  });
}

// ─── Alerting ───────────────────────────────────────────────────────

async function alertSiteDown(site, httpResult) {
  await sendMail({
    to: site.email,
    subject: `Sentinelle — ${site.hostname} semble injoignable`,
    text: `Bonjour,\n\nVotre site ${site.url} ne répond plus correctement (${httpResult.error || `code ${httpResult.statusCode}`}).\n\nNous continuons à vérifier automatiquement et vous préviendrons dès que tout redevient normal.\n\n— Sentinelle, un service BeneIT`,
  });
  sentinelleDb.recordAlertSent(site.id, 'down');
}

async function alertSiteUp(site) {
  await sendMail({
    to: site.email,
    subject: `Sentinelle — ${site.hostname} est de nouveau accessible`,
    text: `Bonjour,\n\nBonne nouvelle : votre site ${site.url} répond de nouveau normalement.\n\n— Sentinelle, un service BeneIT`,
  });
  sentinelleDb.recordAlertSent(site.id, 'up');
}

async function alertSslExpiring(site, daysRemaining) {
  await sendMail({
    to: site.email,
    subject: `Sentinelle — le certificat SSL de ${site.hostname} expire bientôt`,
    text: `Bonjour,\n\nLe certificat SSL de ${site.url} expire dans ${daysRemaining} jour(s). Si ce certificat n'est pas renouvelé automatiquement, pensez à le renouveler avant cette échéance pour éviter que votre site n'affiche une alerte de sécurité à vos visiteurs.\n\n— Sentinelle, un service BeneIT`,
  });
  sentinelleDb.recordAlertSent(site.id, 'ssl_warn');
}

// ─── One site ───────────────────────────────────────────────────────

/**
 * Run both checks for a single site, persist the result, and send
 * exactly one alert per genuine state transition (never on every tick).
 */
async function runCheckForSite(site) {
  const [httpResult, sslResult] = await Promise.all([
    checkHttp(site.url),
    checkSsl(site.hostname),
  ]);

  sentinelleDb.insertCheck({
    siteId: site.id,
    httpOk: httpResult.ok,
    httpStatusCode: httpResult.statusCode,
    responseTimeMs: httpResult.responseTimeMs,
    sslDaysRemaining: sslResult.daysRemaining,
    error: httpResult.error || sslResult.error,
  });

  // ── Uptime transition
  const currentStatus = httpResult.ok ? 'up' : 'down';
  const prevStatus = site.last_status;

  if (currentStatus === 'down' && prevStatus !== 'down') {
    await alertSiteDown(site, httpResult);
  } else if (currentStatus === 'up' && prevStatus === 'down') {
    await alertSiteUp(site);
  }

  // ── SSL transition (only alert when entering the "warn" bucket —
  //    a renewed certificate isn't urgent news, so we don't alert on recovery)
  let nextSslBucket = site.last_ssl_bucket;
  if (sslResult.daysRemaining !== null) {
    const threshold = site.ssl_alert_threshold_days || 14;
    nextSslBucket = sslResult.daysRemaining <= threshold ? 'warn' : 'ok';
    if (nextSslBucket === 'warn' && site.last_ssl_bucket !== 'warn') {
      await alertSslExpiring(site, sslResult.daysRemaining);
    }
  }

  sentinelleDb.updateSiteAfterCheck(site.id, {
    lastStatus: currentStatus,
    lastSslBucket: nextSslBucket,
    lastCheckedAt: new Date().toISOString(),
  });

  return { siteId: site.id, http: httpResult, ssl: sslResult };
}

// ─── All sites ──────────────────────────────────────────────────────

async function runChecksForAllSites() {
  const sites = sentinelleDb.listActiveSites();
  const results = [];
  for (const site of sites) {
    try {
      results.push(await runCheckForSite(site));
    } catch (err) {
      console.error(`[monitor] Erreur inattendue pour le site ${site.id} :`, err.message);
    }
  }
  sentinelleDb.setMeta('last_run_at', new Date().toISOString());
  return results;
}

module.exports = { checkHttp, checkSsl, runCheckForSite, runChecksForAllSites };
