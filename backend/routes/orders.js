const express = require('express');
const db = require('../db');
const { authenticateToken } = require('./auth');
const router = express.Router();

// ── GET /api/orders ────────────────────────────────────────────────────
router.get('/', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM orders ORDER BY createdAt DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/orders ───────────────────────────────────────────────────
router.post('/', authenticateToken, async (req, res) => {
  const {
    clientName, customerPhone, customerEmail, items,
    totalVal, priority, address, hubDetails,
    customerName, customerCompany, category, quantity,
    details, sizeBreakdown, totalAmount, advancePay,
    balanceAmount, gstAmount, discountAmount, shippingCharges,
    isUrgent, notes
  } = req.body;

  // Support both old field names (from CRMContext) and new real schema fields
  const resolvedClientName = customerName || clientName || 'Unknown';
  const resolvedPhone = customerPhone || '';
  const resolvedItems = details || items || '';
  const resolvedTotal = totalAmount || totalVal || 0;

  const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  const now = Date.now();

  try {
    await db.execute(
      `INSERT INTO orders (
        id, customerName, customerPhone, customerAddress, category,
        quantity, details, sizeBreakdown, totalAmount, advancePay,
        balanceAmount, gstAmount, discountAmount, shippingCharges,
        status, isUrgent, notes, createdAt, updatedAt,
        createdBy, createdByName
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        orderId, resolvedClientName, resolvedPhone,
        address || '', category || 'General',
        quantity || 1, resolvedItems,
        sizeBreakdown || '', resolvedTotal,
        advancePay || 0, balanceAmount || resolvedTotal,
        gstAmount || 0, discountAmount || 0, shippingCharges || 0,
        'Design', isUrgent ? 1 : 0, notes || '',
        now, now,
        req.user.id, req.user.name
      ]
    );

    try {
      await db.execute('INSERT INTO audit_logs (role, message) VALUES (?, ?)',
        ['Order Management', `New Order placed: ${orderId} for ${resolvedClientName}`]);
    } catch (_) {}

    const [order] = await db.execute('SELECT * FROM orders WHERE id = ?', [orderId]);
    res.status(201).json(order[0]);
  } catch (err) {
    console.error('placeOrder error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/orders/:id ──────────────────────────────────────────────
router.patch('/:id', authenticateToken, async (req, res) => {
  const { status } = req.body;
  try {
    await db.execute(
      'UPDATE orders SET status = ?, updatedAt = ? WHERE id = ?',
      [status, Date.now(), req.params.id]
    );
    const [rows] = await db.execute('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
