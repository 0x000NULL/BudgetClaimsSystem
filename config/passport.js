// Import required modules
const LocalStrategy = require('passport-local').Strategy; // Import the local strategy from Passport.js
const bcrypt = require('bcryptjs'); // Import Bcrypt for password hashing
const User = require('../models/User'); // Import the User model

// Export a function to configure Passport.js
module.exports = function (passport) {
    // Define the local strategy for Passport.js
    passport.use(new LocalStrategy({ usernameField: 'email' }, (email, password, done) => {
        // Find a user by email
        User.findOne({ email: email })
            .then(user => {
                if (!user) {
                    // If no user is found, return an error
                    return done(null, false, { message: 'That email is not registered' });
                }

                // Compare the provided password with the stored hash
                bcrypt.compare(password, user.password, (err, isMatch) => {
                    if (err) throw err;
                    if (isMatch) {
                        // If the password matches, return the user
                        return done(null, user);
                    } else {
                        // If the password doesn't match, return an error
                        return done(null, false, { message: 'Password incorrect' });
                    }
                });
            })
            .catch(err => console.log(err)); // Log any errors that occur
    }));

    // Serialize user instances to the session
    passport.serializeUser((user, done) => {
        done(null, user.id); // Serialize the user ID to the session
    });

    // Deserialize user instances from the session
    passport.deserializeUser((id, done) => {
        User.findById(id, (err, user) => {
            done(err, user); // Deserialize the user ID from the session and find the user in the database
        });
    });
};
