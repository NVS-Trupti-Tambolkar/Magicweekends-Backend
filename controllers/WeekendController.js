const asyncHandler = require('express-async-handler');
const { executeQuery } = require("../config/db");
const cloudinary = require('../config/cloudinary');
const logger = require('../utils/logger');
const https = require('https');

/* =========================================================
   HELPER → extract Cloudinary public_id from URL
   ========================================================= */
const getPublicIdFromUrl = (url) => {
    try {
        if (!url || !url.includes("res.cloudinary.com")) return null;

        const parts = url.split("/");
        const fileName = parts.pop().split(".")[0]; // remove extension
        const folderIndex = parts.findIndex(p => p === "MagicWeekends");
        const folder = parts.slice(folderIndex).join("/");

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
   INSERT WEEKEND TRIP
   ========================================================= */
const insertWeekendTrip = asyncHandler(async (req, res) => {

    const {
        title, duration, tours, price, difficulty, highlights,
        available_days, from_location, to_location,
        age_limit, status,
        departure_dates,
        inclusions, exclusions
    } = req.body;

    const imageFile = req.files?.uploadimage?.[0] || req.files?.image?.[0];
    const brochureFile = req.files?.brochure?.[0];

    if (!title || !duration || !tours || !price || !difficulty || !available_days || !imageFile) {
        return res.status(400).json({
            success:false,
            message:"All required fields including image are mandatory"
        });
    }

    const imageUrl = imageFile.path;
    const brochureUrl = brochureFile ? brochureFile.path : null;

    try {

        const result = await executeQuery(
        `INSERT INTO weekendtrips (
            title,duration,uploadimage,tours,price,difficulty,highlights,
            available_days,from_location,to_location,overview,things_to_carry,
            age_limit,status,created_at,dateofmodification,deleted,
            inclusions,exclusions,brochure_url
        ) VALUES (
            $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,NOW(),NOW(),B'0',
            $15::jsonb,$16::jsonb,$17
        ) RETURNING *`,
        [
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
            age_limit || null,
            (status === "true" || status === true),
            inclusions ? (typeof inclusions === 'string' ? inclusions : JSON.stringify(inclusions)) : '[]',
            exclusions ? (typeof exclusions === 'string' ? exclusions : JSON.stringify(exclusions)) : '[]',
            brochureUrl
        ]);

        const newTrip = result.rows[0];

        // Save multiple departure dates if provided
        if (departure_dates) {
            await saveDepartureDates(newTrip.id, 'weekend', departure_dates);
        }

        res.status(201).json({
            success:true,
            message:"Weekend trip inserted successfully",
            data:newTrip
        });

    } catch(err){

        // cleanup cloudinary if DB fails
        if(file?.filename){
            await cloudinary.uploader.destroy(file.filename);
        }

        res.status(500).json({
            success:false,
            message:"Insert failed",
            error:err.message
        });
    }
});

/* =========================================================
   GET ALL
   ========================================================= */
const getWeekendTrips = asyncHandler(async (req,res)=>{

    const result = await executeQuery(
        "SELECT * FROM weekendtrips WHERE deleted=B'0' ORDER BY created_at DESC"
    );

    const trips = result.rows;
    logger.info(`DEBUG: Fetched ${trips.length} weekend trips from DB.`);

    // Add departure dates for each trip (Optimized to avoid N+1 queries)
    if (trips.length > 0) {
        const tripIds = trips.map(t => t.id);
        const dateResult = await executeQuery(
            "SELECT trip_id, departure_date FROM trip_departure_dates WHERE trip_id = ANY($1) AND trip_type = 'weekend' ORDER BY departure_date ASC",
            [tripIds]
        );

        // Group dates by trip_id
        const datesMap = dateResult.rows.reduce((acc, curr) => {
            if (!acc[curr.trip_id]) acc[curr.trip_id] = [];
            acc[curr.trip_id].push(curr.departure_date);
            return acc;
        }, {});

        // Assign dates back to trips
        trips.forEach(trip => {
            trip.departure_dates = datesMap[trip.id] || [];
        });
    }

    logger.info("DEBUG: Weekend trips titles: " + trips.map(t => t.title).join(", "));

    res.json({
        success:true,
        count:trips.length,
        data:trips
    });
});

/* =========================================================
   GET BY ID
   ========================================================= */
const getWeekendTripById = asyncHandler(async (req,res)=>{

    const {id} = req.query;

    const result = await executeQuery(
        "SELECT * FROM weekendtrips WHERE id=$1 AND deleted=B'0'",
        [id]
    );

    if(!result.rows.length)
        return res.status(404).json({success:false,message:"Trip not found"});

    const trip = result.rows[0];

    // Fetch departure dates
    const datesResult = await executeQuery(
        "SELECT departure_date FROM trip_departure_dates WHERE trip_id=$1 AND trip_type='weekend' ORDER BY departure_date ASC",
        [id]
    );
    trip.departure_dates = datesResult.rows.map(r => r.departure_date);

    res.json({success:true,data:trip});
});

/* =========================================================
   UPDATE
   ========================================================= */
const updateWeekendTrip = asyncHandler(async (req,res)=>{

    const {id} = req.body;
    if(!id) return res.status(400).json({success:false,message:"ID required"});

    const existing = await executeQuery(
        "SELECT * FROM weekendtrips WHERE id=$1 AND deleted=B'0'",
        [id]
    );

    if(!existing.rows.length)
        return res.status(404).json({success:false,message:"Trip not found"});

    const oldTrip = existing.rows[0];

    let imageUrl = oldTrip.uploadimage;
    let brochureUrl = oldTrip.brochure_url;

    const imageFile = req.files?.uploadimage?.[0] || req.files?.image?.[0];
    const brochureFile = req.files?.brochure?.[0];

    // replace image
    if(imageFile){
        const publicId=getPublicIdFromUrl(oldTrip.uploadimage);
        if(publicId){
            try{ await cloudinary.uploader.destroy(publicId); }
            catch(e){ console.log("Cloudinary image delete:",e.message); }
        }
        imageUrl=imageFile.path;
    }

    // Replace brochure if new uploaded
    if (brochureFile) {
        if (oldTrip.brochure_url) {
            const publicId = getPublicIdFromUrl(oldTrip.brochure_url);
            if (publicId) {
                try { await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' }); }
                catch(e){ console.log("Cloudinary brochure delete failed:", e.message); }
            }
        }
        brochureUrl = brochureFile.path;
    }

    const parsedTours = req.body.tours ? parseInt(req.body.tours) : oldTrip.tours;
    const parsedGroup = req.body.max_group_size ? parseInt(req.body.max_group_size) : oldTrip.max_group_size;

    const result=await executeQuery(
    `UPDATE weekendtrips SET
        title=COALESCE($1,title),
        duration=COALESCE($2,duration),
        tours=$3,
        price=COALESCE($4,price),
        difficulty=COALESCE($5,difficulty),
        highlights=COALESCE($6,highlights),
        available_days=COALESCE($7,available_days),
        from_location=COALESCE($8,from_location),
        to_location=COALESCE($9,to_location),
        overview=COALESCE($10,overview),
        things_to_carry=COALESCE($11,things_to_carry),
        max_group_size=$12,
        age_limit=COALESCE($13,age_limit),
        status=COALESCE($14,status),
        uploadimage=$15,
        inclusions=COALESCE($16::jsonb,inclusions),
        exclusions=COALESCE($17::jsonb,exclusions),
        brochure_url=COALESCE($18,brochure_url),
        dateofmodification=NOW()
     WHERE id=$19 RETURNING *`,
    [
        req.body.title,
        req.body.duration,
        parsedTours,
        req.body.price,
        req.body.difficulty,
        req.body.highlights,
        req.body.available_days,
        req.body.from_location,
        req.body.to_location,
        req.body.overview,
        req.body.things_to_carry,
        parsedGroup,
        req.body.age_limit,
        req.body.status,
        imageUrl,
        req.body.inclusions ? (typeof req.body.inclusions === 'string' ? req.body.inclusions : JSON.stringify(req.body.inclusions)) : null,
        req.body.exclusions ? (typeof req.body.exclusions === 'string' ? req.body.exclusions : JSON.stringify(req.body.exclusions)) : null,
        brochureUrl,
        id
    ]);

    // Update departure dates if provided
    if (req.body.departure_dates) {
        await saveDepartureDates(id, 'weekend', req.body.departure_dates);
    }

    res.json({success:true,message:"Updated successfully",data:result.rows[0]});
});

/* =========================================================
   DELETE
   ========================================================= */
const deleteWeekendTrip = asyncHandler(async (req,res)=>{

    const {id}=req.body;

    const existing=await executeQuery(
        "SELECT uploadimage FROM weekendtrips WHERE id=$1",
        [id]
    );

    if(existing.rows.length){
        const publicId=getPublicIdFromUrl(existing.rows[0].uploadimage);
        if(publicId){
            try{ await cloudinary.uploader.destroy(publicId); }
            catch(e){ console.log("Cloudinary delete:",e.message); }
        }
    }

    const result=await executeQuery(
        `UPDATE weekendtrips SET deleted=B'1',dateofmodification=NOW()
         WHERE id=$1 RETURNING *`,
        [id]
    );

    res.json({success:true,message:"Deleted successfully",data:result.rows[0]});
});

/* =========================================================
   DOWNLOAD WEEKEND BROCHURE
   ========================================================= */
const downloadWeekendBrochure = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;
        
        if (!id) {
            return res.status(400).json({ success: false, message: "Weekend Trip ID is required" });
        }

        const result = await executeQuery(
            "SELECT brochure_url, title FROM weekendtrips WHERE id = $1",
            [id]
        );

        if (result.rows.length === 0 || !result.rows[0].brochure_url) {
            return res.status(404).json({ success: false, message: "Brochure not found for this trip" });
        }

        const url = result.rows[0].brochure_url;
        
        console.log(`DEBUG: Processing brochure download for Weekend Trip ID: ${id}`);
        console.log(`DEBUG: Original URL: ${url}`);

        let publicId = '';
        const isRaw = url.includes('/raw/');
        const isCloudinary = url.includes('res.cloudinary.com');

        if (!isCloudinary) {
            console.log(`DEBUG: Non-Cloudinary URL detected, redirecting directly: ${url}`);
            return res.redirect(url);
        }

        // --- CONFIGURATION CHECK ---
        if (!process.env.CLOUDINARY_API_SECRET) {
            console.error("CRITICAL ERROR: CLOUDINARY_API_SECRET is missing from environment variables.");
            return res.status(500).json({ 
                success: false, 
                message: "Server configuration error: Cloudinary API Secret is missing. Please add it to your Render dashboard environment variables." 
            });
        }

        // --- CLOUDINARY LOGIC ---
        try {
            const uploadIndex = url.indexOf('/upload/');
            if (uploadIndex !== -1) {
                let pathAfterUpload = url.substring(uploadIndex + 8);
                const parts = pathAfterUpload.split('/');
                
                // Skip version number if present
                if (parts[0].startsWith('v') && !isNaN(parts[0].substring(1))) {
                    publicId = parts.slice(1).join('/');
                } else {
                    publicId = parts.join('/');
                }
                
                // Remove extension for 'image' resource type
                if (!isRaw && publicId.toLowerCase().endsWith('.pdf')) {
                    publicId = publicId.substring(0, publicId.lastIndexOf('.pdf'));
                }
            }

            if (publicId) {
                console.log(`DEBUG: Requesting signed download for Public ID: "${publicId}" (Resource Type: ${isRaw ? 'raw' : 'image'})`);
                
                // Format a nice filename from the trip title
                const originalTitle = result.rows[0].title || 'Weekend_Trip';
                const cleanFileName = `${originalTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_brochure.pdf`;

                // Use the official private_download_url.
                const signedUrl = cloudinary.utils.private_download_url(publicId, 'pdf', {
                    resource_type: isRaw ? 'raw' : 'image',
                    type: 'upload',
                    attachment: cleanFileName
                });

                console.log(`DEBUG: Redirecting to signed Cloudinary API URL: ${signedUrl}`);
                return res.redirect(signedUrl);
            } else {
                throw new Error("Could not extract publicId from URL");
            }
        } catch (err) {
            console.error("ERROR: Failed to generate signed URL:", err.message);
            return res.status(500).json({ 
                success: false, 
                message: "Cloud storage signing failed", 
                details: err.message,
                tip: "Ensure your Cloudinary credentials are correct and that the asset exists."
            });
        }

    } catch (error) {
        console.error("CRITICAL ERROR in downloadWeekendBrochure:", error);
        return res.status(500).json({
            success: false,
            message: "An unexpected error occurred in the weekend brochure download controller.",
            details: error.message
        });
    }
});

module.exports = {
    insertWeekendTrip,
    getWeekendTrips,
    getWeekendTripById,
    updateWeekendTrip,
    deleteWeekendTrip,
    downloadWeekendBrochure
};