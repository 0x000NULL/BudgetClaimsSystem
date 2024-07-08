const pino = require('pino');
const path = require('path');
const fs = require('fs');

// Ensure the logs directory exists
const logDirectory = path.join(__dirname, '../logs');
if (!fs.existsSync(logDirectory)) {
    fs.mkdirSync(logDirectory);
}

// Create a write stream to the log file
const logFilePath = path.join(logDirectory, 'app.log');
const logStream = pino.destination(logFilePath);

// Configure Pino to use the log file
const logger = pino({
    level: 'info', // Set the log level to 'info'
    transport: {
        target: 'pino-pretty',
        options: {
            colorize: false // Disable colorization since we are logging to a file
        }
    }
}, logStream);

module.exports = logger;
