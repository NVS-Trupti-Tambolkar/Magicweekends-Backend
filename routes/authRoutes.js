const express = require('express');
const router = express.Router();
const { login, getMe, register, googleLogin, sendOTP } = require('../controllers/authController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.post('/login', login);
router.post('/send-otp', sendOTP);
router.get('/me', protect, getMe);
router.post('/register', register);
router.post('/google', googleLogin);

module.exports = router;
