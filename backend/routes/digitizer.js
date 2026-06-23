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
  const { digitizerFile, digitizerFilename } = req.body;
  if (!digitizerFile) return res.status(400).json({ error: 'digitizerFile is required' });

  try {
    await db.execute("UPDATE digitizer_queue SET status = 'Completed' WHERE id = ?", [digId]);
    const [[task]] = await db.execute('SELECT * FROM digitizer_queue WHERE id = ?', [digId]);
    if (!task) return res.status(404).json({ error: 'Digitizer task not found' });

    await db.execute(
      "UPDATE orders SET status = 'Order Management', digitizer_file = ?, digitizer_filename = ? WHERE id = ?",
      [digitizerFile, digitizerFilename || 'digitized.zip', task.order_id]
    );

    try {
      await db.execute('INSERT INTO audit_logs (role, message) VALUES (?, ?)',
        ['Digitizer', `Digitizing complete for task ${task.filename}. Saved ZIP and advanced to Order Management.`]);
    } catch (_) {}

    res.json({ message: 'Digitizing completed. Sent to Order Management.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
