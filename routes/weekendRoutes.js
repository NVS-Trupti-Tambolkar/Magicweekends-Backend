const express = require('express');
const router = express.Router();
const {
    insertWeekendTrip,
    getWeekendTrips,
    getWeekendTripById,
    updateWeekendTrip,
    deleteWeekendTrip
} = require('../controllers/WeekendController');
const upload = require('../config/multer');

router.post('/insertWeekendTrip', upload.fields([
    { name: 'uploadimage', maxCount: 1 },
    { name: 'image', maxCount: 1 }
]), insertWeekendTrip);
router.get('/getWeekendallTrips', getWeekendTrips);
router.get('/getWeekendTripById', getWeekendTripById);
router.put('/updateWeekendTrip', upload.fields([
    { name: 'uploadimage', maxCount: 1 },
    { name: 'image', maxCount: 1 }
]), updateWeekendTrip);
router.delete('/deleteWeekendTrip', upload.none(), deleteWeekendTrip);

module.exports = router;
