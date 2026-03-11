const { pool } = require('../config/db');
const logger = require('../utils/logger');
const razorpay = require('../config/razorpay');
const crypto = require('crypto');


/* =========================================================
   CREATE BOOKING
   ========================================================= */
const createBooking = async (req,res)=>{
 const client = await pool.connect();
 try{

  let {
   trip_id, trip_type, full_name, email, phone,
   travel_date, number_of_people, price_per_person,
   total_amount, payment_method, travelers_data, special_request
  } = req.body;

  logger.info(`Creating booking for ${full_name} - Trip: ${trip_id}`);

  // Check for Razorpay credentials
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    logger.error('CRITICAL: Razorpay API keys are missing in environment variables.');
    return res.status(500).json({
      success: false,
      message: "Payment gateway is not configured on the server. Please contact site administrator.",
      error: "Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET"
    });
  }

  logger.info(`Type of travelers_data: ${typeof travelers_data}`);
  logger.info(`Content of travelers_data: ${JSON.stringify(travelers_data)}`);
  logger.info(`total_amount received: ${total_amount}, type: ${typeof total_amount}`);

  // Validate that total_amount is a real positive number
  const parsedAmount = parseFloat(total_amount);
  if (!parsedAmount || isNaN(parsedAmount) || parsedAmount <= 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid booking amount. Please check the trip price and try again.",
      error: `Received total_amount: ${total_amount}`
    });
  }
  total_amount = parsedAmount;

  // Fix: Strictly stringify travelers_data to valid JSON string for JSONB column
  // This prevents the pg-driver from misformatting JS arrays as Postgres arrays {}
  let travelersDataJSON = '[]';
  try {
    if (travelers_data) {
      travelersDataJSON = typeof travelers_data === 'string' 
        ? JSON.stringify(JSON.parse(travelers_data)) // Standardize string
        : JSON.stringify(travelers_data);          // Stringify object/array
    }
  } catch (e) {
    logger.error('Error formatting travelers_data:', e);
    travelersDataJSON = '[]';
  }


  await client.query('BEGIN');

  const bookingResult = await client.query(
  `INSERT INTO bookings
   (trip_id,trip_type,full_name,email,phone,travel_date,
    number_of_people,price_per_person,total_amount,payment_method,
    travelers_data,special_request,booking_status,payment_status)
   VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12,'pending','pending')
   RETURNING *`,
   [
    trip_id, trip_type, full_name, email, phone, travel_date,
    number_of_people,
    price_per_person || (total_amount/number_of_people),
    total_amount,
    payment_method || null,
    travelersDataJSON,
    special_request || null
   ]);

  const booking = bookingResult.rows[0];

  // razorpay order (1% token, minimum ₹1 = 100 paise)
  const tokenAmount = Math.max(1, Math.round(total_amount * 0.01));

  const order = await razorpay.orders.create({
   amount: tokenAmount * 100, // paise — Math.max ensures >= 100 paise (₹1 min)
   currency:"INR",
   receipt:`booking_${booking.id}`
  });

  await client.query(
   `UPDATE bookings SET transaction_id=$1 WHERE id=$2`,
   [order.id, booking.id]
  );

  await client.query('COMMIT');

  res.json({
   success:true,
   data:{
    booking_id: booking.id,
    razorpay_order_id: order.id,
    razorpay_key_id: process.env.RAZORPAY_KEY_ID,
    amount: tokenAmount
   }
  });

  } catch (e) {
    await client.query('ROLLBACK');
    logger.error('Error in createBooking:', e);
    
    // Better explanation for common errors
    let errorMsg = "Booking failed";
    if (e.message && e.message.includes('payment_method_enum')) {
      errorMsg = "Invalid payment method. Only 'paytm', 'gpay', 'bank_transfer', and 'cash' are supported.";
    }

    res.status(500).json({ 
      success: false, 
      message: errorMsg, 
      error: process.env.NODE_ENV === 'development' ? e.message : "Internal Server Error"
    });
  } finally {
    client.release();
  }
};



/* =========================================================
   VERIFY PAYMENT (ONLY PLACE THAT SETS PAID)
   ========================================================= */
const verifyPayment = async (req,res)=>{
 try{

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, booking_id } = req.body;

  if (!process.env.RAZORPAY_KEY_SECRET) {
    logger.error('CRITICAL: RAZORPAY_KEY_SECRET missing during verification.');
    return res.status(500).json({
      success: false,
      message: "Payment verification failed due to server configuration error.",
      error: "Missing RAZORPAY_KEY_SECRET"
    });
  }

  const expected = crypto
    .createHmac("sha256",process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if(expected !== razorpay_signature)
    return res.status(400).json({success:false,message:"Invalid signature"});

  const result = await pool.query(
  `UPDATE bookings
   SET payment_status='paid',
       booking_status='confirmed',
       transaction_id=$1,
       payment_date=CURRENT_TIMESTAMP
   WHERE id=$2 AND transaction_id=$3
   RETURNING *`,
   [razorpay_payment_id, booking_id, razorpay_order_id]);

  if(!result.rows.length)
    return res.status(404).json({success:false,message:"Booking not found"});

  res.json({success:true,data:result.rows[0]});

  } catch (e) {
    logger.error('Error in verifyPayment:', e);
    res.status(500).json({ success: false, message: "Verification failed", error: e.message });
  }
};



/* =========================================================
   GET SINGLE BOOKING
   ========================================================= */
const getBookingById = async (req,res)=>{
 const r = await pool.query(`SELECT * FROM bookings WHERE id=$1 AND deleted=FALSE`,[req.params.id]);
 if(!r.rows.length) return res.status(404).json({success:false});
 res.json({success:true,data:r.rows[0]});
};



/* =========================================================
   ADMIN: GET ALL BOOKINGS
   ========================================================= */
const getAllBookings = async (req,res)=>{
 const {limit=50,offset=0} = req.query;
 const r = await pool.query(
  `SELECT * FROM bookings
   WHERE deleted=FALSE
   ORDER BY created_at DESC
   LIMIT $1 OFFSET $2`,
  [limit,offset]
 );
 res.json({success:true,data:r.rows});
};



/* =========================================================
   USER BOOKINGS
   ========================================================= */
const getUserBookings = async (req,res)=>{
 const r = await pool.query(
  `SELECT * FROM bookings WHERE email=$1 AND deleted=FALSE ORDER BY created_at DESC`,
  [req.params.email]
 );
 res.json({success:true,data:r.rows});
};



/* =========================================================
   ADMIN: UPDATE BOOKING STATUS (NOT PAYMENT)
   ========================================================= */
const updateBookingStatus = async (req,res)=>{
 const {booking_status} = req.body;

 // Prevent illegal state change
 if(booking_status==='confirmed')
  return res.status(400).json({success:false,message:"Use payment verification to confirm booking"});

 const r = await pool.query(
  `UPDATE bookings SET booking_status=$1 WHERE id=$2 RETURNING *`,
  [booking_status,req.params.id]
 );

 res.json({success:true,data:r.rows[0]});
};



/* =========================================================
   PAYMENT STATUS VIEW ONLY (ADMIN CANNOT SET PAID)
   ========================================================= */
const updatePaymentStatus = async (req,res)=>{
 return res.status(403).json({
  success:false,
  message:"Payment status can only be changed by Razorpay verification"
 });
};



/* =========================================================
   CANCEL BOOKING
   ========================================================= */
const cancelBooking = async (req,res)=>{
 const r = await pool.query(
  `UPDATE bookings SET booking_status='cancelled',deleted=TRUE WHERE id=$1 RETURNING *`,
  [req.params.id]
 );
 res.json({success:true,data:r.rows[0]});
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