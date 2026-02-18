const { pool } = require('../config/db');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    try {
        console.log('📦 Reading SQL schema files...');
        const bookingSql = fs.readFileSync(
            path.join(__dirname, 'booking_schema.sql'),
            'utf8'
        );
        const tripSql = fs.readFileSync(
            path.join(__dirname, 'trip_weekend_schema.sql'),
            'utf8'
        );

        console.log('🔄 Executing database migration...');
        await pool.query(bookingSql);
        await pool.query(tripSql);

        console.log('✅ Database schema created successfully!');
        console.log('\n📋 Tables created/updated:');
        console.log('   - bookings');
        console.log('   - trips');
        console.log('   - weekendtrips');
        console.log('\n📋 Views created:');
        console.log('   - bookings_view');
        console.log('\n📋 ENUM types created (or already exist):');
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
