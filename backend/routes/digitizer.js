const express = require('express');
const db = require('../db');
const { authenticateToken } = require('./auth');
const router = express.Router();

// ── GET /api/digitizer ─────────────────────────────────────────────────
router.get('/', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM digitizer_queue ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/digitizer/:id/complete ──────────────────────────────────
router.post('/:id/complete', authenticateToken, async (req, res) => {
  const digId = req.params.id;
  const today = new Date().toISOString().split('T')[0];

  try {
    await db.execute("UPDATE digitizer_queue SET status = 'Completed' WHERE id = ?", [digId]);
    const [[task]] = await db.execute('SELECT * FROM digitizer_queue WHERE id = ?', [digId]);
    if (!task) return res.status(404).json({ error: 'Digitizer task not found' });

    const [[order]] = await db.execute('SELECT * FROM orders WHERE id = ?', [task.order_id]);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    // Advance order to Production
    await db.execute("UPDATE orders SET status = 'Production' WHERE id = ?", [task.order_id]);

    // Create production batch
    const prdId = `PRD-${Math.floor(500 + Math.random() * 100)}${Date.now().toString().slice(-3)}`;
    const itemPart = order.items.split(' x')[0];
    const qtyMatch = order.items.match(/\d+$/);
    const qty = qtyMatch ? parseInt(qtyMatch[0]) : 50;
    const machines = ['Embroidery Machine A', 'Embroidery Machine B', 'Printing Stand C'];

    await db.execute(
      `INSERT INTO production_queue (id, order_id, item, qty, machine, progress, status, production_date)
       VALUES (?, ?, ?, ?, ?, 0, 'Queue', ?)`,
      [prdId, task.order_id, itemPart, qty, machines[Math.floor(Math.random() * 3)], today]
    );

    await db.execute('INSERT INTO audit_logs (role, message) VALUES (?, ?)',
      ['Digitizer', `Digitizing complete for file ${task.filename}. Released to production.`]);
    await db.execute('INSERT INTO audit_logs (role, message) VALUES (?, ?)',
      ['Production', `Production batch ${prdId} added to machine list.`]);

    res.json({ message: 'Digitizing completed', productionId: prdId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
