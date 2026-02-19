// routes/tripRoutes.js
const express = require('express');
const router = express.Router();
const { insertTrip, getTrips, insertTripDirect, updateTrip, getTripById, deleteTrip, getFile } = require('../controllers/tripController');
const upload = require('../config/multer');

// router.post('/insertTrip', upload.fields([{ name: 'uploadimage', maxCount: 1 }, { name: 'image', maxCount: 1 }]), insertTrip);
router.post('/insertTripDirect', upload.fields([{ name: 'uploadimage', maxCount: 1 }, { name: 'image', maxCount: 1 }]), insertTripDirect)
router.put('/updateTrip', upload.fields([{ name: 'uploadimage', maxCount: 1 }, { name: 'image', maxCount: 1 }]), updateTrip)
router.get('/getTrips', getTrips)
router.get('/getTripById', getTripById)
router.delete('/deleteTrip', upload.none(), deleteTrip);

router.get('/getFilepath', getFile)

// router.get('/getTrips', getTrips);

module.exports = router;