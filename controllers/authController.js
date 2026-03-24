const { pool } = require('../config/db');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const asyncHandler = require('express-async-handler');
const { OAuth2Client } = require('google-auth-library');
const otpService = require('../services/otpService');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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

    const result = await pool.query('SELECT id, username, email, password_hash, role FROM users WHERE username = $1', [username]);
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
                email: user.email,
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

const sendOTP = asyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!email) {
        res.status(400);
        throw new Error('Please provide an email address');
    }

    // Check if user already exists
    const userExists = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userExists.rows.length > 0) {
        res.status(400);
        throw new Error('User already exists with this email');
    }

    const otp = otpService.generateOTP();
    const isSent = await otpService.sendOTPEmail(email, otp);

    if (isSent) {
        otpService.storeOTP(email, otp);
        res.status(200).json({ success: true, message: 'OTP sent successfully' });
    } else {
        res.status(500);
        throw new Error('Failed to send OTP email');
    }
});

const register = asyncHandler(async (req, res) => {
    const { username, password, email, role, otp } = req.body;

    if (!username || !password || !email) {
        res.status(400);
        throw new Error('Please provide username, password and email');
    }

    if (!otp) {
        res.status(400);
        throw new Error('Please provide the OTP sent to your email');
    }

    // Verify OTP
    const isOtpValid = otpService.verifyOTP(email, otp);
    if (!isOtpValid) {
        res.status(400);
        throw new Error('Invalid or expired OTP');
    }

    // Check if user exists (Double check)
    const userExists = await pool.query('SELECT * FROM users WHERE username = $1 OR email = $2', [username, email]);
    if (userExists.rows.length > 0) {
        res.status(400);
        throw new Error('User already exists');
    }

    // Hash password
    const password_hash = hashPassword(password);

    const result = await pool.query(
        'INSERT INTO users (username, password_hash, email, role) VALUES ($1, $2, $3, $4) RETURNING id, username, email, role',
        [username, password_hash, email, role || 'user']
    );

    res.status(201).json({
        success: true,
        data: result.rows[0]
    });
});

const googleLogin = asyncHandler(async (req, res) => {
    const { credential } = req.body;

    if (!credential) {
        res.status(400);
        throw new Error('Google credential is required');
    }

    try {
        const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        const { email, name, sub: google_id, picture } = payload;

        // 1. Check if user already exists with this email
        let result = await pool.query('SELECT id, username, email, role FROM users WHERE email = $1', [email]);
        let user = result.rows[0];

        // 2. If not, create a new user
        if (!user) {
            // Generate a random username if name is not available or taken
            const baseUsername = name ? name.toLowerCase().replace(/\s+/g, '_') : 'user';
            const randomSuffix = Math.floor(Math.random() * 1000);
            const username = `${baseUsername}_${randomSuffix}`;
            
            // Dummy password for Google users (they'll use Google login anyway)
            const dummyPassword = crypto.randomBytes(16).toString('hex');
            const password_hash = hashPassword(dummyPassword);

            const insertResult = await pool.query(
                'INSERT INTO users (username, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, username, email, role',
                [username, email, password_hash, 'user']
            );
            user = insertResult.rows[0];
        }

        // 3. Generate JWT
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
                email: user.email,
                role: user.role,
                picture, // Optional: return picture for frontend display
                token
            }
        });

    } catch (error) {
        console.error("Google Login Error:", error);
        res.status(401);
        throw new Error('Google authentication failed');
    }
});

const forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!email) {
        res.status(400);
        throw new Error('Please provide an email address');
    }

    // Check if user exists
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
        // Return 200 even if user doesn't exist to prevent email enumeration
        return res.status(200).json({ success: true, message: 'If that email is registered, a password reset OTP will be sent.' });
    }

    const otp = otpService.generateOTP();
    const isSent = await otpService.sendOTPEmail(email, otp);

    if (isSent) {
        otpService.storeOTP(email, otp);
        res.status(200).json({ success: true, message: 'Password reset OTP sent successfully' });
    } else {
        res.status(500);
        throw new Error('Failed to send password reset email');
    }
});

const resetPassword = asyncHandler(async (req, res) => {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
        res.status(400);
        throw new Error('Please provide email, OTP, and new password');
    }

    if (newPassword.length < 6) {
        res.status(400);
        throw new Error('Password must be at least 6 characters long');
    }

    // Verify OTP
    const isOtpValid = otpService.verifyOTP(email, otp);
    if (!isOtpValid) {
        res.status(400);
        throw new Error('Invalid or expired OTP');
    }

    // Check if user exists
    const result = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
        res.status(404);
        throw new Error('User not found');
    }

    // Update password
    const password_hash = hashPassword(newPassword);
    await pool.query('UPDATE users SET password_hash = $1 WHERE email = $2', [password_hash, email]);

    res.status(200).json({ success: true, message: 'Password has been reset successfully' });
});

module.exports = {
    login,
    getMe,
    sendOTP,
    register,
    googleLogin,
    forgotPassword,
    resetPassword
};
