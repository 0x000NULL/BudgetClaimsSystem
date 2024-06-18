module.exports = {
    // Middleware to ensure the user is authenticated
    ensureAuthenticated: function (req, res, next) {
        if (req.isAuthenticated()) {
            return next(); // Proceed to the next middleware or route handler if authenticated
        }
        res.redirect('/login'); // Redirect to the login page if not authenticated
    },

    // Middleware to ensure the user has a specific role
    ensureRole: function (role) {
        return function (req, res, next) {
            if (req.isAuthenticated() && req.user.role === role) {
                return next(); // Proceed to the next middleware or route handler if authenticated and has the required role
            }
            res.status(403).send('Access Denied'); // Deny access if not authenticated or role does not match
        };
    },

    // Middleware to ensure the user has one of the specified roles
    ensureRoles: function (roles) {
        return function (req, res, next) {
            if (req.isAuthenticated() && roles.includes(req.user.role)) {
                return next(); // Proceed to the next middleware or route handler if authenticated and role is in the allowed list
            }
            res.status(403).send('Access Denied'); // Deny access if not authenticated or role does not match any in the list
        };
    }
};
