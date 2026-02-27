// routes/tripRoutes.js
const express = require('express');
const router = express.Router();
const { insertTrip, getTrips, insertTripDirect, updateTrip, getTripById, deleteTrip, getFile } = require('../controllers/tripController');
const tripImageUploadMiddleware = require('../middleware/tripImageUploadMiddleware');

// router.post('/insertTrip', tripImageUploadMiddleware, insertTrip);
router.post('/insertTripDirect', tripImageUploadMiddleware, insertTripDirect)
router.put('/updateTrip', tripImageUploadMiddleware, updateTrip)
router.get('/getTrips', getTrips)
router.get('/getTripById', getTripById)
router.delete('/deleteTrip', tripImageUploadMiddleware, deleteTrip);

// DISABLED - Local file serving no longer needed with Cloudinary
// router.get('/getFilepath', getFile)

// router.get('/getTrips', getTrips);

module.exports = router;