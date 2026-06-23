const mysql = require('mysql2/promise');
require('dotenv').config();

const main = async () => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  console.log('Connected to MySQL. Running migrations...');

  const tryAddColumn = async (table, col, definition) => {
    try {
      await connection.execute(`ALTER TABLE ${table} ADD COLUMN ${col} ${definition}`);
      console.log(`Added ${col} to ${table}`);
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME' || err.message.includes('Multiple columns') || err.message.includes('Duplicate column')) {
        console.log(`Column ${col} already exists in ${table}`);
      } else {
        console.error(`Error adding ${col} to ${table}:`, err.message);
      }
    }
  };

  try {
    // Designs table
    await tryAddColumn('designs', 'marketing_image', 'LONGTEXT');
    await tryAddColumn('designs', 'completed_image', 'LONGTEXT');
    await tryAddColumn('designs', 'marketing_staff_name', 'VARCHAR(150)');
    await tryAddColumn('designs', 'marketing_notes', 'TEXT');

    // Orders table
    await tryAddColumn('orders', 'marketing_image', 'LONGTEXT');
    await tryAddColumn('orders', 'marketing_notes', 'TEXT');
    await tryAddColumn('orders', 'invoice_file', 'LONGTEXT');
    await tryAddColumn('orders', 'invoice_file_name', 'VARCHAR(255)');

    // Invoices table
    await tryAddColumn('invoices', 'invoice_file', 'LONGTEXT');
    await tryAddColumn('invoices', 'invoice_file_name', 'VARCHAR(255)');

    console.log('Migrations completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err.message);
  } finally {
    await connection.end();
  }
};

main();
