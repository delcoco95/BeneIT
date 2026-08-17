'use strict';

const express = require('express');
const path = require('path');
const fs = require('fs');
const { getAuditById, getReportPath } = require('../lib/db');

const router = express.Router();

/**
 * GET /api/report/:id — Download the PDF report for a paid audit.
 */
router.get('/:id', (req, res) => {
  const { id } = req.params;

  // Validate ID format (UUID v4)
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return res.status(400).json({ error: 'Identifiant invalide.' });
  }

  const audit = getAuditById(id);
  if (!audit) {
    return res.status(404).json({ error: 'Audit introuvable.' });
  }

  if (!audit.paid) {
    return res.status(403).json({ error: 'Ce rapport n\'a pas encore été payé.' });
  }

  const pdfPath = getReportPath(id);
  if (!fs.existsSync(pdfPath)) {
    return res.status(404).json({ error: 'Le fichier PDF n\'a pas encore été généré.' });
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="BeneIT-Rapport-${id.slice(0, 8)}.pdf"`);
  fs.createReadStream(pdfPath).pipe(res);
});

module.exports = router;
