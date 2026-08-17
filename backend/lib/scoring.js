'use strict';

const questionsConfig = require('../../config/questions.json');

const STATUS_SCORES = { good: 1, warn: 0.5, bad: 0 };

/**
 * Compute a deterministic score /100 from the visitor's answers.
 *
 * Logic: each question is worth an equal share. A "good" answer scores 100%
 * of its share, "warn" scores 50%, "bad" scores 0%.
 * The total is normalised to a 0–100 integer.
 *
 * @param {string} profile - "particulier" or "pme"
 * @param {Array<{id:string, optionIndex:number}>} answers
 * @returns {{ score:number, categories:object, summary:string }}
 */
function computeScore(profile, answers) {
  const questions = questionsConfig.questions[profile];
  if (!questions) {
    throw new Error(`Profil inconnu : ${profile}`);
  }

  const totalQuestions = questions.length;
  if (totalQuestions === 0) {
    return { score: 0, categories: {}, summary: '' };
  }

  // Build a lookup: questionId → chosen option
  const answerMap = {};
  for (const a of answers) {
    answerMap[a.id] = a;
  }

  // Accumulate per-category results
  const catResults = {};
  let totalPoints = 0;

  for (const q of questions) {
    const answer = answerMap[q.id];
    if (!answer) continue; // unanswered question treated as skipped

    const optIdx = answer.optionIndex;
    const option = q.options[optIdx];
    if (!option) continue;

    const status = option.status; // good | warn | bad
    const points = STATUS_SCORES[status] ?? 0;
    totalPoints += points;

    if (!catResults[q.category]) {
      catResults[q.category] = { worst: 'good', tips: [], count: 0, points: 0 };
    }
    const cat = catResults[q.category];
    cat.count++;
    cat.points += points;

    // Track worst status
    const rank = { bad: 2, warn: 1, good: 0 };
    if (rank[status] > rank[cat.worst]) {
      cat.worst = status;
    }

    if (option.tip) {
      cat.tips.push(option.tip);
    }
  }

  // Normalise to 0–100
  const answeredCount = Object.values(catResults).reduce((s, c) => s + c.count, 0);
  const score = answeredCount > 0
    ? Math.round((totalPoints / answeredCount) * 100)
    : 0;

  // Build categories summary
  const categories = {};
  for (const key of questionsConfig.categoryOrder) {
    const meta = questionsConfig.categories[key];
    const result = catResults[key];
    if (!result) {
      categories[key] = {
        label: meta.label,
        status: 'good',
        statusLabel: 'BIEN',
        tips: [meta.goodTip]
      };
      continue;
    }

    let statusLabel;
    switch (result.worst) {
      case 'good': statusLabel = 'BIEN'; break;
      case 'warn': statusLabel = 'À SURVEILLER'; break;
      case 'bad':  statusLabel = 'PRIORITAIRE'; break;
    }

    categories[key] = {
      label: meta.label,
      status: result.worst,
      statusLabel,
      tips: result.tips.length > 0 ? result.tips : [meta.goodTip]
    };
  }

  // Generate headline
  const badCount  = Object.values(catResults).filter(c => c.worst === 'bad').length;
  const warnCount = Object.values(catResults).filter(c => c.worst === 'warn').length;

  let summary;
  if (badCount >= 2) {
    summary = 'Plusieurs points méritent une attention rapide.';
  } else if (badCount === 1) {
    summary = 'Un point mérite une attention rapide — le reste est globalement sain.';
  } else if (warnCount >= 2) {
    summary = "Rien d'alarmant, mais quelques points méritent d'être vérifiés.";
  } else {
    summary = "Bonne nouvelle : l'essentiel est déjà bien maîtrisé.";
  }

  return { score, categories, summary };
}

module.exports = { computeScore };
