/**
 * @file logger.js
 * @description Configures and exports a Pino logger instance that writes logs to a file.
 * 
 * @requires pino
 * @requires path
 * @requires fs
 * 
 * @constant {string} logDirectory - The directory where log files are stored.
 * @constant {string} logFilePath - The path to the log file.
 * @constant {object} logStream - The write stream to the log file.
 * @constant {object} logger - The configured Pino logger instance.
 * 
 * @example
 * const logger = require('./logger');
 * logger.info('This is an info message');
 * logger.error('This is an error message');
 */
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
