const express = require('express');
const router = express.Router();
const {
    insertWeekendTrip,
    getWeekendTrips,
    getWeekendTripById,
    updateWeekendTrip,
    deleteWeekendTrip
} = require('../controllers/WeekendController');
const weekendUploadMiddleware = require('../middleware/weekendUploadMiddleware');

router.post('/insertWeekendTrip', weekendUploadMiddleware, insertWeekendTrip);
router.get('/getWeekendallTrips', getWeekendTrips);
router.get('/getWeekendTripById', getWeekendTripById);
router.put('/updateWeekendTrip', weekendUploadMiddleware, updateWeekendTrip);
router.delete('/deleteWeekendTrip', weekendUploadMiddleware, deleteWeekendTrip);

module.exports = router;
