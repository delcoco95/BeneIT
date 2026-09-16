'use strict';

const path = require('path');
const fs = require('fs');
// Node's built-in SQLite (stable since v22.5, still flagged as experimental).
// Chosen over better-sqlite3 specifically to avoid a native/node-gyp build
// step — one less thing that can fail on a fresh install or a host's build
// image. Run Node with --experimental-sqlite (see package.json scripts).
const { DatabaseSync } = require('node:sqlite');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'sentinelle.db');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db = new DatabaseSync(DB_FILE);
db.exec('PRAGMA journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS sites (
    id                       TEXT PRIMARY KEY,
    url                      TEXT NOT NULL,
    hostname                 TEXT NOT NULL,
    email                    TEXT NOT NULL,
    status                   TEXT NOT NULL DEFAULT 'pending_payment',
    stripe_customer_id       TEXT,
    stripe_subscription_id   TEXT,
    ssl_alert_threshold_days INTEGER NOT NULL DEFAULT 14,
    last_status              TEXT,
    last_ssl_bucket          TEXT,
    last_checked_at          TEXT,
    created_at               TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS checks (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    site_id            TEXT NOT NULL,
    checked_at         TEXT NOT NULL,
    http_ok            INTEGER,
    http_status_code   INTEGER,
    response_time_ms   INTEGER,
    ssl_days_remaining INTEGER,
    error              TEXT,
    FOREIGN KEY (site_id) REFERENCES sites(id)
  );
  CREATE INDEX IF NOT EXISTS idx_checks_site_id ON checks(site_id, checked_at DESC);

  CREATE TABLE IF NOT EXISTS alerts_sent (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    site_id    TEXT NOT NULL,
    alert_type TEXT NOT NULL,
    sent_at    TEXT NOT NULL,
    FOREIGN KEY (site_id) REFERENCES sites(id)
  );

  CREATE TABLE IF NOT EXISTS meta (
    key   TEXT PRIMARY KEY,
    value TEXT
  );
`);

// ─── Sites ──────────────────────────────────────────────────────────

function createSite({ id, url, hostname, email, sslAlertThresholdDays }) {
  db.prepare(`
    INSERT INTO sites (id, url, hostname, email, status, ssl_alert_threshold_days, created_at)
    VALUES (@id, @url, @hostname, @email, 'pending_payment', @sslAlertThresholdDays, @createdAt)
  `).run({
    id, url, hostname, email,
    sslAlertThresholdDays: sslAlertThresholdDays || 14,
    createdAt: new Date().toISOString(),
  });
  return getSiteById(id);
}

function getSiteById(id) {
  return db.prepare('SELECT * FROM sites WHERE id = ?').get(id) || null;
}

function getSiteByStripeSubscriptionId(subscriptionId) {
  return db.prepare('SELECT * FROM sites WHERE stripe_subscription_id = ?').get(subscriptionId) || null;
}

function activateSite(id, { stripeCustomerId, stripeSubscriptionId }) {
  db.prepare(`
    UPDATE sites SET status = 'active', stripe_customer_id = ?, stripe_subscription_id = ?
    WHERE id = ?
  `).run(stripeCustomerId, stripeSubscriptionId, id);
  return getSiteById(id);
}

function setSiteStatus(id, status) {
  db.prepare('UPDATE sites SET status = ? WHERE id = ?').run(status, id);
  return getSiteById(id);
}

function updateSiteAfterCheck(id, { lastStatus, lastSslBucket, lastCheckedAt }) {
  db.prepare(`
    UPDATE sites SET last_status = ?, last_ssl_bucket = ?, last_checked_at = ?
    WHERE id = ?
  `).run(lastStatus, lastSslBucket, lastCheckedAt, id);
}

function listActiveSites() {
  return db.prepare(`SELECT * FROM sites WHERE status = 'active'`).all();
}

function listAllSitesForAdmin() {
  return db.prepare('SELECT * FROM sites ORDER BY created_at DESC').all();
}

// ─── Checks ─────────────────────────────────────────────────────────

function insertCheck({ siteId, httpOk, httpStatusCode, responseTimeMs, sslDaysRemaining, error }) {
  db.prepare(`
    INSERT INTO checks (site_id, checked_at, http_ok, http_status_code, response_time_ms, ssl_days_remaining, error)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(siteId, new Date().toISOString(), httpOk ? 1 : 0, httpStatusCode, responseTimeMs, sslDaysRemaining, error || null);
}

function getRecentChecks(siteId, limit = 20) {
  return db.prepare('SELECT * FROM checks WHERE site_id = ? ORDER BY checked_at DESC LIMIT ?').all(siteId, limit);
}

// ─── Alerts ─────────────────────────────────────────────────────────

function recordAlertSent(siteId, alertType) {
  db.prepare('INSERT INTO alerts_sent (site_id, alert_type, sent_at) VALUES (?, ?, ?)')
    .run(siteId, alertType, new Date().toISOString());
}

// ─── Meta (key/value — used for the cron dead-man's switch) ────────

function getMeta(key) {
  const row = db.prepare('SELECT value FROM meta WHERE key = ?').get(key);
  return row ? row.value : null;
}

function setMeta(key, value) {
  db.prepare(`
    INSERT INTO meta (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(key, value);
}

module.exports = {
  createSite,
  getSiteById,
  getSiteByStripeSubscriptionId,
  activateSite,
  setSiteStatus,
  updateSiteAfterCheck,
  listActiveSites,
  listAllSitesForAdmin,
  insertCheck,
  getRecentChecks,
  recordAlertSent,
  getMeta,
  setMeta,
};
