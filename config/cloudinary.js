const cloudinary = require("cloudinary").v2;

// Debug: Verify env vars are loading
// console.log('ENV Check:', {
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY ? 'Set' : 'MISSING',
//   api_secret: process.env.CLOUDINARY_API_SECRET ? 'Set' : 'MISSING'
// });

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

module.exports = cloudinary;