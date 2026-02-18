const express = require('express');
const cors = require('cors');
const Trip = require('./routes/tripRoutes')
const Itineraries = require('./routes/ItineraryRoutes')
const Gallery = require('./routes/galleryRoutes')
const WeekendTrip = require('./routes/weekendRoutes')

const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');

const app = express();

// Middleware
// app.use(helmet()); // Commented out for now
app.use(cors({
  origin: "https://magicweekend.netlify.app",
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static Files - Make the Uploads folder accessible via URL
const path = require('path');
app.use('/Uploads', express.static(path.join(__dirname, 'Uploads')));
app.use('/TripImages', express.static(path.join(__dirname, 'TripImages')));

// Request logging
app.use((req, res, next) => {
  logger.info(req.method + ' ' + req.url);
  next();
});

// Routes
const bookingRoutes = require('./routes/bookingRoutes');

app.use('/Trip', Trip);
app.use('/Itineraries', Itineraries);
app.use('/Gallery', Gallery);
app.use('/WeekendTrip', WeekendTrip);
app.use('/Booking', bookingRoutes);

// Error handling
app.use(errorHandler);

module.exports = app;
