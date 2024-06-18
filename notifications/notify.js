const sendEmail = require('../config/nodemailer');

// Function to send notification when a new claim is created
const notifyNewClaim = (userEmail, claimDetails) => {
    const subject = 'New Claim Created';
    const text = `A new claim has been created with the following details:\n\n` +
        `MVA: ${claimDetails.mva}\n` +
        `Customer Name: ${claimDetails.customerName}\n` +
        `Description: ${claimDetails.description}\n` +
        `Status: ${claimDetails.status}\n\n` +
        `Please review the claim.`;

    sendEmail(userEmail, subject, text);
};

// Function to send notification when a claim status is updated
const notifyClaimStatusUpdate = (userEmail, claimDetails) => {
    const subject = 'Claim Status Updated';
    const text = `The status of the following claim has been updated:\n\n` +
        `MVA: ${claimDetails.mva}\n` +
        `Customer Name: ${claimDetails.customerName}\n` +
        `Description: ${claimDetails.description}\n` +
        `New Status: ${claimDetails.status}\n\n` +
        `Please review the updated claim.`;

    sendEmail(userEmail, subject, text);
};

// Function to send reminder notifications for pending tasks
const notifyPendingTasks = (userEmail, pendingTasks) => {
    const subject = 'Reminder: Pending Tasks';
    const text = `You have the following pending tasks:\n\n` +
        pendingTasks.map(task => `- ${task}`).join('\n') + '\n\n' +
        `Please complete these tasks as soon as possible.`;

    sendEmail(userEmail, subject, text);
};

module.exports = {
    notifyNewClaim,
    notifyClaimStatusUpdate,
    notifyPendingTasks
};
