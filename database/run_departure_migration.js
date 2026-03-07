const { pool } = require('../config/db');
const fs = require('fs');
const path = require('path');

async function runDepartureDatesMigration() {
    try {
        console.log('📦 Reading Departure Dates SQL schema file...');
        const migrationSql = fs.readFileSync(
            path.join(__dirname, 'departure_dates_migration.sql'),
            'utf8'
        );

        console.log('🔄 Executing Departure Dates migration...');
        await pool.query(migrationSql);

        console.log('✅ trip_departure_dates table created successfully!');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
    } finally {
        await pool.end();
    }
}

runDepartureDatesMigration();
