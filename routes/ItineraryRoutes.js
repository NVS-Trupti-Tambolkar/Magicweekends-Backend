// routes/tripRoutes.js
const express = require('express');
const router = express.Router();
const { insertItineraries, getItinerariesByTrip, updateItinerary, deleteItinerary } = require('../controllers/ItineraryController');


router.post("/itineraries", insertItineraries);
router.get("/getItinerariesByTrip", getItinerariesByTrip);
router.delete("/deleteItinerary", deleteItinerary);
router.put("/updateItinerary", updateItinerary);
// router.delete("/itineraries/:itinerary_id", deleteItinerary);



// router.get('/getTrips', getTrips);

module.exports = router;