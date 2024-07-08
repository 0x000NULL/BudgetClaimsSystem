const LocalStrategy = require('passport-local').Strategy; // Import Passport LocalStrategy for local authentication
const bcrypt = require('bcryptjs'); // Import bcrypt for password hashing and comparison
const User = require('../models/User'); // Import User model to interact with the users collection in MongoDB
const pinoLogger = require('../logger'); // Import Pino logger

module.exports = function (passport) {
    // Define a new Passport LocalStrategy
    passport.use(
        new LocalStrategy({ usernameField: 'email' }, (email, password, done) => {
            // Log the email being used for authentication
            pinoLogger.info({
                message: 'Attempting to authenticate user',
                email,
                timestamp: new Date().toISOString()
            });

            // Match user based on the provided email
            User.findOne({ email: email })
                .then(user => {
                    // If no user is found with the provided email
                    if (!user) {
                        pinoLogger.warn({
                            message: 'Authentication failed: email not registered',
                            email,
                            timestamp: new Date().toISOString()
                        });
                        return done(null, false, { message: 'That email is not registered' });
                    }

                    // Compare the provided password with the stored hashed password
                    bcrypt.compare(password, user.password, (err, isMatch) => {
                        if (err) {
                            pinoLogger.error({
                                message: 'Error comparing passwords',
                                error: err.message,
                                email,
                                timestamp: new Date().toISOString()
                            });
                            throw err; // Throw error if there is an issue during comparison
                        }

                        pinoLogger.info({
                            message: 'Password comparison completed',
                            email,
                            isMatch,
                            timestamp: new Date().toISOString()
                        });

                        if (isMatch) {
                            pinoLogger.info({
                                message: 'Password matched',
                                email,
                                timestamp: new Date().toISOString()
                            });
                            return done(null, user); // Return the user object if passwords match
                        } else {
                            pinoLogger.warn({
                                message: 'Password did not match',
                                email,
                                timestamp: new Date().toISOString()
                            });
                            return done(null, false, { message: 'Password incorrect' }); // Return false if passwords do not match
                        }
                    });
                })
                .catch(err => {
                    pinoLogger.error({
                        message: 'Error during user authentication',
                        error: err.message,
                        email,
                        timestamp: new Date().toISOString()
                    });
                    return done(err);
                });
        })
    );

    // Serialize user instance to store user ID in the session
    passport.serializeUser((user, done) => {
        pinoLogger.info({
            message: 'Serializing user',
            userId: user.id,
            timestamp: new Date().toISOString()
        });
        done(null, user.id);
    });

    // Deserialize user instance by user ID stored in the session
    passport.deserializeUser((id, done) => {
        User.findById(id, (err, user) => {
            if (err) {
                pinoLogger.error({
                    message: 'Error deserializing user',
                    error: err.message,
                    userId: id,
                    timestamp: new Date().toISOString()
                });
            } else {
                pinoLogger.info({
                    message: 'User deserialized',
                    userId: id,
                    timestamp: new Date().toISOString()
                });
            }
            done(err, user);
        });
    });
};
