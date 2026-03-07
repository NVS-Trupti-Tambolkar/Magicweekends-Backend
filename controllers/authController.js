const { pool } = require('../config/db');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const asyncHandler = require('express-async-handler');

// Helper to hash password
const hashPassword = (password) => {
    const salt = 'novius_salt_2024';
    return crypto.createHmac('sha256', salt).update(password).digest('hex');
};

const login = asyncHandler(async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        res.status(400);
        throw new Error('Please provide username and password');
    }

    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = result.rows[0];

    if (user && user.password_hash === hashPassword(password)) {
        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this',
            { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
        );

        res.json({
            success: true,
            data: {
                id: user.id,
                username: user.username,
                role: user.role,
                token
            }
        });
    } else {
        res.status(401);
        throw new Error('Invalid username or password');
    }
});

const getMe = asyncHandler(async (req, res) => {
    // This assumes a protect middleware is used
    const result = await pool.query('SELECT id, username, role, created_at FROM users WHERE id = $1', [req.user.id]);
    res.json({
        success: true,
        data: result.rows[0]
    });
});

const register = asyncHandler(async (req, res) => {
    const { username, password, role } = req.body;

    if (!username || !password) {
        res.status(400);
        throw new Error('Please provide username and password');
    }

    // Check if user exists
    const userExists = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (userExists.rows.length > 0) {
        res.status(400);
        throw new Error('User already exists');
    }

    // Hash password
    const password_hash = hashPassword(password);

    // Create user
    const result = await pool.query(
        'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3) RETURNING id, username, role',
        [username, password_hash, role || 'staff']
    );

    res.status(201).json({
        success: true,
        data: result.rows[0]
    });
});

module.exports = {
    login,
    getMe,
    register
};
