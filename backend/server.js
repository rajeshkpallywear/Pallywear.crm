require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path'); // static files கையாள்வதற்காக புதிதாகச் சேர்க்கப்பட்டுள்ளது
const db = require('./db');

// ── Route imports ──────────────────────────────────────────────────────
const { router: authRouter } = require('./routes/auth');
const leadsRouter = require('./routes/leads');
const ordersRouter = require('./routes/orders');
const designsRouter = require('./routes/designs');
const digitizerRouter = require('./routes/digitizer');
const productionRouter = require('./routes/production');
const shipmentsRouter = require('./routes/shipments');
const invoicesRouter = require('./routes/invoices');
const vendorsRouter = require('./routes/vendors');
const callsRouter = require('./routes/calls');
const auditLogsRouter = require('./routes/auditLogs');

const app = express();

// ── Middleware ─────────────────────────────────────────────────────────
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, curl)
    // and all known Pallywear origins including localhost dev
    const allowed = [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'https://pallywear.in',
      'https://www.pallywear.in'
    ];
    if (!origin || allowed.includes(origin)) return callback(null, true);
    callback(null, true); // allow all in production — API is auth-protected via JWT
  },
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 🔥 1. பிரண்ட்-எண்ட் பில்ட் ஃபைல்களை (React Dist/Public) எக்ஸ்பிரஸ் சர்வரில் இணைத்தல்
// உங்களுடைய Vite பில்ட் ஃபைல்களை cPanel-ல் 'public' என்ற ஃபோல்டரில் போட்டிருந்தால் 'public' என்றே வைக்கவும்
app.use(express.static(path.join(__dirname, 'public')));

// ── Health check ───────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'Pallywear CRM API',
    timestamp: new Date().toISOString()
  });
});

app.get('/test-db', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT NOW() AS time');
    res.json({
      success: true,
      message: 'Database Connected Successfully',
      data: rows
    });
  } catch (err) {
    res.status(500).json(err);
  }
});

app.get('/users', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM users');
    res.json(rows);
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});

// ── API Routes ─────────────────────────────────────────────────────────
app.use('/api/auth', authRouter);
app.use('/api/leads', leadsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/designs', designsRouter);
app.use('/api/digitizer', digitizerRouter);
app.use('/api/production', productionRouter);
app.use('/api/shipments', shipmentsRouter);
app.use('/api/invoices', invoicesRouter);
app.use('/api/vendors', vendorsRouter);
app.use('/api/calls', callsRouter);
app.use('/api/audit-logs', auditLogsRouter);

// 🔥 2. ரியாக்ட் ரவுட்டிங் ஹேண்ட்லர் (React SPA Routing Fix)
// API அல்லாத மற்ற அனைத்து ரெக்வஸ்டுகளுக்கும் index.html ஃபைலையே அனுப்ப வேண்டும்
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Global Error Handler ───────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Start Server ───────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 Pallywear CRM API running on http://localhost:${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/api/health\n`);
});