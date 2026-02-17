const express = require('express');
const router = express.Router();
const {
    createBooking,
    getBookingById,
    getAllBookings,
    getUserBookings,
    updateBookingStatus,
    updatePaymentStatus,
    cancelBooking,
    verifyPayment
} = require('../controllers/BookingController');
const bookingUploadMiddleware = require('../middleware/bookingUploadMiddleware');

// Create new booking
router.post('/bookings', bookingUploadMiddleware, createBooking);

// Get booking by ID
router.get('/bookings/:id', getBookingById);

// Get all bookings (with optional filters)
router.get('/bookings', getAllBookings);

// Get user's bookings by email
router.get('/bookings/user/:email', getUserBookings);

// Update booking status
router.put('/bookings/:id/status', updateBookingStatus);

// Update payment status
router.put('/bookings/:id/payment', updatePaymentStatus);

// Cancel booking
router.delete('/bookings/:id', cancelBooking);

// Verify payment
router.post('/verify-payment', verifyPayment);

module.exports = router;
