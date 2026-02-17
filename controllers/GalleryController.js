const path = require('path');
const asyncHandler = require('express-async-handler');
const { executeQuery } = require('../config/db');

const insertGallery = asyncHandler(async (req, res) => {
  const { trip_id, folder_name, image_title } = req.body;
  const files = req.files;

  if (!trip_id || !folder_name || !files || files.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'trip_id, folder_name, and images are required'
    });
  }

  try {
    const values = [];
    const placeholders = [];

    files.forEach((file, index) => {
      const relativePath = path
        .relative(path.join(__dirname, '..'), file.path)
        .replace(/\\/g, '/');

      // 6 columns, last one is NOW() in SQL
      placeholders.push(
        `($${index * 5 + 1}, $${index * 5 + 2}, $${index * 5 + 3}, $${index * 5 + 4}, $${index * 5 + 5}, NOW())`
      );

      values.push(
        parseInt(trip_id),      // $1, $6, ...
        folder_name,            // $2, $7, ...
        relativePath,           // $3, $8, ...
        image_title || null,    // $4, $9, ...
        0                       // deleted = 0 ($5, $10, ...)
      );
    });

    const query = `
      INSERT INTO galleries (
        trip_id,
        folder_name,
        image_url,
        image_title,
        deleted,
        created_at
      )
      VALUES ${placeholders.join(',')}
      RETURNING *
    `;

    const result = await executeQuery(query, values);

    return res.status(201).json({
      success: true,
      message: 'Gallery images uploaded successfully',
      data: result.rows
    });

  } catch (error) {
    console.error('InsertGallery error:', error);
    return res.status(500).json({
      success: false,
      message: 'Database error',
      error: error.message
    });
  }
});

const updateGalleryById = asyncHandler(async (req, res) => {
  const { gallery_id, folder_name, existing_folder, image_title } = req.body;
  const files = req.files;

  if (!gallery_id) {
    return res.status(400).json({
      success: false,
      message: 'gallery_id is required in body'
    });
  }

  try {
    let image_url = null;

    if (files && files.length > 0) {
      // Use first uploaded file for update
      image_url = path
        .relative(path.join(__dirname, '..'), files[0].path)
        .replace(/\\/g, '/');
    }

    const query = `
      UPDATE galleries
      SET
          folder_name = COALESCE($1, folder_name),
          image_title = COALESCE($2, image_title),
          image_url = COALESCE($3, image_url)
      WHERE id = $4
      RETURNING *
    `;

    const params = [
      folder_name || existing_folder || null,  // $1
      image_title || null,                      // $2
      image_url || null,                        // $3
      parseInt(gallery_id)                      // $4
    ];

    const result = await executeQuery(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Gallery not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Gallery updated successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('UpdateGalleryById error:', error);
    return res.status(500).json({
      success: false,
      message: 'Database error',
      error: error.message
    });
  }
});

const getGalleryById = asyncHandler(async (req, res) => {
  const { gallery_id } = req.query; // you can also use req.body if you want

  if (!gallery_id) {
    return res.status(400).json({
      success: false,
      message: 'gallery_id is required'
    });
  }

  try {
    const query = `
      SELECT *
      FROM galleries
      WHERE id = $1
        AND (deleted IS NULL OR deleted = 0)
    `;

    const params = [parseInt(gallery_id)];
    const result = await executeQuery(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Gallery not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('GetGalleryById error:', error);
    return res.status(500).json({
      success: false,
      message: 'Database error',
      error: error.message
    });
  }
});

const deleteGalleryById = asyncHandler(async (req, res) => {
  const { gallery_id } = req.query; // or req.body

  if (!gallery_id) {
    return res.status(400).json({
      success: false,
      message: 'gallery_id is required'
    });
  }

  try {
    const query = `
      UPDATE galleries
      SET deleted = 1
      WHERE id = $1
      RETURNING *
    `;

    const params = [parseInt(gallery_id)];
    const result = await executeQuery(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Gallery not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Gallery deleted successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('DeleteGalleryById error:', error);
    return res.status(500).json({
      success: false,
      message: 'Database error',
      error: error.message
    });
  }
});

const getGalleries = asyncHandler(async (req, res) => {
  try {
    const query = `
      SELECT id, trip_id, folder_name, image_url, image_title, created_at
      FROM galleries
      WHERE (deleted IS NULL OR deleted = 0)
      ORDER BY created_at DESC
    `;

    const result = await executeQuery(query);

    // Group by folder_name
    const groupedGalleries = result.rows.reduce((acc, current) => {
      const folder = current.folder_name || 'Uncategorized';
      if (!acc[folder]) {
        acc[folder] = {
          id: current.folder_name,
          tourName: current.folder_name,
          title: current.image_title || current.folder_name,
          trip_id: current.trip_id,
          images: [],
          ids: []
        };
      }
      acc[folder].images.push(current.image_url);
      acc[folder].ids.push(current.id);
      return acc;
    }, {});

    return res.status(200).json({
      success: true,
      data: Object.values(groupedGalleries)
    });

  } catch (error) {
    console.error('GetGalleries error:', error);
    return res.status(500).json({
      success: false,
      message: 'Database error',
      error: error.message
    });
  }
});

const deleteGalleryByFolder = asyncHandler(async (req, res) => {
  const { folder_name, trip_id } = req.query;

  if (!folder_name || !trip_id) {
    return res.status(400).json({
      success: false,
      message: 'folder_name and trip_id are required'
    });
  }

  try {
    const query = `
      UPDATE galleries
      SET deleted = 1
      WHERE folder_name = $1 AND trip_id = $2
      RETURNING *
    `;

    const result = await executeQuery(query, [folder_name, parseInt(trip_id)]);

    return res.status(200).json({
      success: true,
      message: `Deleted ${result.rows.length} images from gallery ${folder_name}`,
      data: result.rows
    });
  } catch (error) {
    console.error('DeleteGalleryByFolder error:', error);
    return res.status(500).json({
      success: false,
      message: 'Database error',
      error: error.message
    });
  }
});

const updateGalleryByFolder = asyncHandler(async (req, res) => {
  const { old_folder_name, trip_id, new_folder_name, image_title } = req.body;
  const files = req.files;

  if (!old_folder_name || !trip_id) {
    return res.status(400).json({
      success: false,
      message: 'old_folder_name and trip_id are required'
    });
  }

  try {
    // 1. Update existing entries
    const updateQuery = `
            UPDATE galleries
            SET
                folder_name = COALESCE($1, folder_name),
                image_title = COALESCE($2, image_title)
            WHERE folder_name = $3 AND trip_id = $4
            RETURNING *
        `;

    const updateParams = [
      new_folder_name || null,
      image_title || null,
      old_folder_name,
      parseInt(trip_id)
    ];

    let result = await executeQuery(updateQuery, updateParams);

    // 2. If new images are uploaded, insert them
    if (files && files.length > 0) {
      const values = [];
      const placeholders = [];
      const activeFolderName = new_folder_name || old_folder_name;

      files.forEach((file, index) => {
        const relativePath = path
          .relative(path.join(__dirname, '..'), file.path)
          .replace(/\\/g, '/');

        placeholders.push(
          `($${index * 5 + 1}, $${index * 5 + 2}, $${index * 5 + 3}, $${index * 5 + 4}, $${index * 5 + 5}, NOW())`
        );

        values.push(
          parseInt(trip_id),
          activeFolderName,
          relativePath,
          image_title || (result.rows.length > 0 ? result.rows[0].image_title : null),
          0
        );
      });

      const insertQuery = `
                INSERT INTO galleries (trip_id, folder_name, image_url, image_title, deleted, created_at)
                VALUES ${placeholders.join(',')}
                RETURNING *
            `;

      const insertResult = await executeQuery(insertQuery, values);
      // Combine results if needed or just return success
    }

    return res.status(200).json({
      success: true,
      message: 'Gallery updated successfully'
    });

  } catch (error) {
    console.error('UpdateGalleryByFolder error:', error);
    return res.status(500).json({
      success: false,
      message: 'Database error',
      error: error.message
    });
  }
});

const getGalleriesByTripId = asyncHandler(async (req, res) => {
  const { trip_id } = req.query;

  if (!trip_id) {
    return res.status(400).json({
      success: false,
      message: 'trip_id is required'
    });
  }

  try {
    const query = `
      SELECT id, trip_id, folder_name, image_url, image_title, created_at
      FROM galleries
      WHERE trip_id = $1 AND (deleted IS NULL OR deleted = 0)
      ORDER BY created_at DESC
    `;

    const result = await executeQuery(query, [parseInt(trip_id)]);

    return res.status(200).json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('GetGalleriesByTripId error:', error);
    return res.status(500).json({
      success: false,
      message: 'Database error',
      error: error.message
    });
  }
});

module.exports = {
  insertGallery,
  updateGalleryById,
  getGalleryById,
  deleteGalleryById,
  getGalleries,
  deleteGalleryByFolder,
  updateGalleryByFolder,
  getGalleriesByTripId
};
