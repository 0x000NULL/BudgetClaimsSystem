console.log("Loading auth middleware...");

const ensureAuthenticated = function (req, res, next) {
    console.log("ensureAuthenticated called");
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login');
};

const ensureRole = function (role) {
    console.log("ensureRole called with role:", role);
    return function (req, res, next) {
        if (req.isAuthenticated() && req.user.role === role) {
            return next();
        }
        res.status(403).send('Access Denied');
    };
};

const ensureRoles = function (roles) {
    console.log("ensureRoles called with roles:", roles);
    return function (req, res, next) {
        if (req.isAuthenticated() && roles.includes(req.user.role)) {
            return next();
        }
        res.status(403).send('Access Denied');
    };
};

module.exports = {
    ensureAuthenticated,
    ensureRole,
    ensureRoles
};

console.log("Auth middleware loaded");
