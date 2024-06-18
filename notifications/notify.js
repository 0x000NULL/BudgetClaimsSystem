const transporter = require('../config/nodemailer'); // Import the Nodemailer configuration

// Function to send notification when a new claim is created
const notifyNewClaim = (userEmail, claimDetails) => {
    const subject = 'New Claim Created';
    const text = `A new claim has been created with the following details:\n\n` +
        `MVA: ${claimDetails.mva}\n` +
        `Customer Name: ${claimDetails.customerName}\n` +
        `Description: ${claimDetails.description}\n` +
        `Status: ${claimDetails.status}\n\n` +
        `Please review the claim.`;

    // Setup email options
    const mailOptions = {
        from: process.env.EMAIL_USER, // Sender address from environment variables
        to: userEmail, // Recipient address
        subject: subject, // Subject of the email
        text: text // Plain text body of the email
    };

    // Send the email
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('Error sending email:', error);
        } else {
            console.log('Email sent:', info.response);
        }
    });
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

    // Setup email options
    const mailOptions = {
        from: process.env.EMAIL_USER, // Sender address from environment variables
        to: userEmail, // Recipient address
        subject: subject, // Subject of the email
        text: text // Plain text body of the email
    };

    // Send the email
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('Error sending email:', error);
        } else {
            console.log('Email sent:', info.response);
        }
    });
};

// Function to send reminder notifications for pending tasks
const notifyPendingTasks = (userEmail, pendingTasks) => {
    const subject = 'Reminder: Pending Tasks';
    const text = `You have the following pending tasks:\n\n` +
        pendingTasks.map(task => `- ${task}`).join('\n') + '\n\n' +
        `Please complete these tasks as soon as possible.`;

    // Setup email options
    const mailOptions = {
        from: process.env.EMAIL_USER, // Sender address from environment variables
        to: userEmail, // Recipient address
        subject: subject, // Subject of the email
        text: text // Plain text body of the email
    };

    // Send the email
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('Error sending email:', error);
        } else {
            console.log('Email sent:', info.response);
        }
    });
};

module.exports = {
    notifyNewClaim,
    notifyClaimStatusUpdate,
    notifyPendingTasks
};
