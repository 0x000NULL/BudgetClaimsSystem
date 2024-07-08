const pino = require('pino');

const logger = pino({
    prettyPrint: {
        colorize: true, // Colorizes the log output
        translateTime: true, // Adds timestamp to logs
        ignore: 'pid,hostname' // Removes unnecessary fields
    },
    level: process.env.LOG_LEVEL || 'info' // Set log level via environment variable
});

module.exports = logger;
