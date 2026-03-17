const { pool } = require('./config/db');

async function checkSchema() {
  try {
    const tripCols = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'trips';
    `);
    console.log("Trips Table Columns:", tripCols.rows.map(r => r.column_name).join(', '));

    const weekendCols = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'weekendtrips';
    `);
    console.log("Weekend Trips Table Columns:", weekendCols.rows.map(r => r.column_name).join(', '));

  } catch (e) {
    console.error(e);
  } finally {
    pool.end();
  }
}

checkSchema();
