const db = require('./db');

const test = async () => {
  try {
    const tables = ['leads', 'orders', 'invoices'];
    for (const table of tables) {
      console.log(`\n--- DESCRIBE ${table} ---`);
      const [rows] = await db.query(`DESCRIBE ${table}`);
      console.log(rows.map(r => `${r.Field}: ${r.Type} | Null: ${r.Null} | Default: ${r.Default}`).join('\n'));
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    process.exit(0);
  }
};

test();
