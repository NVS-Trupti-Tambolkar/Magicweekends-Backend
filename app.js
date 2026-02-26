const express = require('express');
const cors = require('cors');
const path = require('path');

const Trip = require('./routes/tripRoutes');
const Itineraries = require('./routes/ItineraryRoutes');
const Gallery = require('./routes/galleryRoutes');
const WeekendTrip = require('./routes/weekendRoutes');
const bookingRoutes = require('./routes/bookingRoutes');

const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');

const app = express();

/* =========================================================
   CORS CONFIGURATION  (IMPORTANT FOR NETLIFY FRONTEND)
   ========================================================= */

const allowedOrigins = [
  "http://localhost:3000",
  "https://magicalweekends.netlify.app"
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow Postman / mobile apps / server-side requests
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      console.log("Blocked by CORS:", origin);
      return callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
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

/* =========================================================
   ERROR HANDLER
   ========================================================= */

app.use(errorHandler);

module.exports = app;