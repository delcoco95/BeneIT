'use strict';

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const questionsConfig = require('../../config/questions.json');

const REPORTS_DIR = path.join(__dirname, '..', 'data', 'reports');

// Ensure reports directory exists
if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

// ─── Colors ───────────────────────────────────────────────────────

const COLORS = {
  primary:  '#7B6CF6',
  dark:     '#0D0B14',
  ink:      '#1a1a2e',
  sub:      '#555577',
  good:     '#22c55e',
  warn:     '#eab308',
  bad:      '#ef4444',
  border:   '#e0e0e8',
  bg:       '#fafafe',
};

const STATUS_LABELS = { good: 'BIEN', warn: 'À SURVEILLER', bad: 'PRIORITAIRE' };
const STATUS_COLORS = { good: COLORS.good, warn: COLORS.warn, bad: COLORS.bad };

// ─── Main PDF generation ──────────────────────────────────────────

/**
 * Generate a detailed PDF report for an audit.
 *
 * @param {object} audit - The full audit object from the database
 * @returns {Promise<string>} - Path to the generated PDF file
 */
function generateReport(audit) {
  return new Promise((resolve, reject) => {
    const filePath = path.join(REPORTS_DIR, `${audit.id}.pdf`);
    const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
    const stream = fs.createWriteStream(filePath);

    doc.pipe(stream);

    // ── Header
    doc.fontSize(24).fillColor(COLORS.primary).text('beneIT', 50, 50);
    doc.fontSize(10).fillColor(COLORS.sub).text('Rapport de diagnostic informatique', 50, 78);

    doc.moveTo(50, 100).lineTo(545, 100).strokeColor(COLORS.border).stroke();

    // ── Meta
    const y = 115;
    doc.fontSize(9).fillColor(COLORS.sub);
    doc.text(`Date : ${new Date(audit.createdAt).toLocaleDateString('fr-FR')}`, 50, y);
    doc.text(`Profil : ${audit.profile === 'particulier' ? 'Particulier' : 'TPE / PME'}`, 50, y + 14);
    doc.text(`Identifiant : ${audit.id}`, 50, y + 28);

    // ── Score box
    const scoreY = y + 60;
    doc.roundedRect(50, scoreY, 495, 70, 8).fillColor(COLORS.bg).fill();
    doc.roundedRect(50, scoreY, 495, 70, 8).strokeColor(COLORS.border).stroke();

    doc.fontSize(36).fillColor(COLORS.primary).text(`${audit.report.score}`, 70, scoreY + 12, { continued: true });
    doc.fontSize(16).fillColor(COLORS.sub).text(' / 100', { continued: false });
    doc.fontSize(11).fillColor(COLORS.ink).text(audit.report.summary, 220, scoreY + 22, { width: 310 });

    let currentY = scoreY + 90;

    // ── Categories detail
    doc.fontSize(14).fillColor(COLORS.ink).text('Détail par catégorie', 50, currentY);
    currentY += 28;

    for (const catKey of questionsConfig.categoryOrder) {
      const cat = audit.report.categories[catKey];
      if (!cat) continue;

      // Category header
      const statusColor = STATUS_COLORS[cat.status] || COLORS.sub;
      doc.fontSize(11).fillColor(COLORS.ink).text(`${cat.label}`, 50, currentY, { continued: true });
      doc.fillColor(statusColor).text(`  ${cat.statusLabel}`, { continued: false });
      currentY += 18;

      // Tips
      for (const tip of cat.tips) {
        doc.fontSize(9).fillColor(COLORS.sub).text(`→ ${tip}`, 65, currentY, { width: 470 });
        currentY += doc.heightOfString(`→ ${tip}`, { width: 470 }) + 6;
      }

      currentY += 10;

      // Page break check
      if (currentY > 700) {
        doc.addPage();
        currentY = 50;
      }
    }

    // ── Question-by-question detail
    currentY += 10;
    if (currentY > 650) { doc.addPage(); currentY = 50; }

    doc.fontSize(14).fillColor(COLORS.ink).text('Détail question par question', 50, currentY);
    currentY += 28;

    const questions = questionsConfig.questions[audit.profile] || [];
    const answerMap = {};
    for (const a of audit.answers) {
      answerMap[a.id] = a;
    }

    for (const q of questions) {
      const answer = answerMap[q.id];
      if (!answer) continue;

      const option = q.options[answer.optionIndex];
      if (!option) continue;

      // Question text
      doc.fontSize(10).fillColor(COLORS.ink).text(q.text, 50, currentY, { width: 495 });
      currentY += doc.heightOfString(q.text, { width: 495 }) + 4;

      // Answer with status dot
      const dotColor = STATUS_COLORS[option.status] || COLORS.sub;
      doc.circle(60, currentY + 4, 3).fillColor(dotColor).fill();
      doc.fontSize(9).fillColor(COLORS.ink).text(option.label, 70, currentY, { width: 470 });
      currentY += 14;

      // Tip if present
      if (option.tip) {
        doc.fontSize(8).fillColor(COLORS.sub).text(`→ ${option.tip}`, 70, currentY, { width: 465 });
        currentY += doc.heightOfString(`→ ${option.tip}`, { width: 465 }) + 4;
      }

      currentY += 10;

      if (currentY > 700) {
        doc.addPage();
        currentY = 50;
      }
    }

    // ── AI Insight section (optional)
    if (audit.ai && audit.ai.available) {
      if (currentY > 600) { doc.addPage(); currentY = 50; }

      doc.moveTo(50, currentY).lineTo(545, currentY).strokeColor(COLORS.border).stroke();
      currentY += 15;

      doc.fontSize(14).fillColor(COLORS.primary).text('Analyse personnalisée', 50, currentY);
      currentY += 24;

      if (audit.freeText) {
        doc.fontSize(9).fillColor(COLORS.sub).text('Votre description :', 50, currentY);
        currentY += 14;
        doc.fontSize(9).fillColor(COLORS.ink).text(`« ${audit.freeText} »`, 60, currentY, { width: 475 });
        currentY += doc.heightOfString(`« ${audit.freeText} »`, { width: 475 }) + 12;
      }

      doc.fontSize(10).fillColor(COLORS.ink).text(audit.ai.commentaire, 50, currentY, { width: 495 });
      currentY += doc.heightOfString(audit.ai.commentaire, { width: 495 }) + 12;

      if (audit.ai.actionsSupplementaires && audit.ai.actionsSupplementaires.length > 0) {
        doc.fontSize(10).fillColor(COLORS.ink).text('Actions suggérées :', 50, currentY);
        currentY += 16;

        for (const action of audit.ai.actionsSupplementaires) {
          doc.fontSize(9).fillColor(COLORS.sub).text(`• ${action}`, 60, currentY, { width: 475 });
          currentY += doc.heightOfString(`• ${action}`, { width: 475 }) + 4;
        }
      }
    }

    // ── Footer
    const pageCount = doc.bufferedPageRange().count;
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      doc.fontSize(7).fillColor(COLORS.sub).text(
        `BeneIT — Rapport de diagnostic — Page ${i + 1}/${pageCount}`,
        50, 780, { width: 495, align: 'center' }
      );
    }

    doc.end();

    stream.on('finish', () => resolve(filePath));
    stream.on('error', reject);
  });
}

module.exports = { generateReport };
