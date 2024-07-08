const pino = require('pino');
const path = require('path');
const fs = require('fs');

// Ensure the logs directory exists
const logDirectory = path.join(__dirname, 'logs');
if (!fs.existsSync(logDirectory)) {
    fs.mkdirSync(logDirectory);
}

// Create a write stream to the log file
const logFilePath = path.join(logDirectory, 'app.log');
const logStream = pino.destination(logFilePath);

// Configure Pino to use the log file without the transport option
const logger = pino({
    level: process.env.PINO_LOG_LEVEL || 'info', // Set the log level
    prettyPrint: false // Ensure pretty print is disabled
}, logStream);

module.exports = logger;
