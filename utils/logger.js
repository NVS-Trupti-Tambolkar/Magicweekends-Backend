const winston = require('winston');
const path = require('path');
const moment = require('moment');

// Custom format to include filename, line number, and custom timestamp
const customFormat = winston.format.printf(({ timestamp, level, message }) => {
  const error = new Error();
  Error.captureStackTrace(error, customFormat);
  const stackLines = error.stack.split('\n');
  const callerLine = stackLines[3] || stackLines[2]; // Adjust based on the stack structure
  const match = callerLine.match(/\((.*?):(\d+):\d+\)/); // Match filename and line number
  const fileName = match ? path.basename(match[1]) : 'unknown';
  const lineNumber = match ? match[2] : 'unknown';
  const formattedTimestamp = moment(timestamp).format('MMM D YYYY ddd hh:mm A');

  return `${formattedTimestamp} - ${fileName}:${lineNumber} - ${level}: ${message}`;
});

const logger = winston.createLogger({
  level: 'info', // Set the minimum level for logger to 'info'
  format: winston.format.combine(
    winston.format.timestamp(),
    customFormat
  ),
  transports: [
    // Only 'info' level and above should go to combined.log
    new winston.transports.File({
      filename: 'logs/combined.log',
      level: 'info', // This ensures that only 'info' and above are logged here
    }),
    // Only 'error' level and above should go to error.log
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error', // This ensures that only 'error' and above are logged here
    })
  ]
});

// Add console transport for non-production environments (optional)
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

module.exports = logger;
