const pinoLogger = require('../logger');

/**
 * Middleware to log request details
 * @param {Object} req - Express request object
 * @param {string} message - Message to log
 * @param {Object} [additionalInfo={}] - Additional information to log
 */
const logRequest = (req, message, additionalInfo = {}) => {
    // Create base log object with common request information
    const logObject = {
        message,
        method: req.method,
        url: req.originalUrl || req.url,
        ip: req.ip,
        userId: req.user ? req.user._id : 'anonymous',
        userEmail: req.user ? req.user.email : 'anonymous',
        sessionId: req.sessionID,
        timestamp: new Date().toISOString(),
        ...additionalInfo
    };

    // Filter out sensitive information
    if (logObject.body) {
        delete logObject.body.password;
        delete logObject.body.token;
        delete logObject.body.creditCard;
    }

    // Log at appropriate level based on additionalInfo
    if (additionalInfo.level === 'error') {
        pinoLogger.error(logObject);
    } else if (additionalInfo.level === 'warn') {
        pinoLogger.warn(logObject);
    } else {
        pinoLogger.info(logObject);
    }
};

module.exports = {
    logRequest
}; 