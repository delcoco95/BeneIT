'use strict';

// ─── State ────────────────────────────────────────────────────────

let QUESTIONS_CONFIG = null;
let state = { path: null, questions: [], index: 0, answers: [], auditId: null };

const CATEGORY_ORDER_DEFAULT = ['securite', 'sauvegarde', 'acces', 'performance'];

// ─── Boot: load questions from backend ────────────────────────────

async function loadQuestions() {
  try {
    const res = await fetch('/api/audit/questions');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    QUESTIONS_CONFIG = await res.json();
  } catch (err) {
    console.error('Impossible de charger les questions :', err);
    // Fallback: the page stays on intro, user can't proceed
  }
}

loadQuestions();

// ─── Path picker ──────────────────────────────────────────────────

document.querySelectorAll('.path-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (!QUESTIONS_CONFIG) {
      alert('Les questions n\'ont pas pu être chargées. Veuillez rafraîchir la page.');
      return;
    }
    const path = btn.dataset.path;
    const questions = QUESTIONS_CONFIG.questions[path];
    if (!questions) return;

    state = { path, questions, index: 0, answers: [], auditId: null };
    document.getElementById('intro').style.display = 'none';
    document.getElementById('stage').classList.add('active');
    buildReportRows();
    renderTranscript();
    renderActive();
    updateProgress();
  });
});

// ─── Progress bar ─────────────────────────────────────────────────

function updateProgress() {
  // +1 for the free text step
  const total = state.questions.length + 1;
  const done = Math.min(state.index, total);
  document.getElementById('progressFill').style.width = (done / total * 100) + '%';
  document.getElementById('progressLabel').textContent = done + '/' + total;
}

// ─── Transcript ───────────────────────────────────────────────────

function renderTranscript() {
  const el = document.getElementById('transcript');
  el.innerHTML = '';

  for (const a of state.answers) {
    const line = document.createElement('div');
    line.className = 't-line';

    const dot = document.createElement('div');
    dot.className = 't-dot ' + a.status;
    dot.textContent = a.status === 'good' ? '✓' : (a.status === 'warn' ? '!' : '×');

    const text = document.createElement('div');
    text.className = 't-text';

    const q = document.createElement('span');
    q.className = 'q';
    q.textContent = a.qText;

    const ans = document.createElement('span');
    ans.className = 'a';
    ans.textContent = a.label;

    text.appendChild(q);
    text.appendChild(ans);
    line.appendChild(dot);
    line.appendChild(text);
    el.appendChild(line);
  }

  el.scrollTop = el.scrollHeight;
}

// ─── Active area (question / free text / loading / summary) ───────

function renderActive() {
  const area = document.getElementById('activeArea');

  if (state.index < state.questions.length) {
    // ── Show question
    const q = state.questions[state.index];
    area.innerHTML = '';

    const qcard = document.createElement('div');
    qcard.className = 'qcard';

    const eyebrow = document.createElement('div');
    eyebrow.className = 'qcard-eyebrow';
    eyebrow.textContent = `Question ${state.index + 1} / ${state.questions.length}`;

    const h3 = document.createElement('h3');
    h3.textContent = q.text;

    const options = document.createElement('div');
    options.className = 'options';

    q.options.forEach((o, i) => {
      const btn = document.createElement('button');
      btn.className = 'opt-btn';
      btn.textContent = o.label;
      btn.addEventListener('click', () => answer(q, i));
      options.appendChild(btn);
    });

    qcard.appendChild(eyebrow);
    qcard.appendChild(h3);
    qcard.appendChild(options);
    area.appendChild(qcard);

  } else if (state.index === state.questions.length) {
    // ── Show free text step
    renderFreeTextStep(area);

  } else {
    // ── Show loading, then submit
    area.innerHTML = '';
    const thinking = document.createElement('div');
    thinking.className = 'thinking';
    for (let i = 0; i < 3; i++) {
      const dot = document.createElement('span');
      dot.className = 'think-dot';
      thinking.appendChild(dot);
    }
    const label = document.createTextNode('\u00A0Analyse de vos réponses…');
    thinking.appendChild(label);
    area.appendChild(thinking);

    submitAudit();
  }
}

// ─── Free text step ───────────────────────────────────────────────

function renderFreeTextStep(area) {
  area.innerHTML = '';
  const MAX_CHARS = 600;

  const qcard = document.createElement('div');
  qcard.className = 'qcard';

  const eyebrow = document.createElement('div');
  eyebrow.className = 'qcard-eyebrow';
  eyebrow.textContent = 'Étape facultative';

  const h3 = document.createElement('h3');
  h3.textContent = 'Un problème en particulier ? Décrivez-le avec vos mots.';

  const sub = document.createElement('p');
  sub.className = 'freetext-sub';
  sub.textContent = 'Ce champ est facultatif. Votre description permet de personnaliser le commentaire de votre bilan.';

  const textarea = document.createElement('textarea');
  textarea.className = 'freetext-input';
  textarea.id = 'freeTextInput';
  textarea.maxLength = MAX_CHARS;
  textarea.placeholder = 'Ex. : Mon PC est très lent depuis une mise à jour, et je reçois des emails suspects...';
  textarea.rows = 4;

  const counter = document.createElement('div');
  counter.className = 'freetext-counter';
  counter.id = 'freeTextCounter';
  counter.textContent = `0 / ${MAX_CHARS}`;

  textarea.addEventListener('input', () => {
    const len = textarea.value.length;
    counter.textContent = `${len} / ${MAX_CHARS}`;
    if (len >= MAX_CHARS) {
      counter.classList.add('at-limit');
    } else {
      counter.classList.remove('at-limit');
    }
  });

  const actions = document.createElement('div');
  actions.className = 'freetext-actions';

  const skipBtn = document.createElement('button');
  skipBtn.className = 'opt-btn freetext-skip';
  skipBtn.textContent = 'Passer cette étape →';
  skipBtn.addEventListener('click', () => {
    state.index++;
    updateProgress();
    renderActive();
  });

  const submitBtn = document.createElement('button');
  submitBtn.className = 'cta-btn freetext-submit';
  submitBtn.textContent = 'Valider et analyser →';
  submitBtn.addEventListener('click', () => {
    state.freeText = textarea.value.trim();
    state.index++;
    updateProgress();
    renderActive();
  });

  actions.appendChild(skipBtn);
  actions.appendChild(submitBtn);

  qcard.appendChild(eyebrow);
  qcard.appendChild(h3);
  qcard.appendChild(sub);
  qcard.appendChild(textarea);
  qcard.appendChild(counter);
  qcard.appendChild(actions);
  area.appendChild(qcard);
}

// ─── Answer a question ────────────────────────────────────────────

function answer(q, optionIndex) {
  const opt = q.options[optionIndex];
  state.answers.push({
    id: q.id,
    optionIndex,
    category: q.category,
    qText: q.text,
    label: opt.label,
    status: opt.status,
    tip: opt.tip
  });
  state.index++;
  renderTranscript();
  updateProgress();
  updateReportRow(q.category);
  renderActive();
}

// ─── Submit to backend ────────────────────────────────────────────

async function submitAudit() {
  try {
    const payload = {
      profile: state.path,
      answers: state.answers.map(a => ({ id: a.id, optionIndex: a.optionIndex })),
      freeText: state.freeText || '',
      website: document.getElementById('hp-website')?.value || '',
    };

    const res = await fetch('/api/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.status === 429) {
      showSummaryError('Trop de tentatives. Veuillez réessayer dans quelques minutes.');
      return;
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      showSummaryError(err.error || 'Une erreur est survenue.');
      return;
    }

    const data = await res.json();
    state.auditId = data.id;

    // Update report panel with server-side results
    updateReportFromServer(data);

    // Show summary
    setTimeout(() => showSummary(data), 500);

  } catch (err) {
    console.error('Erreur soumission :', err);
    showSummaryError('Impossible de contacter le serveur. Vérifiez votre connexion.');
  }
}

// ─── Update report panel from server data ─────────────────────────

function updateReportFromServer(data) {
  const catOrder = QUESTIONS_CONFIG?.categoryOrder || CATEGORY_ORDER_DEFAULT;

  for (const key of catOrder) {
    const cat = data.categories[key];
    if (!cat) continue;

    const dot = document.getElementById('dot-' + key);
    const statusEl = document.getElementById('status-' + key);
    const tipEl = document.getElementById('tip-' + key);

    if (dot) {
      dot.classList.remove('waiting');
      dot.className = 'rr-dot ' + cat.status;
    }
    if (statusEl) {
      statusEl.className = 'rr-status ' + cat.status;
      statusEl.textContent = cat.statusLabel;
    }
    if (tipEl) {
      tipEl.innerHTML = '';
      for (const tip of cat.tips) {
        const div = document.createElement('div');
        const b = document.createElement('b');
        b.textContent = '→';
        div.appendChild(b);
        div.appendChild(document.createTextNode(' ' + tip));
        tipEl.appendChild(div);
      }
      tipEl.classList.add('show');
    }
  }
}

// ─── Show summary ─────────────────────────────────────────────────

function showSummary(data) {
  const area = document.getElementById('activeArea');
  area.innerHTML = '';

  const box = document.createElement('div');
  box.className = 'summary-box';

  const h3 = document.createElement('h3');
  h3.textContent = 'Votre bilan est prêt';

  const pSummary = document.createElement('p');
  pSummary.textContent = data.summary + ' Le détail par catégorie est dans le rapport, à droite.';

  // Chips
  const good = state.answers.filter(a => a.status === 'good').length;
  const warn = state.answers.filter(a => a.status === 'warn').length;
  const bad = state.answers.filter(a => a.status === 'bad').length;

  const chips = document.createElement('div');
  chips.className = 'summary-chips';

  const chipGood = document.createElement('span');
  chipGood.className = 'chip good';
  chipGood.textContent = `${good} solide${good > 1 ? 's' : ''}`;

  const chipWarn = document.createElement('span');
  chipWarn.className = 'chip warn';
  chipWarn.textContent = `${warn} à surveiller`;

  const chipBad = document.createElement('span');
  chipBad.className = 'chip bad';
  chipBad.textContent = `${bad} prioritaire${bad > 1 ? 's' : ''}`;

  chips.appendChild(chipGood);
  chips.appendChild(chipWarn);
  chips.appendChild(chipBad);

  box.appendChild(h3);
  box.appendChild(pSummary);
  box.appendChild(chips);

  // ── AI Insight (if available) — all via textContent, never innerHTML
  if (data.ai && data.ai.available) {
    const aiSection = document.createElement('div');
    aiSection.className = 'ai-insight';

    const aiTitle = document.createElement('div');
    aiTitle.className = 'ai-insight-title';
    aiTitle.textContent = '💡 Analyse personnalisée';

    const aiComment = document.createElement('p');
    aiComment.className = 'ai-insight-comment';
    aiComment.textContent = data.ai.commentaire;

    aiSection.appendChild(aiTitle);
    aiSection.appendChild(aiComment);

    if (data.ai.actionsSupplementaires && data.ai.actionsSupplementaires.length > 0) {
      const aiActions = document.createElement('ul');
      aiActions.className = 'ai-insight-actions';
      for (const action of data.ai.actionsSupplementaires) {
        const li = document.createElement('li');
        li.textContent = action;
        aiActions.appendChild(li);
      }
      aiSection.appendChild(aiActions);
    }

    box.appendChild(aiSection);
  }

  // Restart button
  const restartBtn = document.createElement('button');
  restartBtn.className = 'restart-btn';
  restartBtn.textContent = '↺ Recommencer avec un autre profil';
  restartBtn.addEventListener('click', () => {
    document.getElementById('stage').classList.remove('active');
    document.getElementById('intro').style.display = 'block';
    state = { path: null, questions: [], index: 0, answers: [], auditId: null };
  });
  box.appendChild(restartBtn);

  area.appendChild(box);

  // Show CTA for paid report
  document.getElementById('reportCta').classList.add('show');

  // CTA button handler
  const ctaBtn = document.getElementById('ctaBtn');
  ctaBtn.onclick = async () => {
    if (!state.auditId) return;
    ctaBtn.disabled = true;
    ctaBtn.textContent = 'Redirection…';

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auditId: state.auditId }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const confirm = document.getElementById('ctaConfirm');
        confirm.textContent = err.error || 'Erreur lors du paiement.';
        confirm.classList.add('show');
        ctaBtn.disabled = false;
        ctaBtn.textContent = 'Obtenir le rapport détaillé (PDF) →';
        return;
      }

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      ctaBtn.disabled = false;
      ctaBtn.textContent = 'Obtenir le rapport détaillé (PDF) →';
    }
  };
}

function showSummaryError(message) {
  const area = document.getElementById('activeArea');
  area.innerHTML = '';

  const box = document.createElement('div');
  box.className = 'summary-box';

  const h3 = document.createElement('h3');
  h3.textContent = 'Oups…';

  const p = document.createElement('p');
  p.textContent = message;

  const restartBtn = document.createElement('button');
  restartBtn.className = 'restart-btn';
  restartBtn.textContent = '↺ Recommencer';
  restartBtn.addEventListener('click', () => {
    document.getElementById('stage').classList.remove('active');
    document.getElementById('intro').style.display = 'block';
    state = { path: null, questions: [], index: 0, answers: [], auditId: null };
  });

  box.appendChild(h3);
  box.appendChild(p);
  box.appendChild(restartBtn);
  area.appendChild(box);
}

// ─── Report panel (real-time) ─────────────────────────────────────

function buildReportRows() {
  const el = document.getElementById('reportRows');
  el.innerHTML = '';
  const catOrder = QUESTIONS_CONFIG?.categoryOrder || CATEGORY_ORDER_DEFAULT;
  const categories = QUESTIONS_CONFIG?.categories || {};

  for (const key of catOrder) {
    const c = categories[key];
    if (!c) continue;

    const row = document.createElement('div');
    row.className = 'report-row';
    row.dataset.cat = key;
    row.innerHTML = `
      <div class="rr-head">
        <div class="rr-left"><div class="rr-dot waiting" id="dot-${key}"></div><div class="rr-label">${c.label}</div></div>
        <div class="rr-status" id="status-${key}">EN ATTENTE</div>
      </div>
      <div class="rr-tip" id="tip-${key}"></div>`;
    el.appendChild(row);
  }
}

function updateReportRow(category) {
  const catAnswers = state.answers.filter(a => a.category === category);
  if (catAnswers.length === 0) return;

  const worst = catAnswers.reduce((w, a) => {
    const rank = { bad: 2, warn: 1, good: 0 };
    return rank[a.status] > rank[w] ? a.status : w;
  }, 'good');

  const dot = document.getElementById('dot-' + category);
  const statusEl = document.getElementById('status-' + category);
  const tipEl = document.getElementById('tip-' + category);

  if (dot) {
    dot.classList.remove('waiting');
    dot.className = 'rr-dot ' + worst;
  }
  if (statusEl) {
    statusEl.className = 'rr-status ' + worst;
    statusEl.textContent = worst === 'good' ? 'BIEN' : (worst === 'warn' ? 'À SURVEILLER' : 'PRIORITAIRE');
  }
  if (tipEl) {
    // Build tips using textContent (defense in depth)
    tipEl.innerHTML = '';
    const tips = catAnswers.filter(a => a.tip);
    const categories = QUESTIONS_CONFIG?.categories || {};
    if (tips.length > 0) {
      for (const a of tips) {
        const div = document.createElement('div');
        const b = document.createElement('b');
        b.textContent = '→';
        div.appendChild(b);
        div.appendChild(document.createTextNode(' ' + a.tip));
        tipEl.appendChild(div);
      }
    } else if (categories[category]) {
      tipEl.textContent = categories[category].goodTip;
    }
    tipEl.classList.add('show');
  }
}
