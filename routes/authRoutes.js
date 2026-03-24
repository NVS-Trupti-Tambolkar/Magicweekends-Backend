const express = require('express');
const router = express.Router();
const { login, getMe, register, googleLogin, sendOTP, forgotPassword, resetPassword } = require('../controllers/authController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.post('/login', login);
router.post('/send-otp', sendOTP);
router.get('/me', protect, getMe);
router.post('/register', register);
router.post('/google', googleLogin);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

module.exports = router;
