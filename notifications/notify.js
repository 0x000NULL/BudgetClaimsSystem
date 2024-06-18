const sendEmail = require('../config/nodemailer'); // Import the sendEmail function from the nodemailer configuration

// Function to send notification when a new claim is created
const notifyNewClaim = (userEmail, claimDetails) => {
    // Email subject and text content
    const subject = 'New Claim Created';
    const text = `A new claim has been created with the following details:\n\n` +
        `MVA: ${claimDetails.mva}\n` +
        `Customer Name: ${claimDetails.customerName}\n` +
        `Description: ${claimDetails.description}\n` +
        `Status: ${claimDetails.status}\n\n` +
        `Please review the claim.`;

    // Send the email
    sendEmail(userEmail, subject, text);
};

// Function to send notification when a claim status is updated
const notifyClaimStatusUpdate = (userEmail, claimDetails) => {
    // Email subject and text content
    const subject = 'Claim Status Updated';
    const text = `The status of the following claim has been updated:\n\n` +
        `MVA: ${claimDetails.mva}\n` +
        `Customer Name: ${claimDetails.customerName}\n` +
        `Description: ${claimDetails.description}\n` +
        `New Status: ${claimDetails.status}\n\n` +
        `Please review the updated claim.`;

    // Send the email
    sendEmail(userEmail, subject, text);
};

// Function to send reminder notifications for pending tasks
const notifyPendingTasks = (userEmail, pendingTasks) => {
    // Email subject and text content
    const subject = 'Reminder: Pending Tasks';
    const text = `You have the following pending tasks:\n\n` +
        pendingTasks.map(task => `- ${task}`).join('\n') + '\n\n' +
        `Please complete these tasks as soon as possible.`;

    // Send the email
    sendEmail(userEmail, subject, text);
};

// Export the notification functions
module.exports = {
    notifyNewClaim,
    notifyClaimStatusUpdate,
    notifyPendingTasks
};
