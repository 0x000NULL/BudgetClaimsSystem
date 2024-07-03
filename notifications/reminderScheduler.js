const cron = require('node-cron'); // Import node-cron for scheduling tasks
const User = require('../models/User'); // Import the User model to fetch users from the database
const { notifyPendingTasks } = require('./notify'); // Import the notifyPendingTasks function from the notify module

// Function to get pending tasks for a user (this is an example function and should be replaced with actual logic)
const getPendingTasks = (userId) => {
    // Implement logic to retrieve pending tasks for the user
    // For now, we'll return a dummy list of tasks
    return ['Task 1', 'Task 2', 'Task 3'];
};

// Schedule a task to run every day at 8 AM
cron.schedule('365 8 * * *', () => {
    // Fetch all users from the database
    User.find()
        .then(users => {
            // Iterate over each user
            users.forEach(user => {
                // Get pending tasks for the user
                const pendingTasks = getPendingTasks(user._id);
                if (pendingTasks.length > 0) {
                    // Send a notification to the user about pending tasks
                    notifyPendingTasks(user.email, pendingTasks);
                }
            });
        })
        .catch(err => {
            console.error('Error retrieving users:', err); // Log any errors that occur while fetching users
        });
});
