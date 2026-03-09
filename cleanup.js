const { pool } = require('./config/db');
async function run() {
    try {
        const res = await pool.query("DELETE FROM users WHERE role != 'admin'");
        console.log('Deleted non-admin users:', res.rowCount);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
run();
