const asyncHandler = require('express-async-handler');
const { executeQuery } = require('../config/db');

const insertItineraries = asyncHandler(async (req, res) => {
  const { trip_id, itineraries } = req.body;

  // Validation
  if (!trip_id) {
    return res.status(400).json({
      success: false,
      message: "Trip ID is required"
    });
  }

  if (!Array.isArray(itineraries) || itineraries.length === 0) {
    return res.status(400).json({
      success: false,
      message: "At least one itinerary entry is required"
    });
  }

  try {
    const insertedRows = [];

    for (const item of itineraries) {
      const {
        day_number,
        day_title,
        description,
        meals,
        accommodation,
        activities,
        deleted = false // default to false if not provided
      } = item;

      if (!day_number) {
        return res.status(400).json({
          success: false,
          message: "day_number is required for each itinerary entry"
        });
      }

      const query = `
        INSERT INTO itineraries (
          trip_id,
          day_number,
          day_title,
          description,
          meals,
          accommodation,
          activities,
          created_at,
          dateofmodification,
          deleted
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW(), $8)
        RETURNING *
      `;

      const params = [
        parseInt(trip_id),
        parseInt(day_number),
        day_title || null,
        description || null,
        meals || null,
        accommodation || null,
        activities || null,
        deleted // boolean
      ];

      const result = await executeQuery(query, params);
      insertedRows.push(result.rows[0]);
    }

    return res.status(201).json({
      success: true,
      message: `${insertedRows.length} itinerary entries inserted successfully`,
      data: insertedRows
    });

  } catch (error) {
    console.error("InsertItineraries error:", error);
    return res.status(500).json({
      success: false,
      message: "Database error",
      error: error.message
    });
  }
});

const getItinerariesByTrip = asyncHandler(async (req, res) => {
  const { trip_id, type = 'normal' } = req.query;

  if (!trip_id) {
    return res.status(400).json({
      success: false,
      message: "trip_id is required"
    });
  }

  try {
    const tableName = type === 'weekend' ? 'weekendtrips' : 'trips';

    const query = `
  SELECT 
    t.id AS trip_id,
    t.title,
    i.id AS itinerary_id,
    i.day_number,
    i.day_title,
    i.description,
    i.meals,
    i.accommodation,
    i.activities,
    i.deleted,
    i.dateofmodification
  FROM ${tableName} t
  LEFT JOIN itineraries i ON t.id = i.trip_id
  WHERE t.id = $1
    AND (i.deleted = 0 OR i.deleted IS NULL)
  ORDER BY i.day_number
`;

    const result = await executeQuery(query, [parseInt(trip_id)]);

    return res.status(200).json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error("GetItinerariesByTrip error:", error);
    return res.status(500).json({
      success: false,
      message: "Database error",
      error: error.message
    });
  }
});

const updateItinerary = asyncHandler(async (req, res) => {
  const {
    itinerary_id, // now coming from the body
    day_number,
    day_title,
    description,
    meals,
    accommodation,
    activities,
    deleted
  } = req.body;

  if (!itinerary_id) {
    return res.status(400).json({
      success: false,
      message: "itinerary_id is required in the body"
    });
  }

  try {
    const query = `
      UPDATE itineraries
      SET
        day_number = COALESCE($1, day_number),
        day_title = COALESCE($2, day_title),
        description = COALESCE($3, description),
        meals = COALESCE($4, meals),
        accommodation = COALESCE($5, accommodation),
        activities = COALESCE($6, activities),
        deleted = COALESCE($7, deleted),
        dateofmodification = NOW()
      WHERE id = $8
      RETURNING *
    `;

    const params = [
      day_number ?? null,
      day_title ?? null,
      description ?? null,
      meals ?? null,
      accommodation ?? null,
      activities ?? null,
      deleted ?? null,
      parseInt(itinerary_id)
    ];

    const result = await executeQuery(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Itinerary not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Itinerary updated successfully",
      data: result.rows[0]
    });

  } catch (error) {
    console.error("UpdateItinerary error:", error);
    return res.status(500).json({
      success: false,
      message: "Database error",
      error: error.message
    });
  }
});

const deleteItinerary = asyncHandler(async (req, res) => {
  const { itinerary_id } = req.query;

  if (!itinerary_id) {
    return res.status(400).json({
      success: false,
      message: "itinerary_id is required"
    });
  }

  try {
    const query = `
      UPDATE itineraries
      SET deleted = 1,
          dateofmodification = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const result = await executeQuery(query, [parseInt(itinerary_id)]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Itinerary not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Itinerary deleted successfully",
      data: result.rows[0]
    });

  } catch (error) {
    console.error("DeleteItinerary error:", error);
    return res.status(500).json({
      success: false,
      message: "Database error",
      error: error.message
    });
  }
});

const deleteItinerariesByTrip = asyncHandler(async (req, res) => {
  const { trip_id } = req.query;

  if (!trip_id) {
    return res.status(400).json({
      success: false,
      message: "trip_id is required"
    });
  }

  try {
    const query = `
      UPDATE itineraries
      SET deleted = 1,
          dateofmodification = NOW()
      WHERE trip_id = $1
    `;

    const result = await executeQuery(query, [parseInt(trip_id)]);

    return res.status(200).json({
      success: true,
      message: `Deleted ${result.rowCount} itineraries for trip ${trip_id}`
    });

  } catch (error) {
    console.error("DeleteItinerariesByTrip error:", error);
    return res.status(500).json({
      success: false,
      message: "Database error",
      error: error.message
    });
  }
});




module.exports = {
  insertItineraries,
  getItinerariesByTrip,
  updateItinerary,
  deleteItinerary,
  deleteItinerariesByTrip
};
