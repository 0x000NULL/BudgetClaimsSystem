const nodemailer = require('nodemailer'); // Import Nodemailer for email sending

// Create a transporter object using the default SMTP transport
const transporter = nodemailer.createTransport({
    service: 'Gmail', // Use Gmail as the email service
    auth: {
        user: process.env.EMAIL_USER, // Email user from environment variables
        pass: process.env.EMAIL_PASS  // Email password from environment variables
    }
});

// Verify connection configuration
transporter.verify((error, success) => {
    if (error) {
        console.log('Error with email configuration:', error); // Log any errors with the email configuration
    } else {
        console.log('Email configuration is correct.'); // Log successful email configuration
    }
});

// Export the transporter object for use in other modules
module.exports = transporter;
