const nodemailer = require('nodemailer');
require('dotenv').config();

const sendOTPEmail = async (email, otp) => {
    try {
        console.log('Using EMAIL_USER:', process.env.EMAIL_USER);
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
        return true;
    } catch (error) {
        console.error('Error sending OTP email:', error);
        return false;
    }
};

sendOTPEmail('shrutitambolkar@gmail.com', '123456');
