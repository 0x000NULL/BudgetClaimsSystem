console.log("Loading auth middleware..."); // Log message indicating the start of middleware loading

// Middleware to ensure the user is authenticated
const ensureAuthenticated = function (req, res, next) {
    console.log("ensureAuthenticated called"); // Log message indicating that the middleware was called
    if (req.isAuthenticated()) { // Check if the user is authenticated
        return next(); // If authenticated, proceed to the next middleware or route handler
    }
    res.redirect('/login'); // If not authenticated, redirect to the login page
};

// Middleware to ensure the user has a specific role
const ensureRole = function (role) {
    console.log("ensureRole called with role:", role); // Log message indicating the middleware was called with a specific role
    return function (req, res, next) {
        if (req.isAuthenticated() && req.user.role === role) { // Check if the user is authenticated and has the specified role
            return next(); // If the user has the specified role, proceed to the next middleware or route handler
        }
        res.status(403).send('Access Denied'); // If the user does not have the specified role, respond with a 403 status
    };
};

// Middleware to ensure the user has one of the specified roles
const ensureRoles = function (roles) {
    console.log("ensureRoles called with roles:", roles); // Log message indicating the middleware was called with specific roles
    return function (req, res, next) {
        if (req.isAuthenticated() && roles.includes(req.user.role)) { // Check if the user is authenticated and has one of the specified roles
            return next(); // If the user has one of the specified roles, proceed to the next middleware or route handler
        }
        res.status(403).send('Access Denied'); // If the user does not have one of the specified roles, respond with a 403 status
    };
};

// Export the middleware functions
module.exports = {
    ensureAuthenticated,
    ensureRole,
    ensureRoles
};

console.log("Auth middleware loaded"); // Log message indicating the middleware has been loaded
