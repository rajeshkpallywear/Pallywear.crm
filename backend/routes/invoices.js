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
  const { orderId, type, client, amount, status, description, invoiceFile, invoiceFileName } = req.body;
  if (!client || !amount) return res.status(400).json({ error: 'client and amount are required' });

  const id = `INV-${Math.floor(800 + Math.random() * 100)}${Date.now().toString().slice(-3)}`;
  const today = new Date().toISOString().split('T')[0];

  try {
    await db.execute(
      `INSERT INTO invoices (id, order_id, type, client, amount, status, description, invoice_date, invoice_file, invoice_file_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, orderId || null, type || 'Revenue', client, parseFloat(amount),
       status || 'Pending', description || '', today, invoiceFile || null, invoiceFileName || null]
    );

    if (orderId) {
      await db.execute(
        `UPDATE orders SET invoice_file = ?, invoice_file_name = ? WHERE id = ?`,
        [invoiceFile || null, invoiceFileName || null, orderId]
      );
    }

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
    } else if (invoice.type === 'Revenue' && invoice.order_id) {
      await db.execute(
        "UPDATE orders SET status = 'Awaiting Design ZIP' WHERE id = ?",
        [invoice.order_id]
      );
      await db.execute(
        "UPDATE designs SET status = 'Awaiting Design ZIP' WHERE order_id = ?",
        [invoice.order_id]
      );
      try {
        await db.execute('INSERT INTO audit_logs (role, message) VALUES (?, ?)',
          ['Account', `Order ${invoice.order_id} advanced to Awaiting Design ZIP after payment approval.`]);
      } catch (_) {}
    }
    res.json(invoice);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/invoices/:id ──────────────────────────────────────────────
router.put('/:id', authenticateToken, async (req, res) => {
  const invoiceId = req.params.id;
  const { order_id, type, client, amount, status, description } = req.body;

  try {
    const [[invoice]] = await db.execute('SELECT * FROM invoices WHERE id = ?', [invoiceId]);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    await db.execute(
      `UPDATE invoices SET
        order_id = ?, type = ?, client = ?, amount = ?, status = ?, description = ?
       WHERE id = ?`,
      [
        order_id !== undefined ? order_id : invoice.order_id,
        type || invoice.type,
        client || invoice.client,
        amount !== undefined ? parseFloat(amount) : invoice.amount,
        status || invoice.status,
        description !== undefined ? description : invoice.description,
        invoiceId
      ]
    );

    try {
      await db.execute('INSERT INTO audit_logs (role, message) VALUES (?, ?)',
        ['Account', `Invoice ${invoiceId} updated by Admin.`]);
    } catch (_) {}

    const [[updated]] = await db.execute('SELECT * FROM invoices WHERE id = ?', [invoiceId]);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/invoices/:id ───────────────────────────────────────────
router.delete('/:id', authenticateToken, async (req, res) => {
  const invoiceId = req.params.id;
  try {
    const [[invoice]] = await db.execute('SELECT * FROM invoices WHERE id = ?', [invoiceId]);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    await db.execute('DELETE FROM invoices WHERE id = ?', [invoiceId]);

    try {
      await db.execute('INSERT INTO audit_logs (role, message) VALUES (?, ?)',
        ['Account', `Invoice ${invoiceId} deleted by Admin.`]);
    } catch (_) {}

    res.json({ message: 'Invoice deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
