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
    isUrgent, notes,
    attachedImage, attachedImageName
  } = req.body;

  // Support both old field names (from CRMContext) and new real schema fields
  const resolvedClientName = customerName || clientName || 'Unknown';
  const resolvedPhone = customerPhone || '';
  const resolvedItems = details || items || '';
  const resolvedTotal = totalAmount || totalVal || 0;
  const resolvedNotes = notes || resolvedItems;

  const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  const now = Date.now();

  try {
    await db.execute(
      `INSERT INTO orders (
        id, customerName, customerPhone, customerAddress, category,
        quantity, details, sizeBreakdown, totalAmount, advancePay,
        balanceAmount, gstAmount, discountAmount, shippingCharges,
        status, isUrgent, notes, createdAt, updatedAt,
        createdBy, createdByName, marketing_image, marketing_notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        orderId, resolvedClientName, resolvedPhone,
        address || '', category || 'General',
        quantity || 1, resolvedItems,
        sizeBreakdown || '', resolvedTotal,
        advancePay || 0, balanceAmount || resolvedTotal,
        gstAmount || 0, discountAmount || 0, shippingCharges || 0,
        'Design', isUrgent ? 1 : 0, resolvedNotes,
        now, now,
        req.user.id, req.user.name, attachedImage || null, resolvedNotes
      ]
    );

    // Automatically create a design record in the designs table
    const designId = `DSN-${Math.floor(300 + Math.random() * 100)}${Date.now().toString().slice(-3)}`;
    const today = new Date().toISOString().split('T')[0];
    await db.execute(
      `INSERT INTO designs (
        id, order_id, title, status, designer, notes, design_date,
        marketing_image, marketing_notes, marketing_staff_name
      ) VALUES (?, ?, ?, 'Pending Review', ?, ?, ?, ?, ?, ?)`,
      [
        designId, orderId, `${resolvedClientName} Branding Layout`,
        'Sarah Connor', resolvedNotes, today,
        attachedImage || null, resolvedNotes, req.user.name
      ]
    );

    try {
      await db.execute('INSERT INTO audit_logs (role, message) VALUES (?, ?)',
        ['Order Management', `New Order placed: ${orderId} for ${resolvedClientName}`]);
      await db.execute('INSERT INTO audit_logs (role, message) VALUES (?, ?)',
        ['Design', `Design ticket ${designId} automatically queued for Order ${orderId}`]);
    } catch (_) {}

    const [order] = await db.execute('SELECT * FROM orders WHERE id = ?', [orderId]);
    res.status(201).json(order[0]);
  } catch (err) {
    console.error('placeOrder error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/orders/:id/hold ─────────────────────────────────────────
router.post('/:id/hold', authenticateToken, async (req, res) => {
  const { isHold } = req.body;
  try {
    await db.execute("UPDATE orders SET is_hold = ? WHERE id = ?", [isHold ? 1 : 0, req.params.id]);
    await db.execute("UPDATE designs SET is_hold = ? WHERE order_id = ?", [isHold ? 1 : 0, req.params.id]);
    res.json({ message: `Order hold status updated to ${isHold ? 'ON' : 'OFF'}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/orders/:id/om-approve ───────────────────────────────────
router.post('/:id/om-approve', authenticateToken, async (req, res) => {
  try {
    await db.execute("UPDATE orders SET status = 'Production', updatedAt = ? WHERE id = ?", [Date.now(), req.params.id]);
    const [[order]] = await db.execute('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    
    const prdId = `PRD-${Math.floor(500 + Math.random() * 100)}${Date.now().toString().slice(-3)}`;
    const itemPart = order.details || order.items || 'Custom Blank Item';
    const qty = order.quantity || 100;
    await db.execute(
      `INSERT INTO production_queue (id, order_id, item, qty, machine, progress, status, production_date)
       VALUES (?, ?, ?, ?, 'Embroidery Machine A', 0, 'Queue', ?)`,
      [prdId, req.params.id, itemPart.substring(0, 150), qty, new Date().toISOString().split('T')[0]]
    );

    try {
      await db.execute('INSERT INTO audit_logs (role, message) VALUES (?, ?)',
        ['Order Management', `Order ${req.params.id} approved by OM. Routed to Production.`]);
    } catch (_) {}

    res.json({ message: 'Order approved to production' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/orders/:id/production-approve ───────────────────────────
router.post('/:id/production-approve', authenticateToken, async (req, res) => {
  try {
    await db.execute("UPDATE orders SET status = 'Delivery', updatedAt = ? WHERE id = ?", [Date.now(), req.params.id]);
    await db.execute("UPDATE production_queue SET status = 'Ready', progress = 100 WHERE order_id = ?", [req.params.id]);
    
    const [[order]] = await db.execute('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    const shipId = `SHP-${Math.floor(600 + Math.random() * 100)}${Date.now().toString().slice(-3)}`;
    const tracking = `TRK${Date.now().toString().slice(-4)}${Math.floor(10 + Math.random() * 89)}`;
    
    await db.execute(
      `INSERT INTO shipments (id, order_id, courier, tracking_no, status, destination, eta)
       VALUES (?, ?, 'BlueDart Express', ?, 'Picked Up', ?, ?)`,
      [shipId, req.params.id, tracking, order.customerAddress || 'Customer Address', new Date(Date.now() + 3*24*60*60*1000).toISOString().split('T')[0]]
    );

    try {
      await db.execute('INSERT INTO audit_logs (role, message) VALUES (?, ?)',
        ['Production', `Production completed for Order ${req.params.id}. Dispatched for Delivery.`]);
    } catch (_) {}

    res.json({ message: 'Production batch complete. Advanced to Delivery.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/orders/:id/delivery-complete ────────────────────────────
router.post('/:id/delivery-complete', authenticateToken, async (req, res) => {
  const { balanceNotes } = req.body;
  try {
    await db.execute(
      "UPDATE orders SET status = 'Completed', balance_received_notes = ?, updatedAt = ? WHERE id = ?",
      [balanceNotes || '', Date.now(), req.params.id]
    );
    await db.execute(
      "UPDATE shipments SET status = 'Delivered' WHERE order_id = ?",
      [req.params.id]
    );

    try {
      await db.execute('INSERT INTO audit_logs (role, message) VALUES (?, ?)',
        ['Delivery', `Order ${req.params.id} delivered and settled. Balance notes: ${balanceNotes || 'none'}`]);
    } catch (_) {}

    res.json({ message: 'Delivery completed successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/orders/:id ────────────────────────────────────────────────
router.put('/:id', authenticateToken, async (req, res) => {
  const orderId = req.params.id;
  const {
    clientName, customerPhone, customerAddress, category, quantity, details, sizeBreakdown,
    totalAmount, advancePay, balanceAmount, gstAmount, discountAmount, shippingCharges,
    status, isUrgent, notes, marketing_notes
  } = req.body;

  try {
    const [[order]] = await db.execute('SELECT * FROM orders WHERE id = ?', [orderId]);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    await db.execute(
      `UPDATE orders SET
        customerName = ?, customerPhone = ?, customerAddress = ?, category = ?,
        quantity = ?, details = ?, sizeBreakdown = ?, totalAmount = ?, advancePay = ?,
        balanceAmount = ?, gstAmount = ?, discountAmount = ?, shippingCharges = ?,
        status = ?, isUrgent = ?, notes = ?, marketing_notes = ?, updatedAt = ?
       WHERE id = ?`,
      [
        clientName || customerName || order.customerName,
        customerPhone !== undefined ? customerPhone : order.customerPhone,
        customerAddress !== undefined ? customerAddress : order.customerAddress,
        category || order.category,
        quantity !== undefined ? quantity : order.quantity,
        details !== undefined ? details : order.details,
        sizeBreakdown !== undefined ? sizeBreakdown : order.sizeBreakdown,
        totalAmount !== undefined ? totalAmount : order.totalAmount,
        advancePay !== undefined ? advancePay : order.advancePay,
        balanceAmount !== undefined ? balanceAmount : order.balanceAmount,
        gstAmount !== undefined ? gstAmount : order.gstAmount,
        discountAmount !== undefined ? discountAmount : order.discountAmount,
        shippingCharges !== undefined ? shippingCharges : order.shippingCharges,
        status || order.status,
        isUrgent !== undefined ? (isUrgent ? 1 : 0) : order.isUrgent,
        notes !== undefined ? notes : order.notes,
        marketing_notes !== undefined ? marketing_notes : order.marketing_notes,
        Date.now(),
        orderId
      ]
    );

    try {
      await db.execute('INSERT INTO audit_logs (role, message) VALUES (?, ?)',
        ['Order Management', `Order ${orderId} updated by Admin.`]);
    } catch (_) {}

    const [[updatedOrder]] = await db.execute('SELECT * FROM orders WHERE id = ?', [orderId]);
    res.json(updatedOrder);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/orders/:id ─────────────────────────────────────────────
router.delete('/:id', authenticateToken, async (req, res) => {
  const orderId = req.params.id;
  try {
    const [[order]] = await db.execute('SELECT * FROM orders WHERE id = ?', [orderId]);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    await db.execute('DELETE FROM orders WHERE id = ?', [orderId]);

    try {
      await db.execute('INSERT INTO audit_logs (role, message) VALUES (?, ?)',
        ['Order Management', `Order ${orderId} deleted by Admin.`]);
    } catch (_) {}

    res.json({ message: 'Order deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
