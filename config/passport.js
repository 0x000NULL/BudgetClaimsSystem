/**
 * Configures Passport.js for local authentication using email and password.
 * 
 * @param {object} passport - The Passport.js instance to configure.
 * 
 * @requires passport-local.Strategy - Passport LocalStrategy for local authentication.
 * @requires bcryptjs - Library for password hashing and comparison.
 * @requires ../models/User - User model to interact with the users collection in MongoDB.
 * @requires ../logger - Pino logger for logging authentication events.
 * 
 * @function
 * @name configurePassport
 * 
 * @description
 * This function sets up Passport.js to use the local strategy for authentication.
 * It defines the strategy to authenticate users based on their email and password.
 * It also sets up serialization and deserialization of user instances to manage sessions.
 * 
 * @param {object} passport - The Passport.js instance to configure.
 * 
 * @example
 * const passport = require('passport');
 * const configurePassport = require('./config/passport');
 * configurePassport(passport);
 */
const LocalStrategy = require('passport-local').Strategy; // Import Passport LocalStrategy for local authentication
const bcrypt = require('bcryptjs'); // Import bcrypt for password hashing and comparison
const User = require('../models/User'); // Import User model to interact with the users collection in MongoDB
const pinoLogger = require('../logger'); // Import Pino logger

module.exports = function (passport) {
    // Define a new Passport LocalStrategy
    passport.use(
        new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
            // Log the email being used for authentication
            pinoLogger.info({
                message: 'Attempting to authenticate user',
                email,
                timestamp: new Date().toISOString()
            });

            try {
                // Match user based on the provided email
                const user = await User.findOne({ email: email });

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
                const isMatch = await bcrypt.compare(password, user.password);
                
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
            } catch (err) {
                pinoLogger.error({
                    message: 'Error during user authentication',
                    error: err.message,
                    email,
                    timestamp: new Date().toISOString()
                });
                return done(err);
            }
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
    passport.deserializeUser(async (id, done) => {
        try {
            const user = await User.findById(id);
            if (!user) {
                pinoLogger.warn({
                    message: 'User not found during deserialization',
                    userId: id,
                    timestamp: new Date().toISOString()
                });
                return done(null, false);
            }

            pinoLogger.info({
                message: 'User deserialized',
                userId: id,
                timestamp: new Date().toISOString()
            });
            done(null, user);
        } catch (err) {
            pinoLogger.error({
                message: 'Error deserializing user',
                error: err.message,
                userId: id,
                timestamp: new Date().toISOString()
            });
            done(err, null);
        }
    });
};
