const activityLogger = {
    logActivity: jest.fn().mockImplementation((action) => (req, res, next) => {
        if (next) next();
    })
};

describe('Activity Logger Mock', () => {
    it('should call next middleware', () => {
        const req = {};
        const res = {};
        const next = jest.fn();

        const middleware = activityLogger.logActivity('test-action');
        middleware(req, res, next);
        expect(next).toHaveBeenCalled();
    });

    it('should be a function', () => {
        expect(typeof activityLogger.logActivity).toBe('function');
    });
});

module.exports = activityLogger; 