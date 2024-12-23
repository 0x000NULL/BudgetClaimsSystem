module.exports = () => (req, res, next) => {
    req.log = {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn()
    };
    next();
}; 