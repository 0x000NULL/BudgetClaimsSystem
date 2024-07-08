const pino = require('pino');
const pinoPretty = require('pino-pretty');

const stream = pinoPretty({
    colorize: true, // Colorizes the log output
    levelFirst: true, // Puts the log level before the message
    translateTime: 'yyyy-mm-dd HH:MM:ss', // Formats the timestamp
    ignore: 'pid,hostname' // Hides specific keys from log output
});

const logger = pino({}, stream);

module.exports = logger;
