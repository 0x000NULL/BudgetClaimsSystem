module.exports = (passport) => {
    // Mock passport configuration
    passport.use = jest.fn();
    passport.serializeUser = jest.fn();
    passport.deserializeUser = jest.fn();
}; 