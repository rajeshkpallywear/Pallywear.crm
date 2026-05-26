import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

// Extract database configuration from environment variables or use local defaults
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || 'root';
const DB_NAME = process.env.DB_NAME || 'pallywearcrm';

console.log(`[Database] Initializing connection pool to MySQL on ${DB_HOST}...`);

export const realPool = mysql.createPool({
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 4000, // Shorter connection timeout for immediate dev server responsiveness
});

// Switch to transparent local fallback if database is offline or not configured
let useFallback = false;

// Local JSON file database path
const FallbackDBFile = path.join(process.cwd(), 'local_db_fallback.json');

// Initialize of fallback store if missing
function initFallbackStore() {
  if (!fs.existsSync(FallbackDBFile)) {
    fs.writeFileSync(FallbackDBFile, JSON.stringify({
      users: [],
      leads: [],
      invoices: [],
      orders: [],
      inventory: [],
      settings: []
    }, null, 2));
  }
}

function readFallbackDB() {
  initFallbackStore();
  try {
    return JSON.parse(fs.readFileSync(FallbackDBFile, 'utf-8'));
  } catch (err) {
    return { users: [], leads: [], invoices: [], orders: [], inventory: [], settings: [] };
  }
}

function writeFallbackDB(data: any) {
  initFallbackStore();
  fs.writeFileSync(FallbackDBFile, JSON.stringify(data, null, 2));
}

function parseTableName(sql: string): string | null {
  const normalized = sql.toLowerCase().trim();
  if (normalized.startsWith('select')) {
    const match = normalized.match(/from\s+([a-zA-Z0-9_]+)/);
    return match ? match[1] : null;
  }
  if (normalized.startsWith('insert')) {
    const match = normalized.match(/into\s+([a-zA-Z0-9_]+)/);
    return match ? match[1] : null;
  }
  if (normalized.startsWith('update')) {
    const match = normalized.match(/update\s+([a-zA-Z0-9_]+)/);
    return match ? match[1] : null;
  }
  if (normalized.startsWith('delete')) {
    const match = normalized.match(/from\s+([a-zA-Z0-9_]+)/);
    return match ? match[1] : null;
  }
  return null;
}

async function handleFallbackQuery(sql: string, params: any[] = []): Promise<any> {
  const table = parseTableName(sql);
  if (!table) {
    console.warn(`[FallbackDB] Could not parse table from SQL: ${sql}`);
    return [[]]; // Return empty array
  }

  const db = readFallbackDB();
  const rows = db[table] || [];
  const normalized = sql.toLowerCase().trim();

  // 1. SELECT queries
  if (normalized.startsWith('select')) {
    // If selecting by specific value WHERE key = ?
    if (normalized.includes('where id = ?') || normalized.includes('where id=?')) {
      const idVal = params[0];
      const match = rows.find((r: any) => r.id === idVal);
      return [match ? [match] : []];
    }

    if (normalized.includes('where email = ?') || normalized.includes('where email=?')) {
      const emailVal = params[0];
      const match = rows.find((r: any) => r.email === emailVal);
      return [match ? [match] : []];
    }

    // Sort order handling
    let sortedRows = [...rows];
    if (normalized.includes('order by')) {
      const orderByMatch = normalized.match(/order by\s+([a-zA-Z0-9_]+)(?:\s+(asc|desc))?/i);
      if (orderByMatch) {
        const field = orderByMatch[1];
        const direction = orderByMatch[2] && orderByMatch[2].toLowerCase() === 'desc' ? -1 : 1;
        sortedRows.sort((a: any, b: any) => {
          const valA = a[field];
          const valB = b[field];
          if (valA === undefined && valB === undefined) return 0;
          if (valA === undefined) return -direction;
          if (valB === undefined) return direction;
          if (typeof valA === 'string' && typeof valB === 'string') {
            return valA.localeCompare(valB) * direction;
          }
          return (valA < valB ? -1 : valA > valB ? 1 : 0) * direction;
        });
      }
    }
    return [sortedRows];
  }

  // 2. INSERT / UPSERT SQL Emulation
  if (normalized.startsWith('insert')) {
    const colMatch = sql.match(/insert\s+into\s+[a-zA-Z0-9_]+\s*\(([^)]+)\)\s*values\s*\(([^)]+)\)/i);
    if (colMatch) {
      const columns = colMatch[1].split(',').map(c => c.trim());
      const record: any = {};
      columns.forEach((col, idx) => {
        let val = params[idx];
        if (typeof val === 'string' && (val.startsWith('{') || val.startsWith('['))) {
          try {
            val = JSON.parse(val);
          } catch (e) {
            // keep as string if bad JSON
          }
        }
        record[col] = val;
      });

      // Handle custom unique constraints (ID or Email)
      const existingIdx = rows.findIndex((r: any) => {
        if (record.id && r.id === record.id) return true;
        if (record.email && r.email?.toLowerCase().trim() === record.email?.toLowerCase().trim()) return true;
        return false;
      });

      if (existingIdx !== -1) {
        // ON DUPLICATE UPDATE equivalent
        rows[existingIdx] = { ...rows[existingIdx], ...record };
      } else {
        rows.push(record);
      }
      db[table] = rows;
      writeFallbackDB(db);
      return [{ affectedRows: 1 }];
    }
  }

  // 3. UPDATE SQL Emulation
  if (normalized.startsWith('update')) {
    const idVal = params[params.length - 1]; // typically ID is the last param in WHERE id = ?
    const setClauseMatch = sql.match(/set\s+(.+?)\s+where\s+id\s*=\s*\?/i);
    if (setClauseMatch) {
      const setParts = setClauseMatch[1].split(',').map(s => s.split('=')[0].trim());
      const existingIdx = rows.findIndex((r: any) => r.id === idVal);
      if (existingIdx !== -1) {
        setParts.forEach((field, idx) => {
          let val = params[idx];
          if (typeof val === 'string' && (val.startsWith('{') || val.startsWith('['))) {
            try {
              val = JSON.parse(val);
            } catch (e) {
              // Ignore
            }
          }
          rows[existingIdx][field] = val;
        });
        db[table] = rows;
        writeFallbackDB(db);
        return [{ affectedRows: 1 }];
      }
    }
  }

  // 4. DELETE SQL Emulation
  if (normalized.startsWith('delete')) {
    if (normalized.includes('where id = ?') || normalized.includes('where id=?')) {
      const idVal = params[0];
      const initialLength = rows.length;
      db[table] = rows.filter((r: any) => r.id !== idVal);
      writeFallbackDB(db);
      return [{ affectedRows: initialLength - db[table].length }];
    }
  }

  return [[]];
}

// Transparent interface mirroring connection/pool behavior
export const pool = {
  _pool: realPool,
  async getConnection() {
    if (useFallback) {
      return {
        query: async (sql: string, params: any[] = []) => {
          return handleFallbackQuery(sql, params);
        },
        release() { }
      } as any;
    }
    try {
      return await realPool.getConnection();
    } catch (err: any) {
      console.warn('⚠️ Lost connection during getConnection, returning transparent fallback.');
      useFallback = true;
      initFallbackStore();
      return {
        query: async (sql: string, params: any[] = []) => {
          return handleFallbackQuery(sql, params);
        },
        release() { }
      } as any;
    }
  },
  async query(sql: string, params: any[] = []) {
    if (useFallback) {
      return handleFallbackQuery(sql, params);
    }
    try {
      return await realPool.query(sql, params);
    } catch (err: any) {
      if (err.code === 'ECONNREFUSED' || err.code === 'PROTOCOL_CONNECTION_LOST' || err.message?.includes('connect')) {
        console.warn('⚠️ Database connection lost / refused. Activating local file-system transparent database fallback...');
        useFallback = true;
        initFallbackStore();
        return handleFallbackQuery(sql, params);
      }
      throw err;
    }
  }
} as any;

// A quick helper to test the MySQL connection on launch and create tables if missing
export async function testConnection() {
  try {
    const connection = await realPool.getConnection();
    console.log('✅ Success: Connected to MySQL database!');
    useFallback = false;

    // Auto-create database schema tables
    console.log('[Database] Checking/creating table schemas...');

    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(128) PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        role VARCHAR(64) NOT NULL,
        name VARCHAR(255) NOT NULL,
        avatar TEXT,
        createdAt VARCHAR(128) NOT NULL,
        UNIQUE(email)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS leads (
        id VARCHAR(128) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        number VARCHAR(64) NOT NULL,
        companyName VARCHAR(255) NOT NULL,
        gst VARCHAR(64) NOT NULL,
        leadType VARCHAR(64) NOT NULL,
        entryDate VARCHAR(64) NOT NULL,
        forecastedValue DOUBLE DEFAULT 0,
        convertedValue DOUBLE DEFAULT 0,
        totalOrderValue DOUBLE DEFAULT 0,
        discountCode VARCHAR(128),
        discountAmount DOUBLE DEFAULT 0,
        netTotal DOUBLE DEFAULT 0,
        createdBy VARCHAR(128) NOT NULL,
        createdByName VARCHAR(255) NOT NULL
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS invoices (
        id VARCHAR(128) PRIMARY KEY,
        invoiceNumber VARCHAR(128) NOT NULL,
        date VARCHAR(64) NOT NULL,
        createdAt VARCHAR(128) NOT NULL,
        dueDate VARCHAR(64) NOT NULL,
        fromName VARCHAR(255) NOT NULL,
        fromEmail VARCHAR(255) NOT NULL,
        fromPhone VARCHAR(64) NOT NULL,
        fromAddress TEXT NOT NULL,
        billToName VARCHAR(255) NOT NULL,
        billToEmail VARCHAR(255) NOT NULL,
        billToPhone VARCHAR(64) NOT NULL,
        billToAddress TEXT NOT NULL,
        shipToAddress TEXT,
        trackingNumber VARCHAR(128),
        items JSON NOT NULL,
        subtotal DOUBLE DEFAULT 0,
        discountTotal DOUBLE DEFAULT 0,
        shippingCost DOUBLE DEFAULT 0,
        salesTax DOUBLE DEFAULT 0,
        total DOUBLE DEFAULT 0,
        amountPaid DOUBLE DEFAULT 0,
        balanceDue DOUBLE DEFAULT 0,
        notes TEXT,
        paymentInstructions TEXT,
        paymentMethod VARCHAR(64),
        productType VARCHAR(255),
        productSubCategory VARCHAR(255),
        customerPhoneNumber VARCHAR(64),
        companySignature TEXT,
        bankName VARCHAR(255),
        bankAccountName VARCHAR(255),
        bankIfscCode VARCHAR(64),
        bankAccountNumber VARCHAR(128),
        createdBy VARCHAR(128) NOT NULL,
        createdByName VARCHAR(255) NOT NULL,
        leadId VARCHAR(128) NOT NULL
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id VARCHAR(128) PRIMARY KEY,
        customerInfo JSON NOT NULL,
        category VARCHAR(255) NOT NULL,
        quantity INT DEFAULT 0,
        details JSON NOT NULL,
        sizeBreakdown JSON NOT NULL,
        financials JSON NOT NULL,
        status VARCHAR(64) NOT NULL,
        assignedDesigner VARCHAR(128),
        isUrgent BOOLEAN DEFAULT FALSE,
        notes LONGTEXT,
        staffImages JSON NOT NULL,
        staffPdfs JSON NOT NULL,
        staffAttachments JSON DEFAULT NULL,
        accountsAttachments JSON NOT NULL,
        orderManagementAttachments JSON NOT NULL,
        designAttachments JSON DEFAULT NULL,
        machineFiles JSON DEFAULT NULL,
        createdAt BIGINT NOT NULL,
        updatedAt BIGINT NOT NULL,
        holdReason TEXT,
        previousStatus VARCHAR(64),
        createdBy VARCHAR(128) NOT NULL,
        createdByName VARCHAR(255) NOT NULL
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS inventory (
        id VARCHAR(128) PRIMARY KEY,
        type VARCHAR(64) NOT NULL,
        vendor VARCHAR(255),
        customer VARCHAR(255),
        date VARCHAR(64) NOT NULL,
        transportName VARCHAR(255),
        transportNumber VARCHAR(64),
        orderId VARCHAR(128),
        product VARCHAR(255) NOT NULL,
        productType VARCHAR(255) NOT NULL,
        sleeve VARCHAR(64),
        pocket VARCHAR(64),
        quantity INT DEFAULT 0,
        createdAt BIGINT NOT NULL
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS settings (
        id VARCHAR(128) PRIMARY KEY,
        value JSON NOT NULL
      )
    `);

    console.log('✅ Success: All database tables are active!');
    connection.release();
  } catch (err: any) {
    console.warn(`⚠️ MySQL database at ${DB_HOST} is offline / not reachable.`);
    console.warn('Initializing automated, transparent Local file fallback so application stays fully online...');
    useFallback = true;
    initFallbackStore();
  }
}
