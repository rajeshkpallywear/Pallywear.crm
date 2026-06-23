require('dotenv').config();
const express = require('express');
const cors = require('cors');
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
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
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

// ── Routes ─────────────────────────────────────────────────────────────
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

// ── 404 Handler ────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
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
