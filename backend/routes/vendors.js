const express = require('express');
const db = require('../db');
const { authenticateToken } = require('./auth');
const router = express.Router();

// ── GET /api/vendors ──────────────────────────────────────────────────
router.get('/', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM vendors ORDER BY name');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/vendors/purchase-orders ─────────────────────────────────
router.get('/purchase-orders', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM purchase_orders ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/vendors/purchase-orders ────────────────────────────────
router.post('/purchase-orders', authenticateToken, async (req, res) => {
  const { vendor, items, totalCost } = req.body;
  if (!vendor || !items || !totalCost)
    return res.status(400).json({ error: 'vendor, items, and totalCost are required' });

  const poId = `PO-${Math.floor(700 + Math.random() * 100)}${Date.now().toString().slice(-3)}`;
  const invoiceId = `INV-EXP-${Math.floor(10 + Math.random() * 89)}${Date.now().toString().slice(-3)}`;
  const today = new Date().toISOString().split('T')[0];

  try {
    await db.execute(
      'INSERT INTO purchase_orders (id, vendor, items, total_cost, status, po_date) VALUES (?, ?, ?, ?, "Sent", ?)',
      [poId, vendor, items, parseFloat(totalCost), today]
    );
    await db.execute(
      `INSERT INTO invoices (id, order_id, type, client, amount, status, description, invoice_date)
       VALUES (?, NULL, 'Expense', ?, ?, 'Pending', ?, ?)`,
      [invoiceId, vendor, parseFloat(totalCost), `PO: ${items}`, today]
    );
    await db.execute('INSERT INTO audit_logs (role, message) VALUES (?, ?)',
      ['Vendor', `Created PO ${poId} to ${vendor} for $${totalCost}`]);
    await db.execute('INSERT INTO audit_logs (role, message) VALUES (?, ?)',
      ['Account', `Pending expense invoice logged for PO ${poId}`]);

    const [rows] = await db.execute('SELECT * FROM purchase_orders WHERE id = ?', [poId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/vendors ──────────────────────────────────────────────────
router.post('/', authenticateToken, async (req, res) => {
  const { name, category, rating, active_orders, material_price } = req.body;
  if (!name) return res.status(400).json({ error: 'Vendor name is required' });

  const id = `VND-${Math.floor(100 + Math.random() * 900)}`;

  try {
    await db.execute(
      `INSERT INTO vendors (id, name, category, rating, active_orders, material_price)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, name, category || '', parseFloat(rating) || 0.0, parseInt(active_orders) || 0, material_price || '']
    );

    try {
      await db.execute('INSERT INTO audit_logs (role, message) VALUES (?, ?)',
        ['Vendor', `Vendor ${name} (${id}) added by Admin.`]);
    } catch (_) {}

    const [[vendor]] = await db.execute('SELECT * FROM vendors WHERE id = ?', [id]);
    res.status(201).json(vendor);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/vendors/:id ───────────────────────────────────────────────
router.put('/:id', authenticateToken, async (req, res) => {
  const vendorId = req.params.id;
  const { name, category, rating, active_orders, material_price } = req.body;

  try {
    const [[vendor]] = await db.execute('SELECT * FROM vendors WHERE id = ?', [vendorId]);
    if (!vendor) return res.status(404).json({ error: 'Vendor not found' });

    await db.execute(
      `UPDATE vendors SET
        name = ?, category = ?, rating = ?, active_orders = ?, material_price = ?
       WHERE id = ?`,
      [
        name || vendor.name,
        category !== undefined ? category : vendor.category,
        rating !== undefined ? parseFloat(rating) : vendor.rating,
        active_orders !== undefined ? parseInt(active_orders) : vendor.active_orders,
        material_price !== undefined ? material_price : vendor.material_price,
        vendorId
      ]
    );

    try {
      await db.execute('INSERT INTO audit_logs (role, message) VALUES (?, ?)',
        ['Vendor', `Vendor ${vendorId} updated by Admin.`]);
    } catch (_) {}

    const [[updated]] = await db.execute('SELECT * FROM vendors WHERE id = ?', [vendorId]);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/vendors/:id ────────────────────────────────────────────
router.delete('/:id', authenticateToken, async (req, res) => {
  const vendorId = req.params.id;
  try {
    const [[vendor]] = await db.execute('SELECT * FROM vendors WHERE id = ?', [vendorId]);
    if (!vendor) return res.status(404).json({ error: 'Vendor not found' });

    await db.execute('DELETE FROM vendors WHERE id = ?', [vendorId]);

    try {
      await db.execute('INSERT INTO audit_logs (role, message) VALUES (?, ?)',
        ['Vendor', `Vendor ${vendor.name} (${vendorId}) deleted by Admin.`]);
    } catch (_) {}

    res.json({ message: 'Vendor deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/vendors/purchase-orders/:id ──────────────────────────────
router.put('/purchase-orders/:id', authenticateToken, async (req, res) => {
  const poId = req.params.id;
  const { vendor, items, total_cost, totalCost, status, po_date } = req.body;
  const resolvedCost = total_cost !== undefined ? total_cost : totalCost;

  try {
    const [[po]] = await db.execute('SELECT * FROM purchase_orders WHERE id = ?', [poId]);
    if (!po) return res.status(404).json({ error: 'Purchase Order not found' });

    await db.execute(
      `UPDATE purchase_orders SET
        vendor = ?, items = ?, total_cost = ?, status = ?, po_date = ?
       WHERE id = ?`,
      [
        vendor || po.vendor,
        items !== undefined ? items : po.items,
        resolvedCost !== undefined ? parseFloat(resolvedCost) : po.total_cost,
        status || po.status,
        po_date || po.po_date,
        poId
      ]
    );

    try {
      await db.execute('INSERT INTO audit_logs (role, message) VALUES (?, ?)',
        ['Vendor', `Purchase Order ${poId} updated by Admin.`]);
    } catch (_) {}

    const [[updated]] = await db.execute('SELECT * FROM purchase_orders WHERE id = ?', [poId]);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/vendors/purchase-orders/:id ───────────────────────────
router.delete('/purchase-orders/:id', authenticateToken, async (req, res) => {
  const poId = req.params.id;
  try {
    const [[po]] = await db.execute('SELECT * FROM purchase_orders WHERE id = ?', [poId]);
    if (!po) return res.status(404).json({ error: 'Purchase Order not found' });

    await db.execute('DELETE FROM purchase_orders WHERE id = ?', [poId]);

    try {
      await db.execute('INSERT INTO audit_logs (role, message) VALUES (?, ?)',
        ['Vendor', `Purchase Order ${poId} deleted by Admin.`]);
    } catch (_) {}

    res.json({ message: 'Purchase Order deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
