const asyncHandler = require('express-async-handler');
const { executeQuery } = require("../config/db");
const cloudinary = require('../config/cloudinary');

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
   INSERT WEEKEND TRIP
   ========================================================= */
const insertWeekendTrip = asyncHandler(async (req, res) => {

    const {
        title, duration, tours, price, difficulty, highlights,
        available_days, from_location, to_location,
        overview, things_to_carry, max_group_size,
        age_limit, status
    } = req.body;

    let file = null;
    if (req.files) {
        file = (req.files.uploadimage && req.files.uploadimage[0]) ||
               (req.files.image && req.files.image[0]);
    }

    if (!title || !duration || !tours || !price || !difficulty || !highlights || !available_days || !file) {
        return res.status(400).json({
            success:false,
            message:"All required fields including image are mandatory"
        });
    }

    const imageUrl = file.path;

    try {

        const result = await executeQuery(
        `INSERT INTO weekendtrips (
            title,duration,uploadimage,tours,price,difficulty,highlights,
            available_days,from_location,to_location,overview,things_to_carry,
            max_group_size,age_limit,status,created_at,dateofmodification,deleted
        ) VALUES (
            $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,NOW(),NOW(),B'0'
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
            max_group_size ? parseInt(max_group_size) : null,
            age_limit || null,
            (status === "true" || status === true)
        ]);

        res.status(201).json({
            success:true,
            message:"Weekend trip inserted successfully",
            data:result.rows[0]
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

    res.json({
        success:true,
        count:result.rows.length,
        data:result.rows
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

    res.json({success:true,data:result.rows[0]});
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

    let file=null;
    if(req.files){
        file=(req.files.uploadimage && req.files.uploadimage[0]) ||
             (req.files.image && req.files.image[0]);
    }

    let imageUrl = oldTrip.uploadimage;

    // replace image
    if(file){
        const publicId=getPublicIdFromUrl(oldTrip.uploadimage);
        if(publicId){
            try{ await cloudinary.uploader.destroy(publicId); }
            catch(e){ console.log("Cloudinary delete:",e.message); }
        }
        imageUrl=file.path;
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
        dateofmodification=NOW()
     WHERE id=$16 RETURNING *`,
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
        id
    ]);

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

module.exports={
    insertWeekendTrip,
    getWeekendTrips,
    getWeekendTripById,
    updateWeekendTrip,
    deleteWeekendTrip
};