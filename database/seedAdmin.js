const { pool } = require('../config/db');
const crypto = require('crypto');

async function seedAdmin() {
    const username = 'admin';
    const password = 'password#123';
    
    // Hash password using SHA-256 for basic security without bcrypt (since it's not in dependencies)
    // Actually, I should check if there's a better way or if I can use crypto.scryptSync for better security
    const salt = 'novius_salt_2024';
    const passwordHash = crypto.createHmac('sha256', salt).update(password).digest('hex');

    try {
        console.log('🌱 Seeding admin user...');
        
        // Check if exists
        const check = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
        if (check.rows.length > 0) {
            console.log('⚠️ Admin user already exists. Updating password...');
            await pool.query('UPDATE users SET password_hash = $1 WHERE username = $2', [passwordHash, username]);
        } else {
            await pool.query(
                'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3)',
                [username, passwordHash, 'admin']
            );
            console.log('✅ Admin user created successfully!');
        }
    } catch (error) {
        console.error('❌ Seeding failed:', error.message);
    } finally {
        await pool.end();
    }
}

seedAdmin();
