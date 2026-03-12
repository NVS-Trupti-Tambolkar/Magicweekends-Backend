const express = require('express');
const cors = require('cors');
const path = require('path');

const Trip = require('./routes/tripRoutes');
const Itineraries = require('./routes/ItineraryRoutes');
const Gallery = require('./routes/galleryRoutes');
const WeekendTrip = require('./routes/weekendRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const authRoutes = require('./routes/authRoutes');

const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');

const app = express();

/* =========================================================
   CORS CONFIGURATION  (IMPORTANT FOR NETLIFY FRONTEND)
   ========================================================= */

const allowedOrigins = [
  "http://localhost:3000",
  "https://magicalweekends.netlify.app",
  "https://magical-weekends.netlify.app" // Added common variation
];

app.use(cors({
  origin: function (origin, callback) {
    // For debugging, allow all origins or check against a broader list
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith(".netlify.app")) {
      callback(null, true);
    } else {
      console.log("Blocked by CORS:", origin);
      callback(null, true); // Temporarily allow for debugging
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept"]
}));

// ⭐ VERY IMPORTANT (handles browser preflight requests)
app.options("*", cors());

/* =========================================================
   BODY PARSER
   ========================================================= */

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* =========================================================
   STATIC FILES
   ========================================================= */

app.use('/Uploads', express.static(path.join(__dirname, 'Uploads')));
app.use('/TripImages', express.static(path.join(__dirname, 'TripImages')));

/* =========================================================
   REQUEST LOGGING
   ========================================================= */

app.use((req, res, next) => {
  logger.info(req.method + ' ' + req.url);
  next();
});

/* =========================================================
   ROUTES
   ========================================================= */

app.use('/Trip', Trip);
app.use('/Itineraries', Itineraries);
app.use('/Gallery', Gallery);
app.use('/WeekendTrip', WeekendTrip);
app.use('/Booking', bookingRoutes);
app.use('/auth', authRoutes);

/* =========================================================
   ERROR HANDLER
   ========================================================= */

app.use(errorHandler);

module.exports = app;