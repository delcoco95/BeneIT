'use strict';

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data', 'audits.json');
const REPORTS_DIR = path.join(__dirname, '..', 'data', 'reports');

// Ensure the reports directory exists
if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

/**
 * Read all audits from the JSON file.
 * @returns {Array} Array of audit objects
 */
function getAudits() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
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
  fs.writeFileSync(DATA_FILE, JSON.stringify(audits, null, 2), 'utf-8');
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
  fs.writeFileSync(DATA_FILE, JSON.stringify(audits, null, 2), 'utf-8');

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

module.exports = { getAudits, getAuditById, saveAudit, deleteAudit, getReportPath };
