const asyncHandler = require('express-async-handler');
const { pool } = require('../config/db');

/* =========================================================
   INSERT ITINERARIES (BULK + TRANSACTION SAFE)
   ========================================================= */
const insertItineraries = asyncHandler(async (req, res) => {
  const { trip_id, itineraries, trip_type = 'normal' } = req.body;

  if (!trip_id)
    return res.status(400).json({ success:false, message:"trip_id required" });

  if (!Array.isArray(itineraries) || itineraries.length === 0)
    return res.status(400).json({ success:false, message:"itineraries required" });

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // verify trip exists
    const tableName = trip_type === 'weekend' ? 'weekendtrips' : 'trips';
    const tripCheck = await client.query(
      `SELECT id FROM ${tableName} WHERE id=$1 AND deleted=B'0'`,
      [trip_id]
    );

    if (!tripCheck.rows.length)
      throw new Error("Trip does not exist");

    // remove old itineraries if not in append mode
    if (!req.body.append) {
      await client.query(
        `UPDATE itineraries
         SET deleted=1, dateofmodification=NOW()
         WHERE trip_id=$1 AND trip_type=$2`,
        [trip_id, trip_type]
      );
    }

    // bulk insert
    const values = [];
    const placeholders = [];

    itineraries.forEach((it, index) => {
      const base = index * 9;

      placeholders.push(`(
        $${base+1}, $${base+2}, $${base+3}, $${base+4},
        $${base+5}, $${base+6}, $${base+7},
        NOW(), NOW(), 0, $${base+8}
      )`);

      values.push(
        trip_id,
        parseInt(it.day_number),
        it.day_title || null,
        it.description || null,
        it.meals || null,
        it.accommodation || null,
        it.activities || null,
        trip_type
      );
    });

    await client.query(
      `INSERT INTO itineraries
      (trip_id,day_number,day_title,description,meals,accommodation,activities,created_at,dateofmodification,deleted,trip_type)
      VALUES ${placeholders.join(',')}`,
      values
    );

    await client.query('COMMIT');

    res.status(201).json({
      success:true,
      message:`${itineraries.length} itineraries saved`
    });

  } catch(err) {
    await client.query('ROLLBACK');
    console.error("InsertItineraries:", err);
    res.status(500).json({ success:false, message:err.message });
  } finally {
    client.release();
  }
});

/* =========================================================
   GET ITINERARIES BY TRIP
   ========================================================= */
const getItinerariesByTrip = asyncHandler(async (req, res) => {
  const { trip_id, type='normal' } = req.query;

  if (!trip_id)
    return res.status(400).json({ success:false, message:"trip_id required" });

  const result = await pool.query(
    `SELECT id AS itinerary_id,
            day_number,
            day_title,
            description,
            meals,
            accommodation,
            activities
     FROM itineraries
     WHERE trip_id=$1
       AND trip_type=$2
       AND deleted=0
     ORDER BY day_number`,
    [trip_id, type]
  );

  res.json({ success:true, data:result.rows });
});

/* =========================================================
   UPDATE SINGLE ITINERARY
   ========================================================= */
const updateItinerary = asyncHandler(async (req, res) => {
  const { itinerary_id, ...fields } = req.body;

  if (!itinerary_id)
    return res.status(400).json({ success:false, message:"itinerary_id required" });

  const result = await pool.query(
    `UPDATE itineraries SET
        day_number=COALESCE($1,day_number),
        day_title=COALESCE($2,day_title),
        description=COALESCE($3,description),
        meals=COALESCE($4,meals),
        accommodation=COALESCE($5,accommodation),
        activities=COALESCE($6,activities),
        dateofmodification=NOW()
     WHERE id=$7 AND deleted=0
     RETURNING *`,
    [
      fields.day_number,
      fields.day_title,
      fields.description,
      fields.meals,
      fields.accommodation,
      fields.activities,
      itinerary_id
    ]
  );

  if (!result.rows.length)
    return res.status(404).json({ success:false, message:"Not found" });

  res.json({ success:true, data:result.rows[0] });
});

/* =========================================================
   DELETE SINGLE ITINERARY
   ========================================================= */
const deleteItinerary = asyncHandler(async (req, res) => {
  const { itinerary_id } = req.query;

  await pool.query(
    `UPDATE itineraries
     SET deleted=1, dateofmodification=NOW()
     WHERE id=$1`,
    [itinerary_id]
  );

  res.json({ success:true, message:"Itinerary deleted" });
});

/* =========================================================
   DELETE BY TRIP
   ========================================================= */
const deleteItinerariesByTrip = asyncHandler(async (req, res) => {
  const { trip_id, trip_type='normal' } = req.query;

  await pool.query(
    `UPDATE itineraries
     SET deleted=1, dateofmodification=NOW()
     WHERE trip_id=$1 AND trip_type=$2`,
    [trip_id, trip_type]
  );

  res.json({ success:true, message:"All itineraries removed" });
});

module.exports = {
  insertItineraries,
  getItinerariesByTrip,
  updateItinerary,
  deleteItinerary,
  deleteItinerariesByTrip
};