const CATEGORIES = {
  securite:     { label: 'Sécurité',            goodTip: 'Les bases sont là — c\'est ce qu\'on veut voir.' },
  sauvegarde:   { label: 'Sauvegarde',          goodTip: 'Vos données sont protégées, c\'est le plus important.' },
  acces:        { label: 'Comptes & accès',     goodTip: 'Vos accès sont sous contrôle.' },
  performance:  { label: 'Performance & maintenance', goodTip: 'Rien à signaler de ce côté.' }
};
const CATEGORY_ORDER = ['securite','sauvegarde','acces','performance'];

const QUESTIONS = {
  particulier: [
    { id:'maj', category:'performance', text:'Votre ordinateur reçoit-il les mises à jour Windows régulièrement ?',
      options:[
        {label:'Oui, automatiquement', status:'good'},
        {label:'Je ne sais pas / je repousse toujours', status:'warn', tip:'Activez les mises à jour automatiques dans les paramètres Windows — beaucoup de failles de sécurité sont corrigées par ce simple geste.'},
        {label:'Non, jamais', status:'bad', tip:'Un système jamais mis à jour accumule des failles connues et exploitées. C\'est la première chose à corriger, avant tout le reste.'}
      ]},
    { id:'av', category:'securite', text:'Avez-vous un antivirus actif et à jour sur cet ordinateur ?',
      options:[
        {label:'Oui', status:'good'},
        {label:'Je ne sais pas', status:'warn', tip:'Vérifiez dans "Sécurité Windows" que la protection en temps réel est active — c\'est gratuit et déjà intégré à Windows.'},
        {label:'Non', status:'bad', tip:'Sans protection active, un simple lien cliqué par erreur peut suffire à compromettre vos comptes. À activer en priorité.'}
      ]},
    { id:'mdp', category:'securite', text:'Utilisez-vous le même mot de passe sur plusieurs comptes importants (email, banque…) ?',
      options:[
        {label:'Non, tous différents', status:'good'},
        {label:'Certains sont réutilisés', status:'warn', tip:'Priorisez au moins l\'email et la banque avec des mots de passe uniques — c\'est par l\'email qu\'on peut réinitialiser tout le reste.'},
        {label:'Oui, souvent le même', status:'bad', tip:'Si un seul site est piraté, tous vos comptes avec ce mot de passe deviennent vulnérables. Un gestionnaire de mots de passe résout ce problème en une fois.'}
      ]},
    { id:'sauv', category:'sauvegarde', text:'Vos photos et documents importants sont-ils sauvegardés ailleurs que sur ce PC (cloud, disque externe) ?',
      options:[
        {label:'Oui, automatiquement', status:'good'},
        {label:'Oui, de temps en temps', status:'warn', tip:'Une sauvegarde manuelle occasionnelle laisse une fenêtre de perte possible. Une sauvegarde automatique règle ça définitivement.'},
        {label:'Non', status:'bad', tip:'En cas de panne ou de vol, tout serait perdu d\'un coup. C\'est le point le plus urgent à corriger, et l\'un des plus simples.'}
      ]},
    { id:'lent', category:'performance', text:'Votre ordinateur est-il lent ou plante-t-il souvent ?',
      options:[
        {label:'Jamais, ou rarement', status:'good'},
        {label:'Parfois', status:'warn', tip:'Souvent lié à un disque presque plein ou trop de logiciels lancés au démarrage — un nettoyage ciblé suffit généralement.'},
        {label:'Souvent', status:'bad', tip:'Des lenteurs fréquentes peuvent aussi être un signe d\'infection ou de disque en fin de vie — mieux vaut un diagnostic avant que ça empire.'}
      ]},
    { id:'phish', category:'securite', text:'Vous arrive-t-il de cliquer sur un lien ou une pièce jointe sans être sûr de l\'expéditeur ?',
      options:[
        {label:'Jamais', status:'good'},
        {label:'Rarement', status:'warn', tip:'Un simple réflexe : survoler le lien avant de cliquer, et vérifier l\'adresse exacte de l\'expéditeur.'},
        {label:'Ça m\'arrive', status:'bad', tip:'C\'est la porte d\'entrée n°1 des arnaques et virus. Quelques réflexes simples suffisent à réduire ce risque très fortement.'}
      ]},
    { id:'acc3', category:'acces', text:'Savez-vous précisément quelles applications ont accès à votre compte Google ou Microsoft ?',
      options:[
        {label:'Oui, je vérifie de temps en temps', status:'good'},
        {label:'Pas vraiment', status:'warn', tip:'Un tour dans les paramètres de sécurité de votre compte permet de voir — et retirer — les accès inutiles ou oubliés.'},
        {label:'Aucune idée', status:'bad', tip:'Des applications oubliées, parfois anciennes, peuvent garder un accès à vos données sans que vous vous en souveniez. Ça se vérifie en quelques minutes.'}
      ]}
  ],
  pme: [
    { id:'mfa', category:'securite', text:'L\'authentification à plusieurs facteurs (MFA) est-elle activée sur vos comptes professionnels (email, Microsoft 365…) ?',
      options:[
        {label:'Oui, pour tout le monde', status:'good'},
        {label:'Oui, pour certains', status:'warn', tip:'Généralisez le MFA à toute l\'équipe — c\'est la mesure la plus efficace contre le vol de compte, et elle se déploie en quelques heures.'},
        {label:'Non, ou je ne sais pas', status:'bad', tip:'Sans MFA, un mot de passe volé suffit à un attaquant pour entrer. C\'est souvent la première chose corrigée dans un bilan.'}
      ]},
    { id:'offb', category:'acces', text:'Quand quelqu\'un quitte l\'entreprise, son compte est-il désactivé le jour même ?',
      options:[
        {label:'Toujours', status:'good'},
        {label:'Parfois, ou avec retard', status:'warn', tip:'Une petite procédure écrite (qui fait quoi, dans quel ordre) suffit à fiabiliser ça, même sans outil supplémentaire.'},
        {label:'On n\'a pas de procédure', status:'bad', tip:'Des comptes d\'anciens collaborateurs encore actifs sont un risque réel et fréquent — c\'est un des points les plus souvent trouvés lors d\'un bilan.'}
      ]},
    { id:'sauvp', category:'sauvegarde', text:'Vos données professionnelles sont-elles sauvegardées, et cette sauvegarde a-t-elle déjà été testée par une vraie restauration ?',
      options:[
        {label:'Oui, sauvegardée et testée', status:'good'},
        {label:'Sauvegardée, mais jamais testée', status:'warn', tip:'Une sauvegarde jamais restaurée est une hypothèse, pas une certitude. Un test (sur une copie, sans risque) permet de la vérifier vraiment.'},
        {label:'Je ne suis pas sûr(e) qu\'il y en ait une', status:'bad', tip:'Selon l\'ANSSI, près d\'une TPE/PME sur deux victime d\'un rançongiciel n\'avait pas de sauvegarde fiable. C\'est le point le plus critique à clarifier rapidement.'}
      ]},
    { id:'doc', category:'acces', text:'Existe-t-il un document à jour qui liste qui a accès à quoi (dossiers, applications, droits administrateur) ?',
      options:[
        {label:'Oui, à jour', status:'good'},
        {label:'Ça existe, mais c\'est daté', status:'warn', tip:'Une mise à jour ponctuelle suffit souvent — l\'essentiel est d\'avoir un point de départ fiable.'},
        {label:'Non', status:'bad', tip:'Sans cette vue d\'ensemble, il est difficile de savoir qui pourrait accéder à des données sensibles. C\'est un livrable simple et rapide à produire.'}
      ]},
    { id:'sensib', category:'securite', text:'Vos employés ont-ils déjà reçu une sensibilisation, même courte, aux emails frauduleux (phishing) ?',
      options:[
        {label:'Oui', status:'good'},
        {label:'Il y a longtemps', status:'warn', tip:'Une piqûre de rappel courte, une fois par an, suffit à maintenir les bons réflexes dans l\'équipe.'},
        {label:'Jamais', status:'bad', tip:'L\'humain reste la porte d\'entrée la plus fréquente. Une sensibilisation d\'une heure réduit concrètement le risque.'}
      ]},
    { id:'inv', category:'performance', text:'Avez-vous un inventaire à jour de vos postes et logiciels installés ?',
      options:[
        {label:'Oui', status:'good'},
        {label:'Partiellement', status:'warn', tip:'Un inventaire même simple (un tableau) aide énormément le jour où il faut réagir vite (panne, remplacement, audit).'},
        {label:'Non', status:'bad', tip:'Sans inventaire, chaque intervention repart de zéro. C\'est un des premiers livrables utiles d\'un bilan complet.'}
      ]}
  ]
};

let state = { path:null, questions:[], index:0, answers:[] };

document.querySelectorAll('.path-btn').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    const path = btn.dataset.path;
    state = { path, questions: QUESTIONS[path], index:0, answers:[] };
    document.getElementById('intro').style.display = 'none';
    document.getElementById('stage').classList.add('active');
    buildReportRows();
    renderTranscript();
    renderActive();
    updateProgress();
  });
});

function updateProgress(){
  const total = state.questions.length;
  const done = Math.min(state.index, total);
  document.getElementById('progressFill').style.width = (done/total*100)+'%';
  document.getElementById('progressLabel').textContent = done+'/'+total;
}

function renderTranscript(){
  const el = document.getElementById('transcript');
  el.innerHTML = state.answers.map(a=>{
    const cls = a.status;
    const mark = a.status==='good' ? '✓' : (a.status==='warn' ? '!' : '×');
    return `<div class="t-line"><div class="t-dot ${cls}">${mark}</div><div class="t-text"><span class="q">${a.qText}</span><span class="a">${a.label}</span></div></div>`;
  }).join('');
  el.scrollTop = el.scrollHeight;
}

function renderActive(){
  const area = document.getElementById('activeArea');
  if(state.index < state.questions.length){
    const q = state.questions[state.index];
    area.innerHTML = `
      <div class="qcard">
        <div class="qcard-eyebrow">Question ${state.index+1} / ${state.questions.length}</div>
        <h3>${q.text}</h3>
        <div class="options">
          ${q.options.map((o,i)=>`<button class="opt-btn" data-i="${i}">${o.label}</button>`).join('')}
        </div>
      </div>`;
    area.querySelectorAll('.opt-btn').forEach(b=>{
      b.addEventListener('click', ()=>answer(q, parseInt(b.dataset.i)));
    });
  } else {
    area.innerHTML = `<div class="thinking"><span class="think-dot"></span><span class="think-dot"></span><span class="think-dot"></span>&nbsp;Analyse de vos réponses…</div>`;
    setTimeout(showSummary, 700);
  }
}

function answer(q, i){
  const opt = q.options[i];
  state.answers.push({ id:q.id, category:q.category, qText:q.text, label:opt.label, status:opt.status, tip:opt.tip });
  state.index++;
  renderTranscript();
  updateProgress();
  updateReportRow(q.category);
  renderActive();
}

function buildReportRows(){
  const el = document.getElementById('reportRows');
  el.innerHTML = CATEGORY_ORDER.map(key=>{
    const c = CATEGORIES[key];
    return `
      <div class="report-row" data-cat="${key}">
        <div class="rr-head">
          <div class="rr-left"><div class="rr-dot waiting" id="dot-${key}"></div><div class="rr-label">${c.label}</div></div>
          <div class="rr-status" id="status-${key}">EN ATTENTE</div>
        </div>
        <div class="rr-tip" id="tip-${key}"></div>
      </div>`;
  }).join('');
}

function updateReportRow(category){
  const catAnswers = state.answers.filter(a=>a.category===category);
  if(catAnswers.length===0) return;
  const worst = catAnswers.reduce((w,a)=>{
    const rank = { bad:2, warn:1, good:0 };
    return rank[a.status] > rank[w] ? a.status : w;
  }, 'good');
  const dot = document.getElementById('dot-'+category);
  const statusEl = document.getElementById('status-'+category);
  const tipEl = document.getElementById('tip-'+category);
  dot.classList.remove('waiting');
  dot.className = 'rr-dot ' + worst;
  statusEl.className = 'rr-status ' + worst;
  statusEl.textContent = worst==='good' ? 'BIEN' : (worst==='warn' ? 'À SURVEILLER' : 'PRIORITAIRE');

  const tips = catAnswers.filter(a=>a.tip).map(a=>`<div><b>→</b> ${a.tip}</div>`).join('');
  tipEl.innerHTML = tips || CATEGORIES[category].goodTip;
  tipEl.classList.add('show');
}

function showSummary(){
  const good = state.answers.filter(a=>a.status==='good').length;
  const warn = state.answers.filter(a=>a.status==='warn').length;
  const bad = state.answers.filter(a=>a.status==='bad').length;

  let headline;
  if(bad>=2) headline = 'Plusieurs points méritent une attention rapide.';
  else if(bad===1) headline = 'Un point mérite une attention rapide — le reste est globalement sain.';
  else if(warn>=2) headline = 'Rien d\'alarmant, mais quelques points méritent d\'être vérifiés.';
  else headline = 'Bonne nouvelle : l\'essentiel est déjà bien maîtrisé.';

  const area = document.getElementById('activeArea');
  area.innerHTML = `
    <div class="summary-box">
      <h3>Votre bilan est prêt</h3>
      <p>${headline} Le détail par catégorie est dans le rapport, à droite.</p>
      <div class="summary-chips">
        <span class="chip good">${good} solide${good>1?'s':''}</span>
        <span class="chip warn">${warn} à surveiller</span>
        <span class="chip bad">${bad} prioritaire${bad>1?'s':''}</span>
      </div>
      <button class="restart-btn" id="restartBtn">↺ Recommencer avec un autre profil</button>
    </div>`;
  document.getElementById('restartBtn').addEventListener('click', ()=>{
    document.getElementById('stage').classList.remove('active');
    document.getElementById('intro').style.display = 'block';
  });
  document.getElementById('reportCta').classList.add('show');
}

document.getElementById('ctaBtn').addEventListener('click', ()=>{
  document.getElementById('ctaConfirm').classList.add('show');
});
