require('dotenv').config();
const { pool } = require('./config/db');

async function updateUser() {
    try {
        const username = 'admin';
        const email = 'admin@gmail.com';
        const password_hash = 'b9e76744bfdd55a75faea2358690e8e9d8ef5a93ebb87e847642bd3c4d7fd590';
        const role = 'admin';

        const result = await pool.query(
            'UPDATE users SET email = $1, password_hash = $2, role = $3 WHERE username = $4 RETURNING id, username, email, role',
            [email, password_hash, role, username]
        );

        if (result.rows.length > 0) {
            console.log('Update successful:');
            console.log(JSON.stringify(result.rows[0]));
        } else {
            console.log('User not found. Attempting to insert...');
            const insertResult = await pool.query(
                'INSERT INTO users (username, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, username, email, role',
                [username, email, password_hash, role]
            );
            console.log('Insert successful:');
            console.log(JSON.stringify(insertResult.rows[0]));
        }
        process.exit(0);
    } catch (err) {
        console.error('Error updating user:', err);
        process.exit(1);
    }
}

updateUser();
