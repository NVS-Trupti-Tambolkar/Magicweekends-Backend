require('dotenv').config();
const { pool } = require('./config/db');

async function checkUser() {
    try {
        const result = await pool.query('SELECT id, username, email, role FROM users WHERE username = $1', ['admin']);
        console.log(JSON.stringify(result.rows));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkUser();
