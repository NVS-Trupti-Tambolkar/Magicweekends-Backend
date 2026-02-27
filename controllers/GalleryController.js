const asyncHandler = require('express-async-handler');
const { executeQuery } = require('../config/db');
const cloudinary = require('../config/cloudinary');

/* Helper: get cloudinary public id */
const getPublicId = (url) => {
  try {
    if (!url) return null;
    const parts = url.split('/upload/');
    const afterUpload = parts[1];
    const withoutVersion = afterUpload.split('/').slice(1).join('/');
    return withoutVersion.split('.')[0];
  } catch {
    return null;
  }
};

/* =========================================================
   INSERT GALLERY (MULTIPLE IMAGES)
========================================================= */
const insertGallery = asyncHandler(async (req, res) => {

  const { trip_id, folder_name, image_title } = req.body;
  const files = req.files;

  if (!trip_id || !folder_name || !files || files.length === 0)
    return res.status(400).json({ success:false, message:"Images required" });

  const values = [];
  const placeholders = [];

  files.forEach((file, index) => {

    const base = index * 5;

    placeholders.push(
      `($${base+1},$${base+2},$${base+3},$${base+4},$${base+5},NOW())`
    );

    values.push(
      parseInt(trip_id),
      folder_name,
      file.path,              // <-- Cloudinary URL
      image_title || null,
      0
    );
  });

  const result = await executeQuery(
    `INSERT INTO galleries
     (trip_id,folder_name,image_url,image_title,deleted,created_at)
     VALUES ${placeholders.join(',')}
     RETURNING *`,
    values
  );

  res.status(201).json({ success:true, data:result.rows });
});

/* =========================================================
   UPDATE SINGLE IMAGE
========================================================= */
const updateGalleryById = asyncHandler(async (req,res)=>{

  const { gallery_id, folder_name, image_title } = req.body;
  const files = req.files;

  if(!gallery_id)
    return res.status(400).json({success:false,message:"gallery_id required"});

  const existing = await executeQuery(
    `SELECT image_url FROM galleries WHERE id=$1 AND deleted=0`,
    [gallery_id]
  );

  if(!existing.rows.length)
    return res.status(404).json({success:false,message:"Not found"});

  let imageUrl = existing.rows[0].image_url;

  /* delete old cloudinary image */
  if(files && files.length){
    const publicId = getPublicId(imageUrl);
    if(publicId){
      try{ await cloudinary.uploader.destroy(publicId); }
      catch(e){ console.log("cloud delete fail:",e.message); }
    }
    imageUrl = files[0].path;
  }

  const result = await executeQuery(
    `UPDATE galleries
     SET folder_name=COALESCE($1,folder_name),
         image_title=COALESCE($2,image_title),
         image_url=$3
     WHERE id=$4
     RETURNING *`,
    [folder_name,image_title,imageUrl,gallery_id]
  );

  res.json({success:true,data:result.rows[0]});
});

/* =========================================================
   DELETE SINGLE IMAGE
========================================================= */
const deleteGalleryById = asyncHandler(async (req,res)=>{

  const { gallery_id } = req.query;

  const existing = await executeQuery(
    `SELECT image_url FROM galleries WHERE id=$1 AND deleted=0`,
    [gallery_id]
  );

  if(!existing.rows.length)
    return res.status(404).json({success:false,message:"Not found"});

  const publicId = getPublicId(existing.rows[0].image_url);

  if(publicId){
    try{ await cloudinary.uploader.destroy(publicId); }
    catch(e){ console.log(e.message); }
  }

  await executeQuery(
    `UPDATE galleries SET deleted=1 WHERE id=$1`,
    [gallery_id]
  );

  res.json({success:true,message:"Image deleted"});
});

/* =========================================================
   GET ALL GALLERIES
========================================================= */
const getGalleries = asyncHandler(async (req,res)=>{

  const result = await executeQuery(
    `SELECT id,trip_id,folder_name,image_url,image_title
     FROM galleries
     WHERE deleted=0
     ORDER BY created_at DESC`
  );

  // GROUP INTO FOLDERS (CRITICAL)
  const grouped = result.rows.reduce((acc,row)=>{

    const folder = row.folder_name || "Uncategorized";

    if(!acc[folder]){
      acc[folder] = {
        id: folder,
        tourName: folder,
        title: row.image_title || folder,
        trip_id: row.trip_id,
        images: [],
        ids: []
      };
    }

    acc[folder].images.push(row.image_url);
    acc[folder].ids.push(row.id);

    return acc;

  },{});

  res.json({
    success:true,
    data:Object.values(grouped)
  });
});

/* =========================================================
   GET GALLERY BY TRIP
========================================================= */
const getGalleriesByTripId = asyncHandler(async (req,res)=>{

  const { trip_id } = req.query;

  const result = await executeQuery(
    `SELECT id,folder_name,image_url,image_title,created_at
     FROM galleries
     WHERE trip_id=$1 AND deleted=0
     ORDER BY created_at DESC`,
    [trip_id]
  );

  res.json({success:true,data:result.rows});
});

/* =========================================================
   DELETE WHOLE FOLDER
========================================================= */
const deleteGalleryByFolder = asyncHandler(async (req,res)=>{

  const { folder_name, trip_id } = req.query;

  const images = await executeQuery(
    `SELECT image_url FROM galleries
     WHERE folder_name=$1 AND trip_id=$2 AND deleted=0`,
    [folder_name,trip_id]
  );

  for(const img of images.rows){
    const publicId = getPublicId(img.image_url);
    if(publicId){
      try{ await cloudinary.uploader.destroy(publicId); }
      catch(e){ console.log(e.message); }
    }
  }

  await executeQuery(
    `UPDATE galleries SET deleted=1 WHERE folder_name=$1 AND trip_id=$2`,
    [folder_name,trip_id]
  );

  res.json({success:true,message:"Folder deleted"});
});

module.exports = {
  insertGallery,
  updateGalleryById,
  deleteGalleryById,
  getGalleries,
  getGalleriesByTripId,
  deleteGalleryByFolder
};