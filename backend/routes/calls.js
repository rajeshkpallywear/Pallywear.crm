const express = require('express');
const db = require('../db');
const { authenticateToken } = require('./auth');
const router = express.Router();

// ── GET /api/calls ────────────────────────────────────────────────────
router.get('/', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM calls ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/calls ────────────────────────────────────────────────────
router.post('/', authenticateToken, async (req, res) => {
  const { callerName, leadId, outcome, notes } = req.body;
  if (!callerName || !leadId || !outcome)
    return res.status(400).json({ error: 'callerName, leadId, outcome are required' });

  const callId = `CL-${Math.floor(100 + Math.random() * 900)}${Date.now().toString().slice(-3)}`;
  const today = new Date().toISOString().split('T')[0];
  const now = new Date().toTimeString().split(' ')[0];

  try {
    const [[lead]] = await db.execute('SELECT * FROM leads WHERE id = ?', [leadId]);
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    // Update lead status
    let updatedStatus = 'Dialed';
    if (outcome === 'Connected') updatedStatus = 'Connected';
    if (outcome === 'Converted') updatedStatus = 'Converted';
    await db.execute('UPDATE leads SET status = ? WHERE id = ?', [updatedStatus, leadId]);

    // Insert call log
    await db.execute(
      `INSERT INTO calls (id, caller, lead_id, lead_name, outcome, notes, call_time, call_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [callId, callerName, leadId, lead.name, outcome, notes || '', now, today]
    );

    await db.execute('INSERT INTO audit_logs (role, message) VALUES (?, ?)',
      ['Telecaller', `Logged call outcome "${outcome}" for ${lead.name}`]);

    // Auto-convert: place order if outcome is Converted
    if (outcome === 'Converted') {
      const items = (lead.notes || '').toLowerCase().includes('polo')
        ? 'Custom Polo Shirts x150' : 'Premium Staff Uniforms x100';
      const totalVal = (lead.notes || '').toLowerCase().includes('polo') ? 2250 : 1800;
      const orderId = `ORD-${Math.floor(900 + Math.random() * 100)}${Date.now().toString().slice(-3)}`;
      const designId = `DSN-${Math.floor(300 + Math.random() * 100)}${Date.now().toString().slice(-3)}`;
      const invoiceId = `INV-${Math.floor(800 + Math.random() * 100)}${Date.now().toString().slice(-3)}`;

      await db.execute(
        `INSERT INTO orders (id, client_name, customer_phone, customer_email, items, total_val, status, priority, order_date, design_id)
         VALUES (?, ?, ?, ?, ?, ?, 'Design', 'Medium', ?, ?)`,
        [orderId, lead.name, lead.phone || '', lead.email || '', items, totalVal, today, designId]
      );
      await db.execute(
        `INSERT INTO designs (id, order_id, title, status, designer, notes, design_date) VALUES (?, ?, ?, 'Pending Review', ?, ?, ?)`,
        [designId, orderId, `${lead.name} Branding Layout`,
         ['Alex Mercer', 'Sarah Connor'][Math.floor(Math.random() * 2)],
         `Design outline for items: ${items}.`, today]
      );
      await db.execute(
        `INSERT INTO invoices (id, order_id, type, client, amount, status, description, invoice_date) VALUES (?, ?, 'Revenue', ?, ?, 'Pending', ?, ?)`,
        [invoiceId, orderId, lead.name, totalVal, items, today]
      );
      await db.execute('INSERT INTO audit_logs (role, message) VALUES (?, ?)',
        ['Order Management', `Auto-order ${orderId} created from converted lead: ${lead.name}`]);
    }

    const [rows] = await db.execute('SELECT * FROM calls WHERE id = ?', [callId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
