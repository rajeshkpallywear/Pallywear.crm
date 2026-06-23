const express = require('express');
const db = require('../db');
const { authenticateToken } = require('./auth');
const router = express.Router();

// ── GET /api/designs ───────────────────────────────────────────────────
router.get('/', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM designs ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/designs/:id/approve ─────────────────────────────────────
router.post('/:id/approve', authenticateToken, async (req, res) => {
  const designId = req.params.id;
  const today = new Date().toISOString().split('T')[0];

  try {
    // Approve design
    await db.execute("UPDATE designs SET status = 'Approved' WHERE id = ?", [designId]);
    const [[design]] = await db.execute('SELECT * FROM designs WHERE id = ?', [designId]);
    if (!design) return res.status(404).json({ error: 'Design not found' });

    // Advance order to Digitizing
    await db.execute("UPDATE orders SET status = 'Digitizing' WHERE id = ?", [design.order_id]);

    // Create digitizer queue entry
    const digId = `DIG-${Math.floor(400 + Math.random() * 100)}${Date.now().toString().slice(-3)}`;
    const filename = `${design.title.toLowerCase().replace(/ /g, '_')}_emb.dst`;
    await db.execute(
      `INSERT INTO digitizer_queue (id, order_id, filename, status, stitches, colors, format, assigned_to, task_date)
       VALUES (?, ?, ?, 'Queue', ?, ?, 'DST', 'Dave Miller', ?)`,
      [digId, design.order_id, filename,
       Math.floor(8000 + Math.random() * 10000),
       Math.floor(2 + Math.random() * 4), today]
    );

    await db.execute('INSERT INTO audit_logs (role, message) VALUES (?, ?)',
      ['Design', `Design ${designId} approved. Flowing to Digitizing.`]);
    await db.execute('INSERT INTO audit_logs (role, message) VALUES (?, ?)',
      ['Digitizer', `Added file task ${filename} to the work queue.`]);

    res.json({ message: 'Design approved', digTaskId: digId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/designs/:id/complete ───────────────────────────────────
router.post('/:id/complete', authenticateToken, async (req, res) => {
  const designId = req.params.id;
  const { completedImage } = req.body;
  if (!completedImage) return res.status(400).json({ error: 'completedImage is required' });

  try {
    await db.execute(
      "UPDATE designs SET completed_image = ?, status = 'Pending Review' WHERE id = ?",
      [completedImage, designId]
    );
    
    try {
      await db.execute('INSERT INTO audit_logs (role, message) VALUES (?, ?)',
        ['Design', `Designer completed artwork upload for design ticket ${designId}`]);
    } catch (_) {}

    res.json({ message: 'Completed design image uploaded successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/designs/:id/upload-zip ──────────────────────────────────
router.post('/:id/upload-zip', authenticateToken, async (req, res) => {
  const designId = req.params.id;
  const { originalDesignFile, originalDesignFilename } = req.body;
  if (!originalDesignFile) return res.status(400).json({ error: 'originalDesignFile is required' });

  try {
    await db.execute(
      "UPDATE designs SET original_design_file = ?, original_design_filename = ?, status = 'Awaiting Digitizing' WHERE id = ?",
      [originalDesignFile, originalDesignFilename || 'design.zip', designId]
    );

    const [[design]] = await db.execute('SELECT * FROM designs WHERE id = ?', [designId]);
    if (design && design.order_id) {
      await db.execute(
        "UPDATE orders SET original_design_file = ?, original_design_filename = ?, status = 'Digitizing' WHERE id = ?",
        [originalDesignFile, originalDesignFilename || 'design.zip', design.order_id]
      );
      
      const [[dig]] = await db.execute('SELECT * FROM digitizer_queue WHERE order_id = ?', [design.order_id]);
      if (!dig) {
        const digId = `DIG-${Math.floor(400 + Math.random() * 100)}${Date.now().toString().slice(-3)}`;
        const filename = `${design.title.toLowerCase().replace(/ /g, '_')}_emb.dst`;
        await db.execute(
          `INSERT INTO digitizer_queue (id, order_id, filename, status, task_date) VALUES (?, ?, ?, 'Queue', ?)`,
          [digId, design.order_id, filename, new Date().toISOString().split('T')[0]]
        );
      }
    }

    try {
      await db.execute('INSERT INTO audit_logs (role, message) VALUES (?, ?)',
        ['Design', `Design ticket ${designId} original ZIP file uploaded. Advanced to Digitizing.`]);
    } catch (_) {}

    res.json({ message: 'Original design ZIP file uploaded successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/designs/:id/hold ────────────────────────────────────────
router.post('/:id/hold', authenticateToken, async (req, res) => {
  const designId = req.params.id;
  const { isHold } = req.body;
  try {
    await db.execute("UPDATE designs SET is_hold = ? WHERE id = ?", [isHold ? 1 : 0, designId]);
    const [[design]] = await db.execute('SELECT * FROM designs WHERE id = ?', [designId]);
    if (design && design.order_id) {
      await db.execute("UPDATE orders SET is_hold = ? WHERE id = ?", [isHold ? 1 : 0, design.order_id]);
    }
    
    try {
      await db.execute('INSERT INTO audit_logs (role, message) VALUES (?, ?)',
        ['Design', `Design ticket ${designId} set hold to: ${isHold ? 'ON' : 'OFF'}`]);
    } catch (_) {}
    
    res.json({ message: `Design hold status updated to ${isHold ? 'ON' : 'OFF'}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
