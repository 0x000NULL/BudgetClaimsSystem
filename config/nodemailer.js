const nodemailer = require('nodemailer'); // Import Nodemailer for email sending

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
        ciphers: 'SSLv3' // Use SSLv3 for TLS
    }
});

// Verify connection configuration
transporter.verify((error, success) => {
    if (error) {
        console.log('Error with email configuration:', error);
    } else {
        console.log('Email configuration is correct.');
    }
});

// Export the transporter object for use in other modules
module.exports = transporter;
