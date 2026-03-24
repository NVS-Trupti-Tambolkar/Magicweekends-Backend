const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Cloudinary storage configuration
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const isPdf = file.mimetype === 'application/pdf';

    return {
      folder: isPdf ? 'MagicWeekends/Brochures' : 'MagicWeekends/Trips',
      format: isPdf ? 'pdf' : 'webp',
      resource_type: isPdf ? 'image' : 'image', // Changed 'raw' to 'image' for PDF to allow transformations like fl_attachment
      public_id: `trip-${uniqueSuffix}`,
    };
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only image and PDF files are allowed'), false);
  }
};

// Multer setup
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter
});

const tripImageUploadMiddleware = upload.fields([
  { name: 'uploadimage', maxCount: 1 },
  { name: 'image', maxCount: 1 },
  { name: 'brochure', maxCount: 1 }
]);

module.exports = tripImageUploadMiddleware;