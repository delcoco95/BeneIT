'use strict';

const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.BENEIT_DATA_DIR || path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'audits.json');
const REPORTS_DIR = path.join(DATA_DIR, 'reports');

// Ensure the reports directory exists
if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

/**
 * Read all audits from the JSON file.
 * @returns {Array} Array of audit objects
 */
function getAudits() {
  let raw;
  try {
    raw = fs.readFileSync(DATA_FILE, 'utf-8');
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
  // JSON illisible : on leve l'erreur plutot que de risquer d'ecraser le fichier.
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error('audits.json invalide : tableau attendu.');
  return parsed;
}

/** Ecriture atomique : fichier temporaire dans le meme dossier puis renommage. */
function writeAudits(audits) {
  const tmp = path.join(DATA_DIR, `audits.json.${process.pid}.${Date.now()}.tmp`);
  try {
    fs.writeFileSync(tmp, JSON.stringify(audits, null, 2), 'utf-8');
    fs.renameSync(tmp, DATA_FILE);
  } catch (err) {
    try { fs.unlinkSync(tmp); } catch { /* deja absent */ }
    throw err;
  }
}

/**
 * Get a single audit by ID.
 * @param {string} id
 * @returns {object|null}
 */
function getAuditById(id) {
  const audits = getAudits();
  return audits.find(a => a.id === id) || null;
}

/**
 * Save (create or update) an audit.
 * If an audit with the same id exists, it is replaced.
 * @param {object} audit
 */
function saveAudit(audit) {
  const audits = getAudits();
  const idx = audits.findIndex(a => a.id === audit.id);
  if (idx >= 0) {
    audits[idx] = audit;
  } else {
    audits.push(audit);
  }
  writeAudits(audits);
}

/**
 * Delete an audit by ID. Also removes its PDF report if it exists.
 * @param {string} id
 * @returns {boolean} true if found and deleted
 */
function deleteAudit(id) {
  const audits = getAudits();
  const idx = audits.findIndex(a => a.id === id);
  if (idx < 0) return false;

  audits.splice(idx, 1);
  writeAudits(audits);

  // Remove associated PDF if it exists
  const pdfPath = path.join(REPORTS_DIR, `${id}.pdf`);
  if (fs.existsSync(pdfPath)) {
    fs.unlinkSync(pdfPath);
  }

  return true;
}

/**
 * Get the path to a report PDF.
 * @param {string} id
 * @returns {string}
 */
function getReportPath(id) {
  return path.join(REPORTS_DIR, `${id}.pdf`);
}

// Conservation (voir confidentialite.html) : 12 mois pour un diagnostic anonyme,
// 3 ans s'il est rattache a une demande de contact.
const DAY = 24 * 3600 * 1000;
const RETENTION_ANONYMOUS = 365 * DAY;
const RETENTION_WITH_LEAD = 3 * 365 * DAY;

/**
 * Supprime les diagnostics expires (et leur PDF). Retourne le nombre supprime.
 * @param {Date} [now]
 */
function purgeExpiredAudits(now = new Date()) {
  const audits = getAudits();
  const keep = [];
  let removed = 0;
  for (const audit of audits) {
    const age = now.getTime() - new Date(audit.createdAt).getTime();
    const limit = audit.leadId || audit.paid ? RETENTION_WITH_LEAD : RETENTION_ANONYMOUS;
    if (age > limit) {
      removed++;
      const pdfPath = getReportPath(audit.id);
      if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);
    } else {
      keep.push(audit);
    }
  }
  if (removed) writeAudits(keep);
  return removed;
}

module.exports = { getAudits, getAuditById, saveAudit, deleteAudit, getReportPath, purgeExpiredAudits };
