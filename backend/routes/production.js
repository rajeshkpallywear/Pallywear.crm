const express = require('express');
const db = require('../db');
const { authenticateToken } = require('./auth');
const router = express.Router();

// ── GET /api/production ───────────────────────────────────────────────
router.get('/', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM production_queue ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/production/:id/complete ─────────────────────────────────
router.post('/:id/complete', authenticateToken, async (req, res) => {
  const prdId = req.params.id;
  const today = new Date().toISOString().split('T')[0];
  const eta = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  try {
    await db.execute("UPDATE production_queue SET progress = 100, status = 'Ready' WHERE id = ?", [prdId]);
    const [[batch]] = await db.execute('SELECT * FROM production_queue WHERE id = ?', [prdId]);
    if (!batch) return res.status(404).json({ error: 'Production batch not found' });

    const [[order]] = await db.execute('SELECT * FROM orders WHERE id = ?', [batch.order_id]);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    // Advance order to Delivery
    await db.execute("UPDATE orders SET status = 'Delivery' WHERE id = ?", [batch.order_id]);

    // Create shipment
    const shpId = `SHP-${Math.floor(600 + Math.random() * 100)}${Date.now().toString().slice(-3)}`;
    const couriers = ['DHL Express', 'FedEx Ground', 'UPS Air'];
    const trackingNo = `TRK${Math.floor(100000000 + Math.random() * 900000000)}`;

    await db.execute(
      `INSERT INTO shipments (id, order_id, courier, tracking_no, status, destination, eta)
       VALUES (?, ?, ?, ?, 'Picked Up', ?, ?)`,
      [shpId, batch.order_id,
       couriers[Math.floor(Math.random() * 3)],
       trackingNo,
       `${Math.floor(100 + Math.random() * 800)} Commerce Ave, Dallas TX`,
       eta]
    );

    await db.execute('INSERT INTO audit_logs (role, message) VALUES (?, ?)',
      ['Production', `Batch ${prdId} finished manufacturing. Packaged for delivery.`]);
    await db.execute('INSERT INTO audit_logs (role, message) VALUES (?, ?)',
      ['Delivery', `Shipment ${shpId} picked up by courier.`]);

    res.json({ message: 'Production complete', shipmentId: shpId, trackingNo });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
