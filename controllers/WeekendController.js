const asyncHandler = require('express-async-handler');
const { executeQuery } = require("../config/db");
const path = require('path');
const fs = require('fs');

// @desc    Insert a new weekend trip
// @route   POST /WeekendTrip/insert
// @access  Public
const insertWeekendTrip = asyncHandler(async (req, res) => {
    const {
        title,
        duration,
        tours,
        price,
        difficulty,
        highlights,
        available_days,
        from_location,
        to_location,
        overview,
        things_to_carry,
        max_group_size,
        age_limit,
        status
    } = req.body;

    let file = req.file;
    if (!file && req.files) {
        file = (req.files.uploadimage && req.files.uploadimage[0]) ||
            (req.files.image && req.files.image[0]);
    }

    if (!title || !duration || !tours || !price || !difficulty || !highlights || !available_days || !file) {
        return res.status(400).json({
            success: false,
            message: "Required fields: title, duration, tours, price, difficulty, highlights, available_days, and an image file"
        });
    }

    try {
        const imageUrl = file.path;

        const query = `
      INSERT INTO weekendtrips (
        title,
        duration,
        uploadimage,
        tours,
        price,
        difficulty,
        highlights,
        available_days,
        from_location,
        to_location,
        overview,
        things_to_carry,
        max_group_size,
        age_limit,
        status,
        created_at,
        dateofmodification,
        deleted
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12, $13,
        $14, COALESCE($15, TRUE), NOW(), NOW(), B'0'
      )
      RETURNING *
    `;

        const params = [
            title,
            duration,
            imageUrl,
            parseInt(tours),
            price,
            difficulty,
            highlights,
            available_days,
            from_location || null,
            to_location || null,
            overview || null,
            things_to_carry || null,
            max_group_size ? parseInt(max_group_size) : null,
            age_limit || null,
            status !== undefined ? (status === 'true' || status === true) : true
        ];

        const result = await executeQuery(query, params);

        return res.status(201).json({
            success: true,
            message: "Weekend trip inserted successfully",
            data: result.rows[0]
        });
    } catch (error) {
        console.error("InsertWeekendTrip error:", error);
        return res.status(500).json({
            success: false,
            message: "Database error",
            error: error.message
        });
    }
});

// @desc    Get all weekend trips
// @route   GET /WeekendTrip/getAll
// @access  Public
const getWeekendTrips = asyncHandler(async (req, res) => {
    try {
        const { search, block } = req.query;

        let query = "SELECT * FROM weekendtrips WHERE deleted = B'0'";
        const params = [];
        let paramCount = 0;

        if (search) {
            paramCount++;
            query += ` AND (title ILIKE $${paramCount} OR highlights ILIKE $${paramCount})`;
            params.push(`%${search}%`);
        }

        query += " ORDER BY created_at DESC";

        const result = await executeQuery(query, params);

        const formattedData = result.rows.map(trip => ({
            ...trip,
            uploadimage: trip.uploadimage ? trip.uploadimage.replace(/\\/g, "/") : null
        }));

        res.status(200).json({
            success: true,
            count: formattedData.length,
            data: formattedData
        });
    } catch (error) {
        console.error("GetWeekendTrips error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch weekend trips.",
            error: error.message
        });
    }
});

// @desc    Get a single weekend trip by ID
// @route   GET /WeekendTrip/getById
// @access  Public
const getWeekendTripById = asyncHandler(async (req, res) => {
    try {
        const { id } = req.query;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "ID is required"
            });
        }

        const query = "SELECT * FROM weekendtrips WHERE id = $1 AND deleted = B'0'";
        const result = await executeQuery(query, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Weekend trip not found"
            });
        }

        const trip = {
            ...result.rows[0],
            uploadimage: result.rows[0].uploadimage ? result.rows[0].uploadimage.replace(/\\/g, "/") : null
        };

        res.status(200).json({
            success: true,
            data: trip
        });
    } catch (error) {
        console.error("GetWeekendTripById error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch weekend trip",
            error: error.message
        });
    }
});

// @desc    Update a weekend trip
// @route   PUT /WeekendTrip/update
// @access  Public
const updateWeekendTrip = asyncHandler(async (req, res) => {
    const {
        id,
        title,
        duration,
        tours,
        price,
        difficulty,
        highlights,
        available_days,
        from_location,
        to_location,
        overview,
        things_to_carry,
        max_group_size,
        age_limit,
        status
    } = req.body;

    let file = req.file;
    if (!file && req.files) {
        file = (req.files.uploadimage && req.files.uploadimage[0]) ||
            (req.files.image && req.files.image[0]);
    }

    if (!id) {
        return res.status(400).json({
            success: false,
            message: "ID is required"
        });
    }

    try {
        // Check if trip exists
        const checkTrip = await executeQuery(
            "SELECT * FROM weekendtrips WHERE id = $1 AND deleted = B'0'",
            [id]
        );

        if (checkTrip.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Weekend trip not found"
            });
        }

        const updateFields = [];
        const params = [];
        let paramCount = 0;

        const fields = {
            title, duration, tours, price, difficulty, highlights, available_days,
            from_location, to_location, overview, things_to_carry, max_group_size, age_limit, status
        };

        Object.entries(fields).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                paramCount++;
                if (key === 'tours' || key === 'max_group_size') {
                    params.push(parseInt(value));
                } else if (key === 'status') {
                    params.push(value === 'true' || value === true);
                } else {
                    params.push(value);
                }
                updateFields.push(`${key} = $${paramCount}`);
            }
        });

        let imagePath = null;
        if (file) {
            paramCount++;
            updateFields.push(`uploadimage = $${paramCount}`);
            params.push(file.path);
            imagePath = file.path;
        }

        if (updateFields.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No fields provided for update"
            });
        }

        // Always update dateofmodification
        updateFields.push(`dateofmodification = NOW()`);
        updateFields.push(`updated_at = NOW()`);

        paramCount++;
        params.push(id);

        const query = `
      UPDATE weekendtrips
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount} AND deleted = B'0'
      RETURNING *
    `;

        const result = await executeQuery(query, params);

        res.status(200).json({
            success: true,
            message: "Weekend trip updated successfully",
            data: result.rows[0]
        });
    } catch (error) {
        console.error("UpdateWeekendTrip error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update weekend trip",
            error: error.message
        });
    }
});

// @desc    Delete a weekend trip (Soft delete)
// @route   DELETE /WeekendTrip/deleteById
// @access  Public
const deleteWeekendTrip = asyncHandler(async (req, res) => {
    try {
        const { id } = req.body;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "ID is required"
            });
        }

        const query = `
      UPDATE weekendtrips
      SET deleted = B'1', dateofmodification = NOW()
      WHERE id = $1 AND deleted = B'0'
      RETURNING *
    `;

        const result = await executeQuery(query, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Weekend trip not found or already deleted"
            });
        }

        // Cascading Soft delete for itineraries
        const deleteItinQuery = `
          UPDATE itineraries
          SET deleted = 1,
              dateofmodification = NOW()
          WHERE trip_id = $1
        `;
        await executeQuery(deleteItinQuery, [id]);

        // Cascading Soft delete for galleries
        const deleteGalleryQuery = `
          UPDATE galleries
          SET deleted = 1
          WHERE trip_id = $1
        `;
        await executeQuery(deleteGalleryQuery, [id]);

        res.status(200).json({
            success: true,
            message: "Weekend trip and associated data deleted successfully",
            data: result.rows[0]
        });
    } catch (error) {
        console.error("DeleteWeekendTrip error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to delete weekend trip",
            error: error.message
        });
    }
});

module.exports = {
    insertWeekendTrip,
    getWeekendTrips,
    getWeekendTripById,
    updateWeekendTrip,
    deleteWeekendTrip
};
