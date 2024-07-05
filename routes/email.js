const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const EmailTemplate = require('../models/EmailTemplate');
const Claim = require('../models/Claim');
const { ensureAuthenticated, ensureRoles } = require('../middleware/auth');

// Function to replace template variables with actual claim data
const replaceVariables = (template, claim) => {
    let body = template.body;
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
    const claim = await Claim.findById(req.params.id);
    const templates = await EmailTemplate.find();
    res.render('email_form', { claim, templates, template: { subject: '', body: '' } });
});

// Route to get a specific email template and replace variables
router.get('/templates/:templateId', ensureAuthenticated, async (req, res) => {
    const template = await EmailTemplate.findById(req.params.templateId);
    const claim = await Claim.findById(req.query.claimId);
    const populatedTemplate = replaceVariables(template, claim);
    res.json(populatedTemplate);
});

router.get('/send/:claimId', ensureAuthenticated, ensureRoles(['admin', 'manager']), async (req, res) => {
    try {
        const claim = await Claim.findById(req.params.claimId).exec();
        const templates = await EmailTemplate.find().exec();
        res.render('email_form', { claim, templates, body: '' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// Route to send an email
router.post('/send', ensureAuthenticated, async (req, res) => {
    const { email, subject, body } = req.body;

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
            console.error('Error sending email:', error);
            return res.status(500).json({ error: 'Failed to send email' });
        }
        console.log('Message sent:', info.messageId);
        res.json({ success: 'Email sent successfully' });
    });
});

module.exports = router;
