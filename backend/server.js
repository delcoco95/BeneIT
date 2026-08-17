'use strict';

require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = parseInt(process.env.PORT, 10) || 3000;

// ─── Security headers ─────────────────────────────────────────────

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://js.stripe.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      connectSrc: ["'self'", "https://api.stripe.com"],
      frameSrc: ["https://js.stripe.com"],
      imgSrc: ["'self'", "data:"],
    },
  },
}));

// ─── CORS ──────────────────────────────────────────────────────────

const frontendUrl = process.env.FRONTEND_URL || `http://localhost:${PORT}`;
app.use(cors({
  origin: frontendUrl,
  methods: ['GET', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ─── Stripe webhook needs raw body (must be BEFORE json parser) ───

app.use('/api/webhook', express.raw({ type: 'application/json' }));

// ─── JSON body parser (for all other routes) ──────────────────────

app.use(express.json({ limit: '10kb' }));

// ─── Serve frontend static files ──────────────────────────────────

app.use(express.static(path.join(__dirname, '..', 'frontend')));

// ─── API Routes ───────────────────────────────────────────────────

app.use('/api/audit',    require('./routes/audit'));
app.use('/api/checkout', require('./routes/checkout'));
app.use('/api/webhook',  require('./routes/webhook'));
app.use('/api/report',   require('./routes/report'));
app.use('/api/admin',    require('./routes/admin'));

// ─── SPA fallback — serve index.html for unmatched routes ─────────

app.get('*', (req, res) => {
  // Only serve index.html for non-API routes
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Route introuvable.' });
  }
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// ─── Global error handler ─────────────────────────────────────────

app.use((err, req, res, _next) => {
  console.error('[server] Erreur non gérée :', err.message);
  res.status(500).json({ error: 'Erreur interne du serveur.' });
});

// ─── Start ────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n  🟢  BeneIT Audit — Serveur démarré sur http://localhost:${PORT}\n`);

  // Log configuration status
  const checks = [
    ['Stripe', !!process.env.STRIPE_SECRET_KEY],
    ['IA (Groq)', !!process.env.GROQ_API_KEY],
    ['Admin', !!process.env.ADMIN_TOKEN],
    ['SMTP', !!process.env.SMTP_HOST],
  ];
  for (const [name, ok] of checks) {
    console.log(`  ${ok ? '✓' : '✗'}  ${name} ${ok ? 'configuré' : 'non configuré (fonctionnement dégradé)'}`);
  }
  console.log('');
});
