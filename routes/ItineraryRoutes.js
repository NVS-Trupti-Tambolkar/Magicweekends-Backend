// routes/tripRoutes.js
const express = require('express');
const router = express.Router();
const { insertItineraries, getItinerariesByTrip, updateItinerary, deleteItinerary, deleteItinerariesByTrip } = require('../controllers/ItineraryController');


router.post("/itineraries", insertItineraries);
router.get("/getItinerariesByTrip", getItinerariesByTrip);
router.delete("/deleteItinerary", deleteItinerary);
router.delete("/deleteByTrip", deleteItinerariesByTrip);
router.put("/updateItinerary", updateItinerary);



// router.get('/getTrips', getTrips);

module.exports = router;