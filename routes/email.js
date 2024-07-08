const express = require('express'); // Import Express to create a router
const router = express.Router(); // Create a new router
const nodemailer = require('nodemailer'); // Import Nodemailer for sending emails
const EmailTemplate = require('../models/EmailTemplate'); // Import the EmailTemplate model
const Claim = require('../models/Claim'); // Import the Claim model
const { ensureAuthenticated, ensureRoles } = require('../middleware/auth'); // Import authentication and role-checking middleware
const pinoLogger = require('../logger'); // Import Pino logger

// Define sensitive fields that should not be logged
const sensitiveFields = ['password', 'token', 'ssn'];

// Function to filter out sensitive fields from the request body
const filterSensitiveData = (data) => {
    if (!data || typeof data !== 'object') {
        return data;
    }

    return Object.keys(data).reduce((filteredData, key) => {
        if (sensitiveFields.includes(key)) {
            filteredData[key] = '***REDACTED***'; // Mask the sensitive field
        } else if (typeof data[key] === 'object') {
            filteredData[key] = filterSensitiveData(data[key]); // Recursively filter nested objects
        } else {
            filteredData[key] = data[key];
        }
        return filteredData;
    }, {});
};

// Helper function to log requests with user and session info
const logRequest = (req, message, extra = {}) => {
    const { method, originalUrl, headers, body } = req;
    const filteredBody = filterSensitiveData(body); // Filter sensitive data from the request body

    pinoLogger.info({
        message, // Log message
        user: req.user ? req.user.email : 'Unauthenticated', // Log user
        ip: req.ip, // Log IP address
        sessionId: req.sessionID, // Log session ID
        timestamp: new Date().toISOString(), // Add a timestamp
        method, // Log HTTP method
        url: originalUrl, // Log originating URL
        requestBody: filteredBody, // Log the filtered request body
        headers // Log request headers
    });
};

// Function to replace template variables with actual claim data
const replaceVariables = (template, claim) => {
    let body = template.body; // Get the email template body
    const variables = {
        MVA: claim.mva,
        CustomerName: claim.customerName,
        CustomerEmail: claim.customerEmail,
        CustomerNumber: claim.customerNumber,
        CustomerAddress: claim.customerAddress,
        CustomerDriversLicense: claim.customerDriversLicense,
        CarMake: claim.carMake,
        CarModel: claim.carModel,
        CarYear: claim.carYear,
        CarColor: claim.carColor,
        CarVIN: claim.carVIN,
        AccidentDate: claim.accidentDate ? claim.accidentDate.toLocaleDateString() : '',
        Billable: claim.billable ? 'Yes' : 'No',
        IsRenterAtFault: claim.isRenterAtFault ? 'Yes' : 'No',
        DamagesTotal: claim.damagesTotal,
        BodyShopName: claim.bodyShopName,
        RANumber: claim.raNumber,
        InsuranceCarrier: claim.insuranceCarrier,
        InsuranceAgent: claim.insuranceAgent,
        InsurancePhoneNumber: claim.insurancePhoneNumber,
        InsuranceFaxNumber: claim.insuranceFaxNumber,
        InsuranceAddress: claim.insuranceAddress,
        InsuranceClaimNumber: claim.insuranceClaimNumber,
        ThirdPartyName: claim.thirdPartyName,
        ThirdPartyPhoneNumber: claim.thirdPartyPhoneNumber,
        ThirdPartyInsuranceName: claim.thirdPartyInsuranceName,
        ThirdPartyPolicyNumber: claim.thirdPartyPolicyNumber,
    };

    // Replace variables in the template body
    for (const [key, value] of Object.entries(variables)) {
        body = body.replace(new RegExp(`{${key}}`, 'g'), value);
    }

    return { subject: template.subject, body };
};

// Route to display the email form
router.get('/form/:id', ensureAuthenticated, async (req, res) => {
    logRequest(req, 'Displaying email form');
    try {
        const claim = await Claim.findById(req.params.id); // Fetch the claim by ID
        const templates = await EmailTemplate.find(); // Fetch all email templates
        res.render('email_form', { claim, templates, template: { subject: '', body: '' } }); // Render the email form view
    } catch (err) {
        logRequest(req, 'Error displaying email form', { error: err });
        res.status(500).send('Server Error'); // Send server error response
    }
});

// Route to get a specific email template and replace variables
router.get('/templates/:templateId', ensureAuthenticated, async (req, res) => {
    logRequest(req, `Fetching email template with ID: ${req.params.templateId}`);
    try {
        const template = await EmailTemplate.findById(req.params.templateId); // Fetch the email template by ID
        const claim = await Claim.findById(req.query.claimId); // Fetch the claim by ID from query parameters
        const populatedTemplate = replaceVariables(template, claim); // Replace template variables with claim data
        logRequest(req, 'Email template fetched and variables replaced', { template: populatedTemplate });
        res.json(populatedTemplate); // Send the populated template as JSON response
    } catch (err) {
        logRequest(req, 'Error fetching email template', { error: err });
        res.status(500).send('Server Error'); // Send server error response
    }
});

// Route to display the email sending form
router.get('/send/:claimId', ensureAuthenticated, ensureRoles(['admin', 'manager']), async (req, res) => {
    logRequest(req, `Displaying email sending form for claim ID: ${req.params.claimId}`);
    try {
        const claim = await Claim.findById(req.params.claimId).exec(); // Fetch the claim by ID
        const templates = await EmailTemplate.find().exec(); // Fetch all email templates
        res.render('email_form', { claim, templates, body: '' }); // Render the email form view
    } catch (err) {
        logRequest(req, 'Error displaying email sending form', { error: err });
        res.status(500).send('Server Error'); // Send server error response
    }
});

// Route to send an email
router.post('/send', ensureAuthenticated, async (req, res) => {
    const { email, subject, body } = req.body; // Extract email details from the request body
    logRequest(req, 'Sending email', { email, subject });

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
        },
        debug: true, // Enable debug output
        logger: true // Enable logger
    });

    // Send mail with defined transport object
    transporter.sendMail({
        from: process.env.EMAIL_USER, // Sender address
        to: email, // List of receivers
        subject: subject, // Subject line
        text: body, // Plain text body
    }, (error, info) => {
        if (error) {
            logRequest(req, 'Error sending email', { error });
            return res.status(500).json({ error: 'Failed to send email' }); // Send failure response
        }
        logRequest(req, 'Email sent successfully', { messageId: info.messageId });
        res.json({ success: 'Email sent successfully' }); // Send success response
    });
});

module.exports = router; // Export the router
