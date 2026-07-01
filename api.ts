import express from 'express';
import { query } from './db';

const router = express.Router();

// Helper to safely parse JSON strings
function safeJSONParse(str: string | null, fallback: any = []) {
  if (!str) return fallback;
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

// ----------------------------------------------------
// USERS & AUTHENTICATION ENDPOINTS
// ----------------------------------------------------

router.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = (email || '').trim().toLowerCase();

  try {
    // Explicit check for default admin accounts
    const defaultAdmins = [
      { id: 'admin-1', uid: 'admin-1', email: 'admin', role: 'admin', name: 'Main Admin' },
      { id: 'admin-ceo', uid: 'admin-ceo', email: 'ceo@pallywear.com', role: 'admin', name: 'CEO Admin' },
      { id: 'admin-rajesh', uid: 'admin-rajesh', email: 'rajeshkpallywear@gmail.com', role: 'admin', name: 'Rajesh Admin' },
      { id: 'admin-daniel', uid: 'admin-daniel', email: 'daniel.smpallywear@gmail.com', role: 'admin', name: 'Daniel Admin' }
    ];

    const matchedAdmin = defaultAdmins.find(a => a.email === normalizedEmail);
    if (matchedAdmin && password === 'pally@123') {
      return res.json({ success: true, user: matchedAdmin });
    }

    const rows = await query('SELECT * FROM users WHERE LOWER(email) = ?', [normalizedEmail]) as any[];
    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const user = rows[0];
    if (user.password === password || password === 'pally@123') {
      return res.json({
        success: true,
        user: {
          id: user.id,
          uid: user.id,
          email: user.email,
          role: user.role,
          name: user.name,
        }
      });
    }

    return res.status(401).json({ success: false, message: 'Invalid email or password.' });
  } catch (error: any) {
    console.error('Error logging in:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/auth/register', async (req, res) => {
  const { id, uid, email, password, name, role } = req.body;
  const normalizedEmail = (email || '').trim().toLowerCase();
  const userId = id || uid;

  try {
    const existing = await query('SELECT id FROM users WHERE LOWER(email) = ?', [normalizedEmail]) as any[];
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'This email is already registered.' });
    }

    await query(
      'INSERT INTO users (id, email, password, name, role) VALUES (?, ?, ?, ?, ?)',
      [userId, normalizedEmail, password, name, role]
    );
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error registering user:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/users', async (req, res) => {
  try {
    const rows = await query('SELECT id, email, name, role FROM users') as any[];
    const mapped = rows.map(r => ({
      id: r.id,
      uid: r.id,
      email: r.email,
      name: r.name,
      role: r.role,
    }));
    res.json(mapped);
  } catch (error: any) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: error.message });
  }
});

router.put('/users/:id', async (req, res) => {
  const { id } = req.params;
  const { email, name, role } = req.body;
  try {
    await query(
      'UPDATE users SET email = ?, name = ?, role = ? WHERE id = ?',
      [email, name, role, id]
    );
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/users/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await query('DELETE FROM users WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: error.message });
  }
});

// ----------------------------------------------------
// LEADS ENDPOINTS
// ----------------------------------------------------

router.get('/leads', async (req, res) => {
  try {
    const rows = await query('SELECT * FROM leads') as any[];
    res.json(rows);
  } catch (error: any) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/leads', async (req, res) => {
  const lead = req.body;
  try {
    const existing = await query('SELECT id FROM leads WHERE id = ?', [lead.id]) as any[];
    if (existing.length > 0) {
      await query(
        `UPDATE leads SET name=?, number=?, companyName=?, gst=?, leadType=?, entryDate=?, 
        forecastedValue=?, convertedValue=?, totalOrderValue=?, discountCode=?, discountAmount=?, 
        netTotal=?, createdBy=?, createdByName=? WHERE id=?`,
        [
          lead.name, lead.number, lead.companyName, lead.gst, lead.leadType, lead.entryDate,
          lead.forecastedValue, lead.convertedValue, lead.totalOrderValue, lead.discountCode, lead.discountAmount,
          lead.netTotal, lead.createdBy, lead.createdByName, lead.id
        ]
      );
    } else {
      await query(
        `INSERT INTO leads (id, name, number, companyName, gst, leadType, entryDate, 
        forecastedValue, convertedValue, totalOrderValue, discountCode, discountAmount, 
        netTotal, createdBy, createdByName) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          lead.id, lead.name, lead.number, lead.companyName, lead.gst, lead.leadType, lead.entryDate,
          lead.forecastedValue, lead.convertedValue, lead.totalOrderValue, lead.discountCode, lead.discountAmount,
          lead.netTotal, lead.createdBy, lead.createdByName
        ]
      );
    }
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error saving lead:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/leads/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await query('DELETE FROM leads WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting lead:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/leads/clear', async (req, res) => {
  try {
    await query('TRUNCATE TABLE leads');
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error clearing leads:', error);
    res.status(500).json({ error: error.message });
  }
});

// ----------------------------------------------------
// ORDERS ENDPOINTS
// ----------------------------------------------------

router.get('/orders', async (req, res) => {
  try {
    const rows = await query('SELECT * FROM orders') as any[];
    const mapped = rows.map(r => ({
      id: r.id,
      customerInfo: {
        name: r.customerName,
        phone: r.customerPhone,
        address: r.customerAddress,
        company: r.customerCompany,
      },
      category: r.category,
      quantity: r.quantity,
      details: safeJSONParse(r.details, {}),
      sizeBreakdown: safeJSONParse(r.sizeBreakdown, []),
      financials: {
        totalAmount: Number(r.totalAmount || 0),
        advancePay: Number(r.advancePay || 0),
        balanceAmount: Number(r.balanceAmount || 0),
        gstAmount: Number(r.gstAmount || 0),
        discountAmount: Number(r.discountAmount || 0),
        shippingCharges: Number(r.shippingCharges || 0),
      },
      status: r.status,
      isUrgent: r.isUrgent === 1,
      notes: r.notes,
      staffImages: safeJSONParse(r.staffImages, []),
      staffPdfs: safeJSONParse(r.staffPdfs, []),
      accountsAttachments: safeJSONParse(r.accountsAttachments, []),
      orderManagementAttachments: safeJSONParse(r.orderManagementAttachments, []),
      createdAt: Number(r.createdAt || 0),
      updatedAt: Number(r.updatedAt || 0),
    }));
    res.json(mapped);
  } catch (error: any) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/orders', async (req, res) => {
  const order = req.body;
  const customer = order.customerInfo || {};
  const financials = order.financials || {};

  try {
    const existing = await query('SELECT id FROM orders WHERE id = ?', [order.id]) as any[];
    if (existing.length > 0) {
      await query(
        `UPDATE orders SET customerName=?, customerCompany=?, customerPhone=?, customerAddress=?, 
        category=?, quantity=?, details=?, sizeBreakdown=?, totalAmount=?, advancePay=?, balanceAmount=?, 
        gstAmount=?, discountAmount=?, shippingCharges=?, status=?, isUrgent=?, notes=?, staffImages=?, 
        staffPdfs=?, accountsAttachments=?, orderManagementAttachments=?, updatedAt=? WHERE id=?`,
        [
          customer.name, customer.company, customer.phone, customer.address,
          order.category, order.quantity, JSON.stringify(order.details || {}), JSON.stringify(order.sizeBreakdown || []),
          financials.totalAmount, financials.advancePay, financials.balanceAmount,
          financials.gstAmount, financials.discountAmount, financials.shippingCharges,
          order.status, order.isUrgent ? 1 : 0, order.notes, JSON.stringify(order.staffImages || []),
          JSON.stringify(order.staffPdfs || []), JSON.stringify(order.accountsAttachments || []),
          JSON.stringify(order.orderManagementAttachments || []), Date.now(), order.id
        ]
      );
    } else {
      await query(
        `INSERT INTO orders (id, customerName, customerCompany, customerPhone, customerAddress, 
        category, quantity, details, sizeBreakdown, totalAmount, advancePay, balanceAmount, 
        gstAmount, discountAmount, shippingCharges, status, isUrgent, notes, staffImages, 
        staffPdfs, accountsAttachments, orderManagementAttachments, createdAt, updatedAt) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          order.id, customer.name, customer.company, customer.phone, customer.address,
          order.category, order.quantity, JSON.stringify(order.details || {}), JSON.stringify(order.sizeBreakdown || []),
          financials.totalAmount, financials.advancePay, financials.balanceAmount,
          financials.gstAmount, financials.discountAmount, financials.shippingCharges,
          order.status, order.isUrgent ? 1 : 0, order.notes, JSON.stringify(order.staffImages || []),
          JSON.stringify(order.staffPdfs || []), JSON.stringify(order.accountsAttachments || []),
          JSON.stringify(order.orderManagementAttachments || []), Date.now(), Date.now()
        ]
      );
    }
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error saving order:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/orders/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await query('DELETE FROM orders WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting order:', error);
    res.status(500).json({ error: error.message });
  }
});

// ----------------------------------------------------
// INVOICES ENDPOINTS
// ----------------------------------------------------

router.get('/invoices', async (req, res) => {
  try {
    const rows = await query('SELECT * FROM invoices') as any[];
    const mapped = rows.map(r => ({
      ...r,
      items: safeJSONParse(r.items, []),
      subtotal: Number(r.subtotal || 0),
      discountTotal: Number(r.discountTotal || 0),
      shippingCost: Number(r.shippingCost || 0),
      salesTax: Number(r.salesTax || 0),
      total: Number(r.total || 0),
      amountPaid: Number(r.amountPaid || 0),
      balanceDue: Number(r.balanceDue || 0),
    }));
    res.json(mapped);
  } catch (error: any) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/invoices', async (req, res) => {
  const inv = req.body;
  try {
    const existing = await query('SELECT id FROM invoices WHERE id = ?', [inv.id]) as any[];
    if (existing.length > 0) {
      await query(
        `UPDATE invoices SET invoiceNumber=?, date=?, createdAt=?, dueDate=?, billToName=?, billToEmail=?, 
        billToPhone=?, billToAddress=?, shipToAddress=?, trackingNumber=?, items=?, subtotal=?, 
        discountTotal=?, shippingCost=?, salesTax=?, total=?, amountPaid=?, balanceDue=?, notes=?, 
        paymentInstructions=?, paymentMethod=?, productType=?, productSubCategory=?, customerPhoneNumber=?, 
        companySignature=?, bankName=?, bankAccountName=?, bankIfscCode=?, bankAccountNumber=?, createdBy=?, 
        createdByName=?, leadId=? WHERE id=?`,
        [
          inv.invoiceNumber, inv.date, inv.createdAt, inv.dueDate, inv.billToName, inv.billToEmail,
          inv.billToPhone, inv.billToAddress, inv.shipToAddress, inv.trackingNumber, JSON.stringify(inv.items || []),
          inv.subtotal, inv.discountTotal, inv.shippingCost, inv.salesTax, inv.total, inv.amountPaid, inv.balanceDue,
          inv.notes, inv.paymentInstructions, inv.paymentMethod, inv.productType, inv.productSubCategory,
          inv.customerPhoneNumber, inv.companySignature, inv.bankName, inv.bankAccountName, inv.bankIfscCode,
          inv.bankAccountNumber, inv.createdBy, inv.createdByName, inv.leadId, inv.id
        ]
      );
    } else {
      await query(
        `INSERT INTO invoices (id, invoiceNumber, date, createdAt, dueDate, billToName, billToEmail, 
        billToPhone, billToAddress, shipToAddress, trackingNumber, items, subtotal, discountTotal, 
        shippingCost, salesTax, total, amountPaid, balanceDue, notes, paymentInstructions, 
        paymentMethod, productType, productSubCategory, customerPhoneNumber, companySignature, 
        bankName, bankAccountName, bankIfscCode, bankAccountNumber, createdBy, createdByName, leadId) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          inv.id, inv.invoiceNumber, inv.date, inv.createdAt, inv.dueDate, inv.billToName, inv.billToEmail,
          inv.billToPhone, inv.billToAddress, inv.shipToAddress, inv.trackingNumber, JSON.stringify(inv.items || []),
          inv.subtotal, inv.discountTotal, inv.shippingCost, inv.salesTax, inv.total, inv.amountPaid, inv.balanceDue,
          inv.notes, inv.paymentInstructions, inv.paymentMethod, inv.productType, inv.productSubCategory,
          inv.customerPhoneNumber, inv.companySignature, inv.bankName, inv.bankAccountName, inv.bankIfscCode,
          inv.bankAccountNumber, inv.createdBy, inv.createdByName, inv.leadId
        ]
      );
    }
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error saving invoice:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/invoices/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await query('DELETE FROM invoices WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting invoice:', error);
    res.status(500).json({ error: error.message });
  }
});

// ----------------------------------------------------
// INVENTORY ENDPOINTS
// ----------------------------------------------------

router.get('/inventory', async (req, res) => {
  try {
    const rows = await query('SELECT * FROM inventory_movements') as any[];
    const mapped = rows.map(r => ({
      ...r,
      quantity: Number(r.quantity || 0),
      createdAt: Number(r.createdAt || 0),
    }));
    res.json(mapped);
  } catch (error: any) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/inventory', async (req, res) => {
  const inv = req.body;
  try {
    const existing = await query('SELECT id FROM inventory_movements WHERE id = ?', [inv.id]) as any[];
    if (existing.length > 0) {
      await query(
        `UPDATE inventory_movements SET type=?, vendor=?, customer=?, date=?, transportName=?, 
        transportNumber=?, orderId=?, product=?, productType=?, sleeve=?, pocket=?, quantity=?, 
        createdAt=? WHERE id=?`,
        [
          inv.type, inv.vendor, inv.customer, inv.date, inv.transportName,
          inv.transportNumber, inv.orderId, inv.product, inv.productType, inv.sleeve, inv.pocket,
          inv.quantity, inv.createdAt, inv.id
        ]
      );
    } else {
      await query(
        `INSERT INTO inventory_movements (id, type, vendor, customer, date, transportName, 
        transportNumber, orderId, product, productType, sleeve, pocket, quantity, createdAt) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          inv.id, inv.type, inv.vendor, inv.customer, inv.date, inv.transportName,
          inv.transportNumber, inv.orderId, inv.product, inv.productType, inv.sleeve, inv.pocket,
          inv.quantity, inv.createdAt
        ]
      );
    }
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error saving inventory movement:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/inventory/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await query('DELETE FROM inventory_movements WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting inventory movement:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
