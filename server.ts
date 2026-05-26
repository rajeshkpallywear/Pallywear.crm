import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { pool, testConnection } from "./src/db.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Parse incoming JSON request bodies (essential for post/put requests)
  app.use(express.json());

  // Test database connection on server startup
  await testConnection();

  // Define API Routes (MUST run before Vite middleware & static serving)

  // 1. Users endpoints
  app.get('/api/users', async (req, res) => {
    try {
      const [rows]: any = await pool.query('SELECT * FROM users ORDER BY name ASC');
      res.json(rows);
    } catch (error) {
      console.error("Failed to query users:", error);
      res.status(500).json({ error: 'Database query failed' });
    }
  });

  app.post('/api/users', async (req, res) => {
    try {
      const { id, email, role, name, avatar, createdAt } = req.body;
      if (!id || !email || !role || !name) {
        return res.status(400).json({ error: 'Missing required user fields' });
      }
      await pool.query(
        'INSERT INTO users (id, email, role, name, avatar, createdAt) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE email = ?, role = ?, name = ?, avatar = ?, createdAt = ?',
        [id, email, role, name, avatar || null, createdAt || new Date().toISOString(), email, role, name, avatar || null, createdAt || new Date().toISOString()]
      );
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to save user:", error);
      res.status(500).json({ error: 'Database write failed' });
    }
  });

  app.delete('/api/users/:id', async (req, res) => {
    try {
      await pool.query('DELETE FROM users WHERE id = ?', [req.params.id]);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete user:", error);
      res.status(500).json({ error: 'Database deletion failed' });
    }
  });

  // 2. Settings endpoints (e.g. registration state)
  app.get('/api/settings/:id', async (req, res) => {
    try {
      const [rows]: any = await pool.query('SELECT value FROM settings WHERE id = ?', [req.params.id]);
      if (rows.length > 0) {
        const val = typeof rows[0].value === 'string' ? JSON.parse(rows[0].value) : rows[0].value;
        res.json(val);
      } else {
        res.json({});
      }
    } catch (error) {
      console.error("Failed to get settings:", error);
      res.status(500).json({ error: 'Database query failed' });
    }
  });

  app.post('/api/settings/:id', async (req, res) => {
    try {
      const valueStr = JSON.stringify(req.body);
      await pool.query(
        'INSERT INTO settings (id, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = ?',
        [req.params.id, valueStr, valueStr]
      );
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to save settings:", error);
      res.status(500).json({ error: 'Database write failed' });
    }
  });

  // 3. Leads endpoints
  app.get('/api/leads', async (req, res) => {
    try {
      const [rows]: any = await pool.query('SELECT * FROM leads ORDER BY entryDate DESC');
      res.json(rows);
    } catch (error) {
      console.error("Failed to fetch leads:", error);
      res.status(500).json({ error: 'Database query failed' });
    }
  });

  app.post('/api/leads', async (req, res) => {
    try {
      const lead = req.body;
      const keys = Object.keys(lead);
      const values = Object.values(lead);
      const placeholders = keys.map(() => '?').join(', ');
      await pool.query(
        `INSERT INTO leads (${keys.join(', ')}) VALUES (${placeholders})`,
        values
      );
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to create lead:", error);
      res.status(500).json({ error: 'Database insert failed' });
    }
  });

  app.put('/api/leads/:id', async (req, res) => {
    try {
      const fields = req.body;
      const keys = Object.keys(fields);
      if (keys.length === 0) return res.json({ success: true });
      const setClause = keys.map(k => `${k} = ?`).join(', ');
      const values = [...Object.values(fields), req.params.id];
      await pool.query(`UPDATE leads SET ${setClause} WHERE id = ?`, values);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to update lead:", error);
      res.status(500).json({ error: 'Database update failed' });
    }
  });

  app.delete('/api/leads/:id', async (req, res) => {
    try {
      await pool.query('DELETE FROM leads WHERE id = ?', [req.params.id]);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete lead:", error);
      res.status(500).json({ error: 'Database delete failed' });
    }
  });

  // 4. Invoices endpoints
  app.get('/api/invoices', async (req, res) => {
    try {
      const [rows]: any = await pool.query('SELECT * FROM invoices ORDER BY createdAt DESC');
      const parsed = rows.map((row: any) => {
        const items = typeof row.items === 'string' ? JSON.parse(row.items) : row.items;
        return { ...row, items };
      });
      res.json(parsed);
    } catch (error) {
      console.error("Failed to fetch invoices:", error);
      res.status(500).json({ error: 'Database query failed' });
    }
  });

  app.post('/api/invoices', async (req, res) => {
    try {
      const data = { ...req.body };
      if (data.items) {
        data.items = JSON.stringify(data.items);
      }
      const keys = Object.keys(data);
      const values = Object.values(data);
      const placeholders = keys.map(() => '?').join(', ');
      await pool.query(
        `INSERT INTO invoices (${keys.join(', ')}) VALUES (${placeholders})`,
        values
      );
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to create invoice:", error);
      res.status(500).json({ error: 'Database insert failed' });
    }
  });

  app.put('/api/invoices/:id', async (req, res) => {
    try {
      const data = { ...req.body };
      if (data.items) {
        data.items = JSON.stringify(data.items);
      }
      const keys = Object.keys(data);
      if (keys.length === 0) return res.json({ success: true });
      const setClause = keys.map(k => `${k} = ?`).join(', ');
      const values = [...Object.values(data), req.params.id];
      await pool.query(`UPDATE invoices SET ${setClause} WHERE id = ?`, values);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to update invoice:", error);
      res.status(500).json({ error: 'Database update failed' });
    }
  });

  app.delete('/api/invoices/:id', async (req, res) => {
    try {
      await pool.query('DELETE FROM invoices WHERE id = ?', [req.params.id]);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete invoice:", error);
      res.status(500).json({ error: 'Database delete failed' });
    }
  });

  // 5. Orders endpoints
  app.get('/api/orders', async (req, res) => {
    try {
      const [rows]: any = await pool.query('SELECT * FROM orders ORDER BY createdAt DESC');
      const parsed = rows.map((row: any) => {
        return {
          ...row,
          customerInfo: typeof row.customerInfo === 'string' ? JSON.parse(row.customerInfo) : row.customerInfo,
          details: typeof row.details === 'string' ? JSON.parse(row.details) : row.details,
          sizeBreakdown: typeof row.sizeBreakdown === 'string' ? JSON.parse(row.sizeBreakdown) : row.sizeBreakdown,
          financials: typeof row.financials === 'string' ? JSON.parse(row.financials) : row.financials,
          staffImages: typeof row.staffImages === 'string' ? JSON.parse(row.staffImages) : row.staffImages,
          staffPdfs: typeof row.staffPdfs === 'string' ? JSON.parse(row.staffPdfs) : row.staffPdfs,
          staffAttachments: row.staffAttachments ? (typeof row.staffAttachments === 'string' ? JSON.parse(row.staffAttachments) : row.staffAttachments) : [],
          accountsAttachments: typeof row.accountsAttachments === 'string' ? JSON.parse(row.accountsAttachments) : row.accountsAttachments,
          orderManagementAttachments: typeof row.orderManagementAttachments === 'string' ? JSON.parse(row.orderManagementAttachments) : row.orderManagementAttachments,
          designAttachments: row.designAttachments ? (typeof row.designAttachments === 'string' ? JSON.parse(row.designAttachments) : row.designAttachments) : [],
          machineFiles: row.machineFiles ? (typeof row.machineFiles === 'string' ? JSON.parse(row.machineFiles) : row.machineFiles) : [],
          isUrgent: !!row.isUrgent
        };
      });
      res.json(parsed);
    } catch (error) {
      console.error("Failed to fetch orders:", error);
      res.status(500).json({ error: 'Database query failed' });
    }
  });

  app.post('/api/orders', async (req, res) => {
    try {
      const o = { ...req.body };
      // Serialize JSON properties
      const jsonFields = [
        'customerInfo', 'details', 'sizeBreakdown', 'financials',
        'staffImages', 'staffPdfs', 'staffAttachments', 'accountsAttachments',
        'orderManagementAttachments', 'designAttachments', 'machineFiles'
      ];
      jsonFields.forEach(field => {
        if (o[field] !== undefined) {
          o[field] = JSON.stringify(o[field]);
        } else {
          o[field] = JSON.stringify([]);
        }
      });
      if (o.customerInfo === undefined || o.customerInfo === '[]') o.customerInfo = JSON.stringify({});
      if (o.details === undefined || o.details === '[]') o.details = JSON.stringify({});
      if (o.financials === undefined || o.financials === '[]') o.financials = JSON.stringify({});

      const keys = Object.keys(o);
      const values = Object.values(o);
      const placeholders = keys.map(() => '?').join(', ');
      await pool.query(
        `INSERT INTO orders (${keys.join(', ')}) VALUES (${placeholders})`,
        values
      );
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to create order:", error);
      res.status(500).json({ error: 'Database insert failed' });
    }
  });

  app.put('/api/orders/:id', async (req, res) => {
    try {
      const o = { ...req.body };
      // Serialize JSON properties
      const jsonFields = [
        'customerInfo', 'details', 'sizeBreakdown', 'financials',
        'staffImages', 'staffPdfs', 'staffAttachments', 'accountsAttachments',
        'orderManagementAttachments', 'designAttachments', 'machineFiles'
      ];
      jsonFields.forEach(field => {
        if (o[field] !== undefined) {
          o[field] = JSON.stringify(o[field]);
        }
      });

      const keys = Object.keys(o);
      if (keys.length === 0) return res.json({ success: true });
      const setClause = keys.map(k => `${k} = ?`).join(', ');
      const values = [...Object.values(o), req.params.id];
      await pool.query(`UPDATE orders SET ${setClause} WHERE id = ?`, values);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to update order:", error);
      res.status(500).json({ error: 'Database update failed' });
    }
  });

  app.delete('/api/orders/:id', async (req, res) => {
    try {
      await pool.query('DELETE FROM orders WHERE id = ?', [req.params.id]);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete order:", error);
      res.status(500).json({ error: 'Database delete failed' });
    }
  });

  // 6. Inventory endpoints
  app.get('/api/inventory', async (req, res) => {
    try {
      const [rows]: any = await pool.query('SELECT * FROM inventory ORDER BY createdAt DESC');
      res.json(rows);
    } catch (error) {
      console.error("Failed to fetch inventory:", error);
      res.status(500).json({ error: 'Database query failed' });
    }
  });

  app.post('/api/inventory', async (req, res) => {
    try {
      const keys = Object.keys(req.body);
      const values = Object.values(req.body);
      const placeholders = keys.map(() => '?').join(', ');
      await pool.query(
        `INSERT INTO inventory (${keys.join(', ')}) VALUES (${placeholders})`,
        values
      );
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to create inventory entry:", error);
      res.status(500).json({ error: 'Database insert failed' });
    }
  });

  app.delete('/api/inventory/:id', async (req, res) => {
    try {
      await pool.query('DELETE FROM inventory WHERE id = ?', [req.params.id]);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete inventory record:", error);
      res.status(500).json({ error: 'Database delete failed' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);

    // Development SPA fallback for page reloads on custom paths
    app.get("*", async (req, res, next) => {
      const url = req.originalUrl;
      if (url.includes(".") || url.startsWith("/api")) {
        return next();
      }
      try {
        const templatePath = path.resolve(__dirname, "index.html");
        const template = fs.readFileSync(templatePath, "utf-8");
        const html = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(html);
      } catch (e) {
        next(e);
      }
    });
  } else {
    // In production, serve static files from the dist directory
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));

    // SPA fallback: serve index.html for all non-file requests
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
