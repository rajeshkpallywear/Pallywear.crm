const express = require('express');
const db = require('../db');
const { authenticateToken } = require('./auth');
const router = express.Router();

// ── GET /api/leads ─────────────────────────────────────────────────────
router.get('/', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM leads ORDER BY id DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/leads ────────────────────────────────────────────────────
router.post('/', authenticateToken, async (req, res) => {
  const { name, email, phone, number, source, notes, companyName, gst, leadType, forecastedValue } = req.body;
  if (!name) return res.status(400).json({ error: 'Lead name is required' });

  const id = `LD-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  const resolvedNumber = number || phone || '';

  try {
    await db.execute(
      `INSERT INTO leads (id, name, number, companyName, gst, leadType, description, assignedTo, assignedToName, createdBy, createdByName, forecastedValue)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, name, resolvedNumber,
        companyName || '', gst || '',
        leadType || 'cold',
        notes || source || 'No notes.',
        req.user.id, req.user.name,
        req.user.id, req.user.name,
        forecastedValue || 0
      ]
    );

    try {
      await db.execute('INSERT INTO audit_logs (role, message) VALUES (?, ?)',
        ['Marketing', `New Lead Generated: ${name}`]);
    } catch (_) {}

    const [rows] = await db.execute('SELECT * FROM leads WHERE id = ?', [id]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('addLead error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/leads/:id ───────────────────────────────────────────────
router.patch('/:id', authenticateToken, async (req, res) => {
  const { status, isTaken } = req.body;
  try {
    if (isTaken !== undefined) {
      await db.execute('UPDATE leads SET isTaken = ? WHERE id = ?', [isTaken ? 1 : 0, req.params.id]);
    }
    const [rows] = await db.execute('SELECT * FROM leads WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
