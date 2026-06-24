require('dotenv').config(); // 🛠️ 'Require' என்பது சிறிய எழுத்தாக மாற்றப்பட்டது
const express = require('express');
const cors = require('cors');
const path = require('path');
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
    const allowed = [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'https://pallywear.in',
      'https://www.pallywear.in'
    ];
    if (!origin || allowed.includes(origin)) {
      return callback(null, true);
    }
    return callback(null, true); // Production-ல் அலோவ் செய்ய 
  },
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

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

// ── 404 JSON handler for unmatched /api/* routes ───────────────────────
// Must come BEFORE the static/SPA fallback so API routes never return index.html
app.use('/api', (req, res) => {
  res.status(404).json({ error: `API route not found: ${req.method} ${req.originalUrl}` });
});

// ── Static files + React SPA (AFTER all API routes) ───────────────────
// express.static is placed here so it never intercepts /api/* requests
app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Global Error Handler ───────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Start Server ───────────────────────────────────────────────────────
// GoDaddy Cloud / PaaS-க்குத் தேவையான process.env.PORT-ஐ முதன்மையாக மாற்றி அமைத்துள்ளேன் 
const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`\n🚀 Pallywear CRM API running on port ${port}`);
});