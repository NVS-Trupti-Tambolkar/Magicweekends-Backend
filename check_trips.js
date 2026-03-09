const { Pool } = require('pg');
const connectionString = "postgresql://neondb_owner:npg_BCwoXK03sjYF@ep-patient-boat-a428xgfh-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const pool = new Pool({
  connectionString: connectionString,
  ssl: {
    rejectUnauthorized: false
  },
});

async function checkTrips() {
  const client = await pool.connect();
  try {
    const res = await client.query("SELECT id, title, available_days, status, deleted FROM weekendtrips");
    console.log("Weekend Trips:", JSON.stringify(res.rows, null, 2));
    
    const dates = await client.query("SELECT * FROM trip_departure_dates WHERE trip_type = 'weekend'");
    console.log("Departure Dates:", JSON.stringify(dates.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    client.release();
    await pool.end();
  }
}

checkTrips();
