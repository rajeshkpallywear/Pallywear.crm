const mysql = require('mysql2/promise');
require('dotenv').config();

const main = async () => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  console.log('Connected to MySQL. Running v2 migrations...');

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
    // Orders table columns
    await tryAddColumn('orders', 'original_design_file', 'LONGTEXT');
    await tryAddColumn('orders', 'original_design_filename', 'VARCHAR(255)');
    await tryAddColumn('orders', 'digitizer_file', 'LONGTEXT');
    await tryAddColumn('orders', 'digitizer_filename', 'VARCHAR(255)');
    await tryAddColumn('orders', 'is_hold', 'TINYINT DEFAULT 0');
    await tryAddColumn('orders', 'balance_received_notes', 'TEXT');

    // Designs table columns
    await tryAddColumn('designs', 'original_design_file', 'LONGTEXT');
    await tryAddColumn('designs', 'original_design_filename', 'VARCHAR(255)');
    await tryAddColumn('designs', 'is_hold', 'TINYINT DEFAULT 0');

    console.log('v2 Migrations completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err.message);
  } finally {
    await connection.end();
  }
};

main();
