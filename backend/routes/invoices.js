const express = require('express');
const db = require('../db');
const { authenticateToken } = require('./auth');
const router = express.Router();

// ── GET /api/invoices ─────────────────────────────────────────────────
router.get('/', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM invoices ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/invoices ────────────────────────────────────────────────
router.post('/', authenticateToken, async (req, res) => {
  const { orderId, type, client, amount, status, description } = req.body;
  if (!client || !amount) return res.status(400).json({ error: 'client and amount are required' });

  const id = `INV-${Math.floor(800 + Math.random() * 100)}${Date.now().toString().slice(-3)}`;
  const today = new Date().toISOString().split('T')[0];

  try {
    await db.execute(
      `INSERT INTO invoices (id, order_id, type, client, amount, status, description, invoice_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, orderId || null, type || 'Revenue', client, parseFloat(amount),
       status || 'Pending', description || '', today]
    );
    await db.execute('INSERT INTO audit_logs (role, message) VALUES (?, ?)',
      ['Account', `Manual Invoice created for ${client} ($${amount})`]);
    const [rows] = await db.execute('SELECT * FROM invoices WHERE id = ?', [id]);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/invoices/:id/pay ────────────────────────────────────────
router.patch('/:id/pay', authenticateToken, async (req, res) => {
  const invoiceId = req.params.id;
  try {
    await db.execute("UPDATE invoices SET status = 'Paid' WHERE id = ?", [invoiceId]);
    const [[invoice]] = await db.execute('SELECT * FROM invoices WHERE id = ?', [invoiceId]);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    await db.execute('INSERT INTO audit_logs (role, message) VALUES (?, ?)',
      ['Account', `Settled payment for Invoice ${invoiceId} ($${invoice.amount})`]);

    if (invoice.type === 'Expense') {
      await db.execute(
        "UPDATE purchase_orders SET status = 'Received' WHERE vendor = ? AND status = 'Sent'",
        [invoice.client]
      );
    }
    res.json(invoice);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
