const LocalStrategy = require('passport-local').Strategy; // Import Passport LocalStrategy for local authentication
const bcrypt = require('bcryptjs'); // Import bcrypt for password hashing and comparison
const User = require('../models/User'); // Import User model to interact with the users collection in MongoDB

module.exports = function (passport) {
    // Define a new Passport LocalStrategy
    passport.use(
        new LocalStrategy({ usernameField: 'email' }, (email, password, done) => {
            // Match user based on the provided email
            User.findOne({ email: email })
                .then(user => {
                    // If no user is found with the provided email
                    if (!user) {
                        return done(null, false, { message: 'That email is not registered' });
                    }

                    // Compare the provided password with the stored hashed password
                    bcrypt.compare(password, user.password, (err, isMatch) => {
                        if (err) {
                            console.log('Error comparing passwords:', err); // Log any errors during password comparison
                            throw err; // Throw error if there is an issue during comparison
                        }
                        console.log('Stored password hash:', user.password); // Log the stored password hash for debugging
                        console.log('Entered password:', password); // Log the entered password for debugging
                        if (isMatch) {
                            console.log('Password matched'); // Log if passwords match
                            return done(null, user); // Return the user object if passwords match
                        } else {
                            console.log('Password did not match'); // Log if passwords do not match
                            return done(null, false, { message: 'Password incorrect' }); // Return false if passwords do not match
                        }
                    });
                })
                .catch(err => console.log(err)); // Log any errors during the process
        })
    );

    // Serialize user instance to store user ID in the session
    passport.serializeUser((user, done) => {
        done(null, user.id);
    });

    // Deserialize user instance by user ID stored in the session
    passport.deserializeUser((id, done) => {
        User.findById(id, (err, user) => {
            done(err, user);
        });
    });
};
