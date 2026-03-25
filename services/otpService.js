const nodemailer = require('nodemailer');
const otpGenerator = require('otp-generator');

// In-memory store for OTPs (for simplicity, a DB table is better for production)
const otpStore = new Map();

// Generate OTP
const generateOTP = () => {
    return otpGenerator.generate(6, { upperCaseAlphabets: false, specialChars: false, lowerCaseAlphabets: false });
};

// Send OTP via Email
const sendOTPEmail = async (email, otp) => {
    try {
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            console.error('ERROR: EMAIL_USER or EMAIL_PASS environment variables are missing.');
            throw new Error('Email server configuration is incomplete (missing credentials).');
        }

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Verification Code for Magic Weekends',
            text: `Your Verification Code is: ${otp}. This code is valid for 5 minutes.`
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('OTP Email sent: ' + info.response);
        return { success: true };
    } catch (error) {
        console.error('Error sending OTP email:', error.message);
        return { success: false, error: error.message };
    }
};

// Store OTP temporarily
const storeOTP = (email, otp) => {
    otpStore.set(email, otp);
    
    // Auto-delete after 5 minutes
    setTimeout(() => {
        if(otpStore.get(email) === otp) {
             otpStore.delete(email);
        }
    }, 5 * 60 * 1000); 
};

// Verify OTP
const verifyOTP = (email, otp) => {
    const storedOTP = otpStore.get(email);
    if (storedOTP && storedOTP === otp) {
        otpStore.delete(email); // Remove OTP once verified
        return true;
    }
    return false;
};

module.exports = {
    generateOTP,
    sendOTPEmail,
    storeOTP,
    verifyOTP
};
