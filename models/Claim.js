const mongoose = require('mongoose');

const ClaimSchema = new mongoose.Schema({
    mva: {
        type: String,
        required: false
    },
    customerName: {
        type: String,
        required: false
    },
    customerNumber: {
        type: String,
        required: false
    },
    customerEmail: {
        type: String,
        required: false
    },
    customerAddress: {
        type: String,
        required: false
    },
    customerDriversLicense: {
        type: String,
        required: false
    },
    carMake: {
        type: String,
        required: false
    },
    carModel: {
        type: String,
        required: false
    },
    carYear: {
        type: String,
        required: false
    },
    carColor: {
        type: String,
        required: false
    },
    carVIN: {
        type: String,
        required: false
    },
    accidentDate: {
        type: Date,
        required: false
    },
    billable: {
        type: Boolean,
        required: false
    },
    isRenterAtFault: {
        type: Boolean,
        required: false
    },
    damagesTotal: {
        type: Number,
        required: false
    },
    bodyShopName: {
        type: String,
        required: false
    },
    raNumber: {
        type: String,
        required: false
    },
    insuranceCarrier: {
        type: String,
        required: false
    },
    insuranceAgent: {
        type: String,
        required: false
    },
    insurancePhoneNumber: {
        type: String,
        required: false
    },
    insuranceFaxNumber: {
        type: String,
        required: false
    },
    insuranceAddress: {
        type: String,
        required: false
    },
    insuranceClaimNumber: {
        type: String,
        required: false
    },
    thirdPartyName: {
        type: String,
        required: false
    },
    thirdPartyPhoneNumber: {
        type: String,
        required: false
    },
    thirdPartyInsuranceName: {
        type: String,
        required: false
    },
    thirdPartyPolicyNumber: {
        type: String,
        required: false
    },
    rentingLocation: {
        type: String,
        enum: ['LAS Airport', 'Henderson Executive Airport', 'Toyota Las Vegas', 'Center Strip', 'Losee', 'Tropicana', 'West Sahara', 'Gibson', 'Golden Nugget'],
        required: false
    },
    ldwAccepted: {
        type: Boolean,
        required: false
    },
    policeDepartment: {
        type: String,
        required: false
    },
    policeReportNumber: {
        type: String,
        required: false
    },
    claimCloseDate: {
        type: Date,
        required: false
    },
    vehicleOdometer: {
        type: Number,
        required: false
    },
    description: {
        type: String,
        required: false
    },
    status: {
        type: String,
        required: false
    },
    files: {
        incidentReports: [String],
        correspondence: [String],
        rentalAgreement: [String],
        policeReport: [String],
        invoices: [String],
        photos: [String]
    },
    versions: {
        type: [Object]
    },
    date: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Claim', ClaimSchema);
