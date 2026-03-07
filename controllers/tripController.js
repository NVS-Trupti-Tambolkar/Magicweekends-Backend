const asyncHandler = require('express-async-handler');
const { executeQuery } = require("../config/db");
const cloudinary = require('../config/cloudinary');

/* =========================================================
   Helper → extract Cloudinary public_id
   ========================================================= */
const getPublicId = (url) => {
  try {
    if (!url) return null;
    const parts = url.split('/');
    const fileName = parts.pop().split('.')[0];
    const folder = parts.slice(parts.indexOf('upload') + 1).join('/');
    return `${folder}/${fileName}`;
  } catch {
    return null;
  }
};

/* =========================================================
   Helper → save departure dates
   ========================================================= */
const saveDepartureDates = async (tripId, tripType, dates) => {
  if (!dates) return;
  
  // dates can be an array or a comma-separated string
  let dateArray = [];
  if (Array.isArray(dates)) {
    dateArray = dates;
  } else if (typeof dates === 'string') {
    dateArray = dates.split(',').map(d => d.trim()).filter(d => d !== '');
  }

  if (dateArray.length === 0) return;

  // Delete existing ones first (for update)
  await executeQuery(
    "DELETE FROM trip_departure_dates WHERE trip_id=$1 AND trip_type=$2",
    [tripId, tripType]
  );

  // Insert new ones
  for (const date of dateArray) {
    await executeQuery(
      "INSERT INTO trip_departure_dates (trip_id, trip_type, departure_date) VALUES ($1, $2, $3)",
      [tripId, tripType, date]
    );
  }
};

/* =========================================================
   INSERT TRIP
   ========================================================= */
const insertTripDirect = asyncHandler(async (req, res) => {
  const {
    title,
    duration,
    tours,
    price,
    difficulty,
    highlights,
    from_location,
    to_location,
    overview,
    things_to_carry,
    max_group_size,
    age_limit,
    status,
    trip_date,
    departure_dates
  } = req.body;

  const file = req.file || (req.files?.uploadimage?.[0] || req.files?.image?.[0]);

  if (!title || !duration || !tours || !price || !difficulty || !highlights || !file) {
    return res.status(400).json({
      success: false,
      message: "All required fields including image are mandatory"
    });
  }

  const imageUrl = file.path || file.secure_url || '';   // ✔ Robust Cloudinary URL extraction

  const result = await executeQuery(
    `INSERT INTO trips (
        title,duration,uploadimage,tours,price,difficulty,highlights,
        from_location,to_location,overview,things_to_carry,
        max_group_size,age_limit,status,trip_date,created_at,dateofmodification,deleted
     ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,
        $8,$9,$10,$11,$12,$13,$14,$15,NOW(),NOW(),B'0'
     ) RETURNING *`,
    [
      title,
      duration,
      imageUrl,
      parseInt(tours),
      price,
      difficulty,
      highlights,
      from_location || null,
      to_location || null,
      overview || null,
      things_to_carry || null,
      max_group_size ? parseInt(max_group_size) : null,
      age_limit || null,
      (status === "true" || status === true),
      trip_date || null
    ]
  );

  const newTrip = result.rows[0];

  // Save multiple departure dates if provided
  if (departure_dates) {
    await saveDepartureDates(newTrip.id, 'normal', departure_dates);
  }

  res.status(201).json({
    success: true,
    message: "Trip inserted successfully",
    data: newTrip
  });
});

/* =========================================================
   GET ALL TRIPS
   ========================================================= */
const getTrips = asyncHandler(async (req, res) => {
  const { search, difficulty, minPrice, maxPrice } = req.query;

  let query = "SELECT * FROM trips WHERE deleted = B'0' AND (trip_date IS NULL OR trip_date >= CURRENT_DATE)";
  const params = [];
  let count = 0;

  if (search) {
    count++;
    query += ` AND (title ILIKE $${count} OR highlights ILIKE $${count})`;
    params.push(`%${search}%`);
  }

  if (difficulty) {
    count++;
    query += ` AND difficulty = $${count}`;
    params.push(difficulty);
  }

  if (minPrice) {
    count++;
    query += ` AND REPLACE(price,'₹','')::NUMERIC >= $${count}`;
    params.push(minPrice);
  }

  if (maxPrice) {
    count++;
    query += ` AND REPLACE(price,'₹','')::NUMERIC <= $${count}`;
    params.push(maxPrice);
  }

  query += " ORDER BY created_at DESC";

  const result = await executeQuery(query, params);
  const trips = result.rows;

  // Add departure dates for each trip
  for (const trip of trips) {
    const dateResult = await executeQuery(
      "SELECT departure_date FROM trip_departure_dates WHERE trip_id = $1 AND trip_type = 'normal' ORDER BY departure_date ASC",
      [trip.id]
    );
    trip.departure_dates = dateResult.rows.map(r => r.departure_date);
  }

  res.json({
    success: true,
    count: trips.length,
    data: trips
  });
});

/* =========================================================
   GET TRIP BY ID
   ========================================================= */
const getTripById = asyncHandler(async (req, res) => {
  const { id } = req.query;

  const result = await executeQuery(
    "SELECT * FROM trips WHERE id=$1 AND deleted=B'0'",
    [id]
  );

  if (!result.rows.length)
    return res.status(404).json({ success:false, message:"Trip not found" });

  const trip = result.rows[0];

  // Fetch departure dates
  const datesResult = await executeQuery(
    "SELECT departure_date FROM trip_departure_dates WHERE trip_id=$1 AND trip_type='normal' ORDER BY departure_date ASC",
    [id]
  );
  trip.departure_dates = datesResult.rows.map(r => r.departure_date);

  res.json({ success:true, data: trip });
});

/* =========================================================
   UPDATE TRIP
   ========================================================= */
const updateTrip = asyncHandler(async (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).json({ success:false, message:"Trip ID required" });

  const existing = await executeQuery(
    "SELECT * FROM trips WHERE id=$1 AND deleted=B'0'",
    [id]
  );

  if (!existing.rows.length)
    return res.status(404).json({ success:false, message:"Trip not found" });

  const oldTrip = existing.rows[0];

  let imageUrl = oldTrip.uploadimage;

  const file = req.file || (req.files?.uploadimage?.[0] || req.files?.image?.[0]);

  // Replace image if new uploaded
  if (file) {
    const publicId = getPublicId(oldTrip.uploadimage);
    if (publicId) {
      try { await cloudinary.uploader.destroy(publicId); }
      catch(e){ console.log("Cloudinary delete failed:", e.message); }
    }

    imageUrl = file.path || file.secure_url;
  }

  const result = await executeQuery(
    `UPDATE trips SET
      title=COALESCE($1,title),
      duration=COALESCE($2,duration),
      tours=COALESCE($3,tours),
      price=COALESCE($4,price),
      difficulty=COALESCE($5,difficulty),
      highlights=COALESCE($6,highlights),
      from_location=COALESCE($7,from_location),
      to_location=COALESCE($8,to_location),
      overview=COALESCE($9,overview),
      things_to_carry=COALESCE($10,things_to_carry),
      max_group_size=COALESCE($11,max_group_size),
      age_limit=COALESCE($12,age_limit),
      status=COALESCE($13,status),
      uploadimage=COALESCE($14,uploadimage),
      trip_date=COALESCE($15,trip_date),
      dateofmodification=NOW()
     WHERE id=$16 RETURNING *`,
    [
      req.body.title,
      req.body.duration,
      req.body.tours,
      req.body.price,
      req.body.difficulty,
      req.body.highlights,
      req.body.from_location,
      req.body.to_location,
      req.body.overview,
      req.body.things_to_carry,
      req.body.max_group_size,
      req.body.age_limit,
      req.body.status,
      imageUrl,
      req.body.trip_date,
      id
    ]
  );

  // Update departure dates if provided
  if (req.body.departure_dates) {
    await saveDepartureDates(id, 'normal', req.body.departure_dates);
  }

  res.json({ success:true, message:"Trip updated successfully", data:result.rows[0] });
});

/* =========================================================
   DELETE TRIP
   ========================================================= */
const deleteTrip = asyncHandler(async (req, res) => {
  const { id } = req.body;

  const existing = await executeQuery(
    "SELECT uploadimage FROM trips WHERE id=$1",
    [id]
  );

  if (existing.rows.length) {
    const publicId = getPublicId(existing.rows[0].uploadimage);
    if (publicId) {
      try { await cloudinary.uploader.destroy(publicId); }
      catch(e){ console.log("Cloudinary delete failed:", e.message); }
    }
  }

  const result = await executeQuery(
    `UPDATE trips SET deleted=B'1',dateofmodification=NOW()
     WHERE id=$1 RETURNING *`,
    [id]
  );

  res.json({ success:true, message:"Trip deleted successfully", data:result.rows[0] });
});

module.exports = {
  insertTripDirect,
  getTrips,
  getTripById,
  updateTrip,
  deleteTrip
};