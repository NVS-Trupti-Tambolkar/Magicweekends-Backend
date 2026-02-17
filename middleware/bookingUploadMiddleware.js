const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../Uploads/BookingIDProofs');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const filename = `booking-id-${uniqueSuffix}${ext}`;
        cb(null, filename);
    }
});

// File filter (Allow images and PDFs)
const fileFilter = (req, file, cb) => {
    // Allowed extensions
    const allowedTypes = /jpeg|jpg|png|pdf/;
    // Check extension
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    // Check mime
    const mimetype = allowedTypes.test(file.mimetype) || file.mimetype === 'application/pdf';

    if (extname && mimetype) {
        return cb(null, true);
    }
    cb(new Error('Only images (jpeg, jpg, png) and PDF files are allowed!'));
};

// Create multer instance
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit per file
    },
    fileFilter: fileFilter
});

// Export middleware - use any() to handle dynamic field names like id_proof_image_0, id_proof_image_1...
const bookingUploadMiddleware = upload.any();

module.exports = bookingUploadMiddleware;
