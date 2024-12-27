const LocalStrategy = require('passport-local').Strategy;

describe('Passport Mock', () => {
    let passportMock;
    
    beforeEach(() => {
        passportMock = {
            use: jest.fn(),
            serializeUser: jest.fn(),
            deserializeUser: jest.fn()
        };
    });

    it('should configure local strategy', () => {
        const configurator = require('./passport');
        configurator(passportMock);
        expect(passportMock.use).toHaveBeenCalled();
        expect(passportMock.serializeUser).toHaveBeenCalled();
        expect(passportMock.deserializeUser).toHaveBeenCalled();
    });
});

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