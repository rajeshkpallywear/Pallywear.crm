const express = require('express');
const db = require('../db');
const { authenticateToken } = require('./auth');
const router = express.Router();

// ── GET /api/shipments ────────────────────────────────────────────────
router.get('/', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM shipments ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/shipments/:trackingNo/status ───────────────────────────
router.patch('/:trackingNo/status', authenticateToken, async (req, res) => {
  const { status } = req.body;
  const { trackingNo } = req.params;

  try {
    await db.execute('UPDATE shipments SET status = ? WHERE tracking_no = ?', [status, trackingNo]);
    const [[shipment]] = await db.execute('SELECT * FROM shipments WHERE tracking_no = ?', [trackingNo]);
    if (!shipment) return res.status(404).json({ error: 'Shipment not found' });

    await db.execute('INSERT INTO audit_logs (role, message) VALUES (?, ?)',
      ['Delivery', `Shipment status for ${trackingNo} updated to: ${status}`]);

    if (status === 'Delivered') {
      // Complete the order
      await db.execute("UPDATE orders SET status = 'Completed' WHERE id = ?", [shipment.order_id]);
      // Auto-pay the invoice
      await db.execute("UPDATE invoices SET status = 'Paid' WHERE order_id = ?", [shipment.order_id]);
      await db.execute('INSERT INTO audit_logs (role, message) VALUES (?, ?)',
        ['System', `Order ${shipment.order_id} successfully completed and invoice paid.`]);
    }

    res.json(shipment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
