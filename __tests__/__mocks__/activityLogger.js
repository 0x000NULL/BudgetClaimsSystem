const activityLogger = jest.fn((req, res, next) => {
    if (next) next();
});

module.exports = activityLogger; 