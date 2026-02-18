const asyncHandler = require('express-async-handler');
const { executeStoredProcedureWithParams } = require('../config/db');
const { executeQuery } = require("../config/db");
const path = require('path');
const fs = require('fs');
const fsPromises = require("fs/promises");



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
    status
  } = req.body;

  let file = req.file;
  if (!file && req.files) {
    file = (req.files.uploadimage && req.files.uploadimage[0]) ||
      (req.files.image && req.files.image[0]);
  }

  if (!title || !duration || !tours || !price || !difficulty || !highlights || !file) {
    return res.status(400).json({
      success: false,
      message: "Title, duration, tours, price, difficulty, highlights, and image file are required"
    });
  }

  try {
    const filePath = file.path.replace(/\\/g, '/');
    const relativePath = path.relative(path.join(__dirname, '..'), filePath);

    const query = `
      INSERT INTO trips (
        title,
        duration,
        uploadimage,
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
        created_at,
        dateofmodification,
        deleted
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12, $13,
        COALESCE($14, TRUE), NOW(), NOW(), B'0'
      )
      RETURNING *
    `;

    const params = [
      title,
      duration,
      relativePath,
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
      status !== undefined ? status : true
    ];

    const result = await executeQuery(query, params);

    return res.status(201).json({
      success: true,
      message: "Trip inserted successfully",
      data: result.rows[0]  // imageUrl removed
    });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({
      success: false,
      message: "Database error",
      error: error.message
    });
  }
});

const getTrips = asyncHandler(async (req, res) => {
  try {
    const { executeQuery } = require('../config/db');

    const { search, difficulty, minPrice, maxPrice } = req.query;

    let query = "SELECT * FROM trips WHERE deleted = B'0'";
    const params = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      query += ` AND (title ILIKE $${paramCount} OR highlights ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    if (difficulty) {
      paramCount++;
      query += ` AND difficulty = $${paramCount}`;
      params.push(difficulty);
    }

    if (minPrice) {
      paramCount++;
      query += ` AND REPLACE(price, '₹', '')::NUMERIC >= $${paramCount}`;
      params.push(minPrice);
    }

    if (maxPrice) {
      paramCount++;
      query += ` AND REPLACE(price, '₹', '')::NUMERIC <= $${paramCount}`;
      params.push(maxPrice);
    }

    query += " ORDER BY created_at DESC";

    const result = await executeQuery(query, params);

    // 🔹 Normalize uploadimage path
    const formattedData = result.rows.map(trip => ({
      ...trip,
      uploadimage: trip.uploadimage
        ? trip.uploadimage.replace(/\\/g, "/")
        : null
    }));

    res.status(200).json({
      success: true,
      count: formattedData.length,
      data: formattedData
    });
  } catch (error) {
    console.error("GetTrips error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch trips.",
      error: error.message
    });
  }
});

const updateTrip = asyncHandler(async (req, res) => {
  const {
    id,
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
      message: "Trip ID is required in form-data"
    });
  }

  if (
    !title && !duration && !tours && !price && !difficulty && !highlights &&
    !from_location && !to_location && !overview && !things_to_carry &&
    !max_group_size && !age_limit && status === undefined && !file
  ) {
    return res.status(400).json({
      success: false,
      message: "At least one field is required for update"
    });
  }

  try {
    const { executeQuery } = require('../config/db');

    // Check if trip exists and not deleted
    const checkTrip = await executeQuery(
      "SELECT * FROM trips WHERE id = $1 AND deleted = B'0'",
      [id]
    );

    if (checkTrip.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Trip not found or has been deleted"
      });
    }

    const updateFields = [];
    const params = [];
    let paramCount = 0;

    if (title && title.trim() !== '') {
      paramCount++;
      updateFields.push(`title = $${paramCount}`);
      params.push(title);
    }
    if (duration && duration.trim() !== '') {
      paramCount++;
      updateFields.push(`duration = $${paramCount}`);
      params.push(duration);
    }
    if (tours !== undefined && tours !== '' && !isNaN(tours)) {
      paramCount++;
      updateFields.push(`tours = $${paramCount}`);
      params.push(parseInt(tours));
    }
    if (price && price.trim() !== '') {
      paramCount++;
      updateFields.push(`price = $${paramCount}`);
      params.push(price);
    }
    if (difficulty && difficulty.trim() !== '') {
      paramCount++;
      updateFields.push(`difficulty = $${paramCount}`);
      params.push(difficulty);
    }
    if (highlights && highlights.trim() !== '') {
      paramCount++;
      updateFields.push(`highlights = $${paramCount}`);
      params.push(highlights);
    }
    if (from_location && from_location.trim() !== '') {
      paramCount++;
      updateFields.push(`from_location = $${paramCount}`);
      params.push(from_location);
    }
    if (to_location && to_location.trim() !== '') {
      paramCount++;
      updateFields.push(`to_location = $${paramCount}`);
      params.push(to_location);
    }
    if (overview && overview.trim() !== '') {
      paramCount++;
      updateFields.push(`overview = $${paramCount}`);
      params.push(overview);
    }
    if (things_to_carry && things_to_carry.trim() !== '') {
      paramCount++;
      updateFields.push(`things_to_carry = $${paramCount}`);
      params.push(things_to_carry);
    }
    if (max_group_size !== undefined && max_group_size !== '' && !isNaN(max_group_size)) {
      paramCount++;
      updateFields.push(`max_group_size = $${paramCount}`);
      params.push(parseInt(max_group_size));
    }
    if (age_limit && age_limit.trim() !== '') {
      paramCount++;
      updateFields.push(`age_limit = $${paramCount}`);
      params.push(age_limit);
    }
    if (status !== undefined) {
      paramCount++;
      updateFields.push(`status = $${paramCount}`);
      params.push(status === 'true' || status === true);
    }

    let imagePath = null;
    if (file) {
      const filePath = file.path.replace(/\\/g, '/');
      const relativePath = path.relative(path.join(__dirname, '../'), filePath);

      paramCount++;
      updateFields.push(`uploadimage = $${paramCount}`);
      params.push(relativePath);

      imagePath = relativePath;
    }

    // Always update dateofmodification
    updateFields.push(`dateofmodification = NOW()`);

    paramCount++;
    params.push(id);

    if (updateFields.length <= 1) { // Only dateofmodification
      return res.status(400).json({
        success: false,
        message: "No valid fields provided for update"
      });
    }

    const query = `
      UPDATE trips
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount} AND deleted = B'0'
      RETURNING *
    `;

    const result = await executeQuery(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Failed to update trip - no rows affected"
      });
    }

    const response = {
      success: true,
      message: "Trip updated successfully",
      data: result.rows[0]
    };

    if (imagePath) {
      response.imageUrl = `/uploads/TripImages/${path.basename(file.path)}`;

      // Delete old image if exists and different
      const oldImage = checkTrip.rows[0].uploadimage;
      if (oldImage && oldImage !== imagePath) {
        const oldImagePath = path.join(__dirname, '../', oldImage);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
          console.log(`Deleted old image: ${oldImage}`);
        }
      }
    }

    return res.status(200).json(response);

  } catch (error) {
    console.error("UpdateTrip error:", error);

    if (file && file.path && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update trip",
      error: error.message
    });
  }
});

const getTripById = asyncHandler(async (req, res) => {
  try {
    const { executeQuery } = require("../config/db");
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Trip ID is required",
      });
    }

    const query = `
      SELECT *
      FROM trips
      WHERE id = $1
        AND deleted = B'0'
    `;

    const result = await executeQuery(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    const trip = {
      ...result.rows[0],
      uploadimage: result.rows[0].uploadimage
        ? result.rows[0].uploadimage.replace(/\\/g, "/")
        : null,
    };

    res.status(200).json({
      success: true,
      message: "Trip fetched successfully",
      data: trip,
    });
  } catch (error) {
    console.error("GetTripById error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch trip.",
      error: error.message,
    });
  }
});

const deleteTrip = asyncHandler(async (req, res) => {
  try {
    const { executeQuery } = require('../config/db');
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Trip ID is required",
      });
    }

    // 1️⃣ Check if trip exists & not deleted
    const checkQuery = `
      SELECT id, title
      FROM trips
      WHERE id = $1
        AND deleted = B'0'
    `;

    const checkResult = await executeQuery(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Trip not found or already deleted",
      });
    }

    // 2️⃣ Soft delete trip (set deleted = 1)
    const deleteQuery = `
      UPDATE trips
      SET deleted = B'1',
          dateofmodification = NOW()
      WHERE id = $1
      RETURNING id, title, deleted, dateofmodification
    `;

    const deleteResult = await executeQuery(deleteQuery, [id]);

    // 3️⃣ Cascading Soft delete for itineraries
    const deleteItinQuery = `
      UPDATE itineraries
      SET deleted = 1,
          dateofmodification = NOW()
      WHERE trip_id = $1
    `;
    await executeQuery(deleteItinQuery, [id]);

    // 4️⃣ Cascading Soft delete for galleries
    const deleteGalleryQuery = `
      UPDATE galleries
      SET deleted = 1
      WHERE trip_id = $1
    `;
    await executeQuery(deleteGalleryQuery, [id]);

    return res.status(200).json({
      success: true,
      message: "Trip and associated data deleted successfully",
      data: deleteResult.rows[0],
    });
  } catch (error) {
    console.error("DeleteTrip error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete trip",
      error: error.message,
    });
  }
});

const getFile = asyncHandler(async (req, res) => {
  const { filePath } = req.query; // e.g., "uploads/32/TCDocuments/32 - 2025-03-24 - handover.jpeg"

  console.log("Filepath :", filePath);


  if (!filePath) {
    return res
      .status(400)
      .json({ success: false, message: "File path is required." });
  }

  const fullPath = path.join(__dirname, "..", filePath);

  try {
    // Check if file exists and is readable
    await fsPromises.access(fullPath, fs.constants.R_OK);

    // Stream the file
    const fileStream = fs.createReadStream(fullPath); // Use base fs module
    const fileName = path.basename(fullPath);

    // Set headers
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    // Set appropriate MIME type based on file extension
    const mimeType =
      {
        ".jpeg": "image/jpeg",
        ".jpg": "image/jpeg",
        ".png": "image/png",
        ".pdf": "application/pdf",
      }[path.extname(fileName).toLowerCase()] || "application/octet-stream";
    res.setHeader("Content-Type", mimeType);

    fileStream.pipe(res);
  } catch (error) {
    console.error(`Error streaming file ${fullPath}:`, error);
    return res.status(404).json({
      success: false,
      message: "File not found or inaccessible.",
      error: error.message,
    });
  }
});

module.exports = {
  //   insertTrip,
  getTrips,
  insertTripDirect,
  updateTrip,
  getTripById,
  deleteTrip,

  getFile
};