const { pool } = require('../config/db');
const logger = require('../utils/logger');
const razorpay = require('../config/razorpay');
const crypto = require('crypto');

// Create a new booking
const createBooking = async (req, res) => {
    try {
        let {
            trip_id,
            trip_type,
            full_name,
            email,
            phone,
            travel_date,
            number_of_people,
            price_per_person,
            total_amount,
            payment_method,
            travelers_data,
            special_request
        } = req.body;

        // Parse JSON if it's a string (multipart/form-data sends strings)
        if (typeof travelers_data === 'string') {
            try {
                travelers_data = JSON.parse(travelers_data);
            } catch (e) {
                logger.error('Error parsing travelers_data JSON:', e);
                return res.status(400).json({ success: false, message: 'Invalid travelers data format' });
            }
        }

        // Handle File Uploads for ID Proofs
        if (req.files && req.files.length > 0 && Array.isArray(travelers_data)) {
            req.files.forEach(file => {
                // Expecting fieldname format: id_proof_image_0, id_proof_image_1, etc.
                const match = file.fieldname.match(/id_proof_image_(\d+)/);
                if (match && match[1]) {
                    const index = parseInt(match[1]);
                    if (travelers_data[index]) {
                        // Use the Cloudinary URL directly
                        travelers_data[index].id_proof_image = file.path;
                    }
                }
            });
        }

        // Validation
        if (!trip_id || !trip_type || !full_name || !email || !phone || !travel_date || !number_of_people || !total_amount) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        const query = `
      INSERT INTO bookings (
        trip_id, trip_type, full_name, email, phone, travel_date,
        number_of_people, price_per_person, total_amount, payment_method,
        travelers_data, special_request
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;

        const values = [
            trip_id,
            trip_type,
            full_name,
            email,
            phone,
            travel_date,
            number_of_people,
            price_per_person || (parseFloat(total_amount) / parseInt(number_of_people)),
            total_amount,
            payment_method || null,
            travelers_data ? JSON.stringify(travelers_data) : null,
            special_request || null
        ];

        const result = await pool.query(query, values);

        const booking = result.rows[0];

        // Create Razorpay Order for 10% token amount
        const tokenAmount = Math.round(total_amount * 0.10);
        const options = {
            amount: tokenAmount * 100, // amount in the smallest currency unit (paise)
            currency: "INR",
            receipt: `receipt_${booking.id}`,
        };

        const order = await razorpay.orders.create(options);

        // Update booking with Razorpay Order ID
        await pool.query(
            'UPDATE bookings SET transaction_id = $1 WHERE id = $2',
            [order.id, booking.id]
        );

        logger.info(`Booking created and Razorpay order generated: ${booking.id}, Order ID: ${order.id}`);

        res.status(201).json({
            success: true,
            message: 'Booking created and payment order generated',
            data: {
                ...booking,
                razorpay_order_id: order.id,
                razorpay_key_id: process.env.RAZORPAY_KEY_ID
            }
        });
    } catch (error) {
        logger.error('Error creating booking:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create booking',
            error: error.message
        });
    }
};

// Get booking by ID
const getBookingById = async (req, res) => {
    try {
        const { id } = req.params;

        const query = 'SELECT * FROM bookings WHERE id = $1 AND deleted = FALSE';
        const result = await pool.query(query, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }

        res.status(200).json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        logger.error('Error fetching booking:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch booking',
            error: error.message
        });
    }
};

// Get all bookings (with optional filters)
const getAllBookings = async (req, res) => {
    try {
        const { email, booking_status, payment_status, trip_type, limit = 50, offset = 0 } = req.query;

        let query = 'SELECT * FROM bookings WHERE deleted = FALSE';
        const values = [];
        let paramCount = 1;

        if (email) {
            query += ` AND email = $${paramCount}`;
            values.push(email);
            paramCount++;
        }

        if (booking_status) {
            query += ` AND booking_status = $${paramCount}`;
            values.push(booking_status);
            paramCount++;
        }

        if (payment_status) {
            query += ` AND payment_status = $${paramCount}`;
            values.push(payment_status);
            paramCount++;
        }

        if (trip_type) {
            query += ` AND trip_type = $${paramCount}`;
            values.push(trip_type);
            paramCount++;
        }

        query += ` ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
        values.push(limit, offset);

        const result = await pool.query(query, values);

        res.status(200).json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });
    } catch (error) {
        logger.error('Error fetching bookings:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch bookings',
            error: error.message
        });
    }
};

// Get user's bookings by email
const getUserBookings = async (req, res) => {
    try {
        const { email } = req.params;

        const query = `
      SELECT * FROM bookings 
      WHERE email = $1 AND deleted = FALSE 
      ORDER BY created_at DESC
    `;

        const result = await pool.query(query, [email]);

        res.status(200).json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });
    } catch (error) {
        logger.error('Error fetching user bookings:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch user bookings',
            error: error.message
        });
    }
};

// Update booking status
const updateBookingStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { booking_status } = req.body;

        if (!booking_status) {
            return res.status(400).json({
                success: false,
                message: 'Booking status is required'
            });
        }

        const query = `
      UPDATE bookings 
      SET booking_status = $1 
      WHERE id = $2 AND deleted = FALSE 
      RETURNING *
    `;

        const result = await pool.query(query, [booking_status, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }

        logger.info(`Booking ${id} status updated to ${booking_status}`);

        res.status(200).json({
            success: true,
            message: 'Booking status updated successfully',
            data: result.rows[0]
        });
    } catch (error) {
        logger.error('Error updating booking status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update booking status',
            error: error.message
        });
    }
};

// Update payment status
const updatePaymentStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { payment_status, transaction_id, payment_method } = req.body;

        if (!payment_status) {
            return res.status(400).json({
                success: false,
                message: 'Payment status is required'
            });
        }

        const query = `
      UPDATE bookings 
      SET payment_status = $1, 
          transaction_id = $2,
          payment_method = $3,
          payment_date = CASE WHEN $1 = 'paid' THEN CURRENT_TIMESTAMP ELSE payment_date END
      WHERE id = $4 AND deleted = FALSE 
      RETURNING *
    `;

        const result = await pool.query(query, [
            payment_status,
            transaction_id || null,
            payment_method || null,
            id
        ]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }

        logger.info(`Booking ${id} payment status updated to ${payment_status}`);

        res.status(200).json({
            success: true,
            message: 'Payment status updated successfully',
            data: result.rows[0]
        });
    } catch (error) {
        logger.error('Error updating payment status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update payment status',
            error: error.message
        });
    }
};

// Cancel booking (soft delete)
const cancelBooking = async (req, res) => {
    try {
        const { id } = req.params;

        const query = `
      UPDATE bookings 
      SET booking_status = 'cancelled', deleted = TRUE 
      WHERE id = $1 AND deleted = FALSE 
      RETURNING *
    `;

        const result = await pool.query(query, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }

        logger.info(`Booking ${id} cancelled`);

        res.status(200).json({
            success: true,
            message: 'Booking cancelled successfully',
            data: result.rows[0]
        });
    } catch (error) {
        logger.error('Error cancelling booking:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to cancel booking',
            error: error.message
        });
    }
};

// Verify Razorpay Payment
const verifyPayment = async (req, res) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            booking_id
        } = req.body;

        const body = razorpay_order_id + "|" + razorpay_payment_id;

        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest("hex");

        const isAuthentic = expectedSignature === razorpay_signature;

        if (isAuthentic) {
            // Update booking as paid
            const query = `
                UPDATE bookings 
                SET payment_status = 'paid', 
                    transaction_id = $1,
                    payment_date = CURRENT_TIMESTAMP
                WHERE id = $2 OR transaction_id = $3
                RETURNING *
            `;
            const result = await pool.query(query, [razorpay_payment_id, booking_id, razorpay_order_id]);

            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Booking not found' });
            }

            logger.info(`Payment verified for booking ${booking_id || result.rows[0].id}`);

            res.status(200).json({
                success: true,
                message: 'Payment verified successfully',
                data: result.rows[0]
            });
        } else {
            logger.warn(`Invalid signature for payment verification: ${razorpay_order_id}`);
            res.status(400).json({
                success: false,
                message: 'Invalid payment signature'
            });
        }
    } catch (error) {
        logger.error('Error verifying payment:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to verify payment',
            error: error.message
        });
    }
};

module.exports = {
    createBooking,
    getBookingById,
    getAllBookings,
    getUserBookings,
    updateBookingStatus,
    updatePaymentStatus,
    cancelBooking,
    verifyPayment
};
