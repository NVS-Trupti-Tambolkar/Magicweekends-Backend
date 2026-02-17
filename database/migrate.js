const { pool } = require('../config/db');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    try {
        console.log('📦 Reading SQL schema file...');
        const sql = fs.readFileSync(
            path.join(__dirname, 'booking_schema.sql'),
            'utf8'
        );

        console.log('🔄 Executing database migration...');
        await pool.query(sql);

        console.log('✅ Database schema created successfully!');
        console.log('\n📋 Tables created:');
        console.log('   - bookings');
        console.log('\n📋 Views created:');
        console.log('   - bookings_view');
        console.log('\n📋 ENUM types created:');
        console.log('   - payment_status_enum');
        console.log('   - booking_status_enum');
        console.log('   - trip_type_enum');
        console.log('   - payment_method_enum');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error('\nFull error:', error);
    } finally {
        await pool.end();
    }
}

runMigration();
