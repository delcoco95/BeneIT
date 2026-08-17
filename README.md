# BeneIT Audit — Agent de diagnostic informatique

Outil de diagnostic informatique en ligne : un questionnaire interactif qui calcule un score de sécurité/performance, avec option de commentaire personnalisé par IA et rapport PDF payant via Stripe.

## Installation rapide

```bash
# 1. Clonez le dépôt et installez les dépendances
npm install

# 2. Copiez et configurez l'environnement
cp .env.example .env
# Éditez .env avec vos valeurs (voir ci-dessous)

# 3. Démarrez le serveur
npm run dev    # mode développement (rechargement auto)
npm start      # mode production
```

Le site est accessible sur `http://localhost:3000`.

## Configuration (.env)

| Variable | Requis | Description |
|----------|--------|-------------|
| `PORT` | Non | Port du serveur (défaut: 3000) |
| `FRONTEND_URL` | Non | URL publique du site (défaut: http://localhost:3000) |
| `STRIPE_SECRET_KEY` | Non* | Clé secrète Stripe |
| `STRIPE_WEBHOOK_SECRET` | Non* | Secret du webhook Stripe |
| `STRIPE_PRICE_ID` | Non* | ID du prix Stripe pour le rapport |
| `ADMIN_TOKEN` | Non | Token d'accès à /admin.html |
| `GROQ_API_KEY` | Non | Clé API Groq pour l'IA |
| `AI_PROVIDER` | Non | Provider IA (défaut: groq) |
| `AI_MODEL` | Non | Modèle IA (défaut: llama-3.3-70b-versatile) |
| `AI_TIMEOUT_MS` | Non | Timeout IA en ms (défaut: 8000) |
| `AI_DAILY_BUDGET` | Non | Limite d'appels IA par jour (défaut: 300) |

\* Le site fonctionne sans Stripe — le bouton "rapport détaillé" affiche un message approprié.

## IA & Sécurité

### Configuration Groq

1. Créez un compte gratuit sur [console.groq.com](https://console.groq.com)
2. Générez une clé API dans la section "API Keys"
3. Ajoutez-la dans `.env` : `GROQ_API_KEY=gsk_votre_cle`
4. Le modèle par défaut est `llama-3.3-70b-versatile` (gratuit). Changez-le via `AI_MODEL` si nécessaire.

### Comportement sans IA

Si `GROQ_API_KEY` n'est pas configurée, le site fonctionne normalement :
- Le score est toujours calculé (100% déterministe, pas d'IA)
- Le résumé par catégorie est toujours affiché
- Le champ texte libre apparaît mais le commentaire personnalisé est simplement omis
- Aucun message d'erreur n'est montré au visiteur

### Limites de sécurité appliquées

| Protection | Détail |
|------------|--------|
| **Rate limiting audit** | 30 requêtes/heure/IP |
| **Rate limiting IA** | 5 requêtes/heure/IP + 20/jour/IP |
| **Rate limiting checkout** | 10 requêtes/heure/IP |
| **Rate limiting admin** | 10 requêtes/15min/IP |
| **Budget IA global** | Configurable via `AI_DAILY_BUDGET` (défaut 300/jour) |
| **Timeout IA** | 8 secondes max (configurable) |
| **Validation entrée** | freeText ≤ 600 caractères (client + serveur) |
| **Honeypot** | Champ invisible anti-bot |
| **Anti prompt-injection** | Texte utilisateur délimité dans le prompt, sortie validée contre un schéma JSON strict |
| **Sortie IA validée** | commentaire ≤ 500 chars, max 5 actions, HTML/markdown retiré |
| **Affichage sécurisé** | Tout contenu IA affiché via `textContent`, jamais `innerHTML` |
| **Helmet** | Headers de sécurité HTTP (CSP, etc.) |
| **CORS** | Restreint au domaine configuré |

### Architecture IA

Le module `backend/lib/ai.js` est conçu pour brancher facilement un autre fournisseur (Mistral, Gemini, etc.) en ne modifiant que ce fichier. Le reste de l'application ne connaît que l'interface `generateInsight()`.

## Structure du projet

```
├── backend/
│   ├── server.js              # Point d'entrée Express
│   ├── lib/
│   │   ├── ai.js              # Intégration IA (Groq)
│   │   ├── auth.js            # Middleware admin token
│   │   ├── db.js              # Stockage JSON
│   │   ├── mailer.js          # Stub email (SMTP)
│   │   ├── pdf.js             # Génération rapport PDF
│   │   └── scoring.js         # Score déterministe /100
│   ├── middleware/
│   │   └── rateLimiters.js    # Rate limiting par route
│   ├── routes/
│   │   ├── admin.js           # API admin
│   │   ├── audit.js           # Soumission d'audit
│   │   ├── checkout.js        # Session Stripe
│   │   ├── report.js          # Téléchargement PDF
│   │   └── webhook.js         # Webhook Stripe
│   └── data/
│       ├── audits.json        # Données audits
│       └── reports/           # PDFs générés
├── config/
│   └── questions.json         # Questions du questionnaire
├── frontend/
│   ├── index.html             # Page principale
│   ├── confirmation.html      # Post-paiement
│   ├── admin.html             # Dashboard admin
│   ├── css/style.css
│   └── js/wizard.js           # Logique du questionnaire
├── package.json
├── .env.example
└── README.md
```

## Production

- Utilisez HTTPS (fourni par la plupart des hébergeurs : Render, Railway, Vercel, etc.)
- Configurez `FRONTEND_URL` avec votre domaine réel
- Changez `ADMIN_TOKEN` pour un token fort et unique
- Configurez le webhook Stripe vers `https://votre-domaine.com/api/webhook`
