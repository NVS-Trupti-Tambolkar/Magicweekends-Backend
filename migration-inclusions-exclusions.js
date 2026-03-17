const { pool } = require('./config/db');

async function migrateDB() {
  try {
    console.log("Starting Migration...");

    // 1. Add columns to trips if they don't exist
    await pool.query(`
      ALTER TABLE trips 
      ADD COLUMN IF NOT EXISTS inclusions JSONB DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS exclusions JSONB DEFAULT '[]'::jsonb;
    `);
    console.log("Updated 'trips' table schema successfully.");

    // 2. Add columns to weekendtrips if they don't exist
    await pool.query(`
      ALTER TABLE weekendtrips 
      ADD COLUMN IF NOT EXISTS inclusions JSONB DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS exclusions JSONB DEFAULT '[]'::jsonb;
    `);
    console.log("Updated 'weekendtrips' table schema successfully.");

  } catch (e) {
    console.error("Migration Error:", e);
  } finally {
    pool.end();
  }
}

migrateDB();
