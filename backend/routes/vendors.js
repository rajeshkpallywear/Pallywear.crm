const express = require('express');
const db = require('../db');
const { authenticateToken } = require('./auth');
const router = express.Router();

// ── GET /api/vendors ──────────────────────────────────────────────────
router.get('/', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM vendors ORDER BY name');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/vendors/purchase-orders ─────────────────────────────────
router.get('/purchase-orders', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM purchase_orders ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/vendors/purchase-orders ────────────────────────────────
router.post('/purchase-orders', authenticateToken, async (req, res) => {
  const { vendor, items, totalCost } = req.body;
  if (!vendor || !items || !totalCost)
    return res.status(400).json({ error: 'vendor, items, and totalCost are required' });

  const poId = `PO-${Math.floor(700 + Math.random() * 100)}${Date.now().toString().slice(-3)}`;
  const invoiceId = `INV-EXP-${Math.floor(10 + Math.random() * 89)}${Date.now().toString().slice(-3)}`;
  const today = new Date().toISOString().split('T')[0];

  try {
    await db.execute(
      'INSERT INTO purchase_orders (id, vendor, items, total_cost, status, po_date) VALUES (?, ?, ?, ?, "Sent", ?)',
      [poId, vendor, items, parseFloat(totalCost), today]
    );
    await db.execute(
      `INSERT INTO invoices (id, order_id, type, client, amount, status, description, invoice_date)
       VALUES (?, NULL, 'Expense', ?, ?, 'Pending', ?, ?)`,
      [invoiceId, vendor, parseFloat(totalCost), `PO: ${items}`, today]
    );
    await db.execute('INSERT INTO audit_logs (role, message) VALUES (?, ?)',
      ['Vendor', `Created PO ${poId} to ${vendor} for $${totalCost}`]);
    await db.execute('INSERT INTO audit_logs (role, message) VALUES (?, ?)',
      ['Account', `Pending expense invoice logged for PO ${poId}`]);

    const [rows] = await db.execute('SELECT * FROM purchase_orders WHERE id = ?', [poId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
