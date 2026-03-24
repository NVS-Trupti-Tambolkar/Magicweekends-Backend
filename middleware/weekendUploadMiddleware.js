// middleware/weekendUploadMiddleware.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../Uploads/WeekendTripImages');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const cloudinary = require('../config/cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const isPdf = file.mimetype === 'application/pdf';
        
        return {
            folder: isPdf ? 'MagicWeekends/Brochures' : 'MagicWeekends/WeekendTrips',
            format: isPdf ? 'pdf' : undefined,
            resource_type: isPdf ? 'image' : 'image', // Changed 'raw' to 'image' to allow fl_attachment
            public_id: `weekendtrip-${uniqueSuffix}`
        };
    },
});

// File filter
const fileFilter = (req, file, cb) => {
    const isImage = /jpeg|jpg|png|gif|webp/.test(path.extname(file.originalname).toLowerCase()) || file.mimetype.startsWith('image/');
    const isPdf = file.mimetype === 'application/pdf';

    if (isImage || isPdf) {
        return cb(null, true);
    }
    cb(new Error('Only image and PDF files are allowed!'));
};

// Create multer instance
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB
    },
    fileFilter: fileFilter
});

// Export middleware - field name must match frontend FormData key
const weekendUploadMiddleware = upload.fields([
    { name: 'uploadimage', maxCount: 1 },
    { name: 'image', maxCount: 1 },
    { name: 'brochure', maxCount: 1 }
]);

module.exports = weekendUploadMiddleware;
