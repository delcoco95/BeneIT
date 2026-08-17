'use strict';

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { computeScore } = require('../lib/scoring');
const { generateInsight } = require('../lib/ai');
const { saveAudit } = require('../lib/db');
const { auditLimiter, aiLimiterPerHour, aiLimiterPerDay } = require('../middleware/rateLimiters');
const questionsConfig = require('../../config/questions.json');

const router = express.Router();

// Apply rate limiters
router.post('/', auditLimiter, aiLimiterPerHour, aiLimiterPerDay, async (req, res) => {
  try {
    const { profile, answers, freeText, website } = req.body;

    // ── Honeypot check — if 'website' field is filled, it's a bot
    if (website && website.trim().length > 0) {
      // Return a plausible-looking empty response to avoid tipping off the bot
      return res.json({
        id: uuidv4(),
        score: 0,
        summary: '',
        categories: {},
        ai: { available: false, commentaire: '', actionsSupplementaires: [] }
      });
    }

    // ── Validate profile
    if (!profile || !['particulier', 'pme'].includes(profile)) {
      return res.status(400).json({ error: 'Profil invalide. Utilisez "particulier" ou "pme".' });
    }

    // ── Validate answers
    if (!Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ error: 'Réponses manquantes.' });
    }

    const validQuestionIds = questionsConfig.questions[profile].map(q => q.id);
    for (const answer of answers) {
      if (!answer.id || typeof answer.optionIndex !== 'number') {
        return res.status(400).json({ error: 'Format de réponse invalide.' });
      }
      if (!validQuestionIds.includes(answer.id)) {
        return res.status(400).json({ error: `Question inconnue : ${answer.id}` });
      }
      const question = questionsConfig.questions[profile].find(q => q.id === answer.id);
      if (answer.optionIndex < 0 || answer.optionIndex >= question.options.length) {
        return res.status(400).json({ error: `Option invalide pour la question ${answer.id}.` });
      }
    }

    // ── Validate freeText (if provided)
    let sanitizedFreeText = '';
    if (freeText !== undefined && freeText !== null && freeText !== '') {
      if (typeof freeText !== 'string') {
        return res.status(400).json({ error: 'Le texte libre doit être une chaîne de caractères.' });
      }
      if (freeText.length > 600) {
        return res.status(400).json({ error: 'Le texte libre ne doit pas dépasser 600 caractères.' });
      }
      sanitizedFreeText = freeText.trim();
    }

    // ── Compute score (always deterministic, never fails)
    const report = computeScore(profile, answers);

    // ── AI insight (optional, never blocks)
    let aiResult = { available: false, commentaire: '', actionsSupplementaires: [] };
    if (sanitizedFreeText.length > 0) {
      aiResult = await generateInsight({
        profile,
        answers,
        freeText: sanitizedFreeText,
        report
      });
    }

    // ── Save audit
    const audit = {
      id: uuidv4(),
      profile,
      answers,
      freeText: sanitizedFreeText || null,
      report,
      ai: aiResult,
      paid: false,
      createdAt: new Date().toISOString(),
    };
    saveAudit(audit);

    // ── Return result
    return res.json({
      id: audit.id,
      score: report.score,
      summary: report.summary,
      categories: report.categories,
      ai: {
        available: aiResult.available,
        commentaire: aiResult.commentaire,
        actionsSupplementaires: aiResult.actionsSupplementaires
      }
    });

  } catch (err) {
    console.error('[audit] Erreur :', err.message);
    return res.status(500).json({ error: 'Une erreur interne est survenue.' });
  }
});

// ── GET /api/audit/questions — serve questions config to the frontend
router.get('/questions', (req, res) => {
  res.json({
    categories: questionsConfig.categories,
    categoryOrder: questionsConfig.categoryOrder,
    questions: questionsConfig.questions,
  });
});

module.exports = router;
