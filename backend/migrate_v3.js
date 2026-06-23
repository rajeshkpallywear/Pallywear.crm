const mysql = require('mysql2/promise');
require('dotenv').config();

const main = async () => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  console.log('Connected to MySQL. Setting orders.status to VARCHAR(100)...');

  try {
    await connection.execute("ALTER TABLE orders MODIFY COLUMN status VARCHAR(100) DEFAULT 'Design'");
    console.log('Successfully set status column definition to VARCHAR(100).');
    console.log('v3 Migrations completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err.message);
  } finally {
    await connection.end();
  }
};

main();
