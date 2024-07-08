const nodemailer = require('nodemailer'); // Import Nodemailer for email sending
const pinoLogger = require('../logger'); // Import Pino logger

// Validate environment variables
if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error('EMAIL_USER and EMAIL_PASS environment variables are required.');
}

// Create a transporter object using the Office365 SMTP transport
const transporter = nodemailer.createTransport({
    host: 'smtp.office365.com', // SMTP server address for Office365
    port: 587, // Port number for TLS/STARTTLS
    secure: false, // Set to true if using port 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER, // Email user from environment variables
        pass: process.env.EMAIL_PASS  // Email password from environment variables
    },
    tls: {
        rejectUnauthorized: true // Enforce strict TLS
    },
    logger: pinoLogger, // Use Pino logger for Nodemailer
    debug: true // Enable debug output
});

// Verify connection configuration
transporter.verify((error, success) => {
    if (error) {
        pinoLogger.error('Error with email configuration:', error); // Log error if verification fails
    } else {
        pinoLogger.info('Email configuration is correct.'); // Log success if verification is successful
    }
});

// Export the transporter object for use in other modules
module.exports = transporter;
