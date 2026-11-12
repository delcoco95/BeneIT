'use strict';

const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');

// Meme dossier que sentinelle.db : monte sur le disque persistant Render (render.yaml).
const DATA_DIR = process.env.BENEIT_DATA_DIR || path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'leads.db');

// Conservation : 3 ans apres la demande (prospects non devenus clients), cf. politique de confidentialite.
const RETENTION_DAYS = 3 * 365;

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(DB_FILE);
db.exec('PRAGMA journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS leads (
    id          TEXT PRIMARY KEY,
    created_at  TEXT NOT NULL,
    source      TEXT NOT NULL,
    need        TEXT NOT NULL,
    name        TEXT NOT NULL,
    company     TEXT,
    email       TEXT NOT NULL,
    phone       TEXT,
    message     TEXT,
    audit_id    TEXT,
    consent_at  TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'nouveau'
  );
  CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at DESC);
`);

function createLead({ id, source, need, name, company, email, phone, message, auditId }) {
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO leads (id, created_at, source, need, name, company, email, phone, message, audit_id, consent_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, now, source, need, name, company, email, phone, message, auditId, now);
  return getLead(id);
}

function getLead(id) {
  return db.prepare('SELECT * FROM leads WHERE id = ?').get(id) || null;
}

function listLeads() {
  return db.prepare('SELECT * FROM leads ORDER BY created_at DESC').all();
}

function setLeadStatus(id, status) {
  return db.prepare('UPDATE leads SET status = ? WHERE id = ?').run(status, id).changes > 0;
}

function deleteLead(id) {
  return db.prepare('DELETE FROM leads WHERE id = ?').run(id).changes > 0;
}

/** Supprime les demandes plus anciennes que la duree de conservation. Retourne le nombre supprime. */
function purgeExpiredLeads(now = new Date()) {
  const limit = new Date(now.getTime() - RETENTION_DAYS * 24 * 3600 * 1000).toISOString();
  return db.prepare('DELETE FROM leads WHERE created_at < ?').run(limit).changes;
}

module.exports = { createLead, getLead, listLeads, setLeadStatus, deleteLead, purgeExpiredLeads, RETENTION_DAYS };
