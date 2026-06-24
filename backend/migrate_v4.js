const mysql = require('mysql2/promise');
require('dotenv').config();

const main = async () => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  console.log('Connected to MySQL. Running v4 migrations (leads & invoices column fixes)...');

  const tryAddColumn = async (table, col, definition) => {
    try {
      await connection.execute(`ALTER TABLE ${table} ADD COLUMN ${col} ${definition}`);
      console.log(`✅ Added ${col} to ${table}`);
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME' || err.message.includes('Multiple columns') || err.message.includes('Duplicate column')) {
        console.log(`ℹ️ Column ${col} already exists in ${table}`);
      } else {
        console.error(`❌ Error adding ${col} to ${table}:`, err.message);
      }
    }
  };

  try {
    // 1. Leads Table Column Additions
    await tryAddColumn('leads', 'email', 'VARCHAR(255) NULL');
    await tryAddColumn('leads', 'status', "VARCHAR(50) DEFAULT 'New'");
    await tryAddColumn('leads', 'created_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');

    // 2. Invoices Table Column Additions
    await tryAddColumn('invoices', 'order_id', 'VARCHAR(50) NULL');
    await tryAddColumn('invoices', 'type', "VARCHAR(50) DEFAULT 'Revenue'");
    await tryAddColumn('invoices', 'client', 'VARCHAR(150) NULL');
    await tryAddColumn('invoices', 'amount', 'DECIMAL(15,2) NOT NULL DEFAULT 0.00');
    await tryAddColumn('invoices', 'status', "VARCHAR(50) DEFAULT 'Pending'");
    await tryAddColumn('invoices', 'description', 'TEXT NULL');
    await tryAddColumn('invoices', 'invoice_date', 'VARCHAR(50) NULL');
    await tryAddColumn('invoices', 'created_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');

    // 3. Modify Invoices Table constraints to allow NULL values for standard billing generator fields
    console.log('Modifying standard invoice fields to be NULLABLE...');
    await connection.execute('ALTER TABLE invoices MODIFY COLUMN invoiceNumber VARCHAR(50) NULL');
    await connection.execute('ALTER TABLE invoices MODIFY COLUMN date VARCHAR(50) NULL');
    await connection.execute('ALTER TABLE invoices MODIFY COLUMN createdAt VARCHAR(50) NULL');
    await connection.execute('ALTER TABLE invoices MODIFY COLUMN dueDate VARCHAR(50) NULL');
    await connection.execute('ALTER TABLE invoices MODIFY COLUMN billToName VARCHAR(100) NULL');
    await connection.execute('ALTER TABLE invoices MODIFY COLUMN billToEmail VARCHAR(100) NULL');
    await connection.execute('ALTER TABLE invoices MODIFY COLUMN billToPhone VARCHAR(50) NULL');
    await connection.execute('ALTER TABLE invoices MODIFY COLUMN billToAddress TEXT NULL');
    await connection.execute('ALTER TABLE invoices MODIFY COLUMN items TEXT NULL');
    console.log('✅ Modified constraints successfully!');

    console.log('✅ v4 Migrations completed successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
  } finally {
    await connection.end();
  }
};

main();
