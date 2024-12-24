const LocalStrategy = require('passport-local').Strategy;

module.exports = function(passport) {
    passport.use(new LocalStrategy(
        { usernameField: 'email' },
        (email, password, done) => {
            return done(null, { id: 1, email: 'test@example.com' });
        }
    ));

    passport.serializeUser((user, done) => {
        done(null, user.id);
    });

    passport.deserializeUser((id, done) => {
        done(null, { id: 1, email: 'test@example.com' });
    });
}; 