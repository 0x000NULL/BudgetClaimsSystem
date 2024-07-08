const pinoLogger = require('../logger'); // Import Pino logger

pinoLogger.info("Loading auth middleware..."); // Log message indicating the start of middleware loading

// Middleware to ensure the user is authenticated
const ensureAuthenticated = function (req, res, next) {
    pinoLogger.info({
        message: "ensureAuthenticated called",
        user: req.user ? req.user.email : 'Unauthenticated', // Log user if available
        ip: req.ip, // Log IP address
        sessionId: req.sessionID // Log session ID
    });

    if (req.isAuthenticated()) { // Check if the user is authenticated
        pinoLogger.info({
            message: "User is authenticated",
            user: req.user.email,
            ip: req.ip,
            sessionId: req.sessionID
        });
        return next(); // If authenticated, proceed to the next middleware or route handler
    }

    pinoLogger.warn({
        message: "User not authenticated, redirecting to login",
        ip: req.ip,
        sessionId: req.sessionID
    });
    res.redirect('/login'); // If not authenticated, redirect to the login page
};

// Middleware to ensure the user has a specific role
const ensureRole = function (role) {
    pinoLogger.info({
        message: "ensureRole called",
        role: role
    });

    return function (req, res, next) {
        if (req.isAuthenticated() && req.user.role === role) { // Check if the user is authenticated and has the specified role
            pinoLogger.info({
                message: `User has the required role: ${role}`,
                user: req.user.email,
                role: req.user.role,
                ip: req.ip,
                sessionId: req.sessionID
            });
            return next(); // If the user has the specified role, proceed to the next middleware or route handler
        }

        pinoLogger.warn({
            message: "Access denied - User does not have the required role",
            requiredRole: role,
            user: req.user ? req.user.email : 'Unauthenticated',
            userRole: req.user ? req.user.role : 'None',
            ip: req.ip,
            sessionId: req.sessionID
        });
        res.status(403).send('Access Denied'); // If the user does not have the specified role, respond with a 403 status
    };
};

// Middleware to ensure the user has one of the specified roles
const ensureRoles = function (roles) {
    pinoLogger.info({
        message: "ensureRoles called",
        roles: roles
    });

    return function (req, res, next) {
        if (req.isAuthenticated() && roles.includes(req.user.role)) { // Check if the user is authenticated and has one of the specified roles
            pinoLogger.info({
                message: `User has one of the required roles: ${roles}`,
                user: req.user.email,
                role: req.user.role,
                ip: req.ip,
                sessionId: req.sessionID
            });
            return next(); // If the user has one of the specified roles, proceed to the next middleware or route handler
        }

        pinoLogger.warn({
            message: "Access denied - User does not have one of the required roles",
            requiredRoles: roles,
            user: req.user ? req.user.email : 'Unauthenticated',
            userRole: req.user ? req.user.role : 'None',
            ip: req.ip,
            sessionId: req.sessionID
        });
        res.status(403).send('Access Denied'); // If the user does not have one of the specified roles, respond with a 403 status
    };
};

// Export the middleware functions
module.exports = {
    ensureAuthenticated,
    ensureRole,
    ensureRoles
};

pinoLogger.info("Auth middleware loaded"); // Log message indicating the middleware has been loaded
