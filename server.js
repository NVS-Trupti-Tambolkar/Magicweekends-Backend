require('dotenv').config();
const app = require('./app');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 3000;

// Server initialization
app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
});


// require('dotenv').config();
// const fs = require('fs');
// const https = require('https');
// const app = require('./app');
// const logger = require('./utils/logger');
// const sql = require('mssql');

// // Read the SSL certificate and private key files
// const sslOptions = {
//   key: fs.readFileSync('C:/inetpub/vhosts/noviusrailtech.co.in/dwapi.noviusrailtech.co.in/privkey.pem'),  // Path to the private key
//   cert: fs.readFileSync('C:/inetpub/vhosts/noviusrailtech.co.in/dwapi.noviusrailtech.co.in/cert.pem'),  // Path to the full certificate chain
// };

// // Database configuration for SQL Server
// const config = {
//   server: process.env.DB_SERVER,
//   database: process.env.DB_DATABASE,
//   user: process.env.DB_USER,
//   password: process.env.DB_PASSWORD,
//   options: {
//     encrypt: true,  // Use encryption for SQL Server connection
//     trustServerCertificate: true  // Skip certificate validation for simplicity
//   }
// };

// const pool = new sql.ConnectionPool(config);

// // Connect to the database
// pool.connect()
//   .then(() => {
//     logger.info('Database Connected Successfully');
//   })
//   .catch(err => {
//     logger.error(`Database connection error: ${err}`);
//   });

// pool.on('error', err => {
//   logger.error(`Database connection error: ${err}`);
// });

// // Create an HTTPS server with the given SSL options
// const PORT = process.env.PORT || 4000;

// https.createServer(sslOptions, app).listen(PORT, () => {
//   logger.info(`Server is running securely on port ${PORT}`);

//   // Ensure the database connection is successful
//   pool.connect()
//     .then(() => {
//       logger.info("Database connected...");
//     })
//     .catch((err) => {
//       logger.error("Unable to connect to the database:", err);
//     });
// });