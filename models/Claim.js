const mongoose = require('mongoose');

const ClaimSchema = new mongoose.Schema({
    mva: { type: String, required: true },
    customerName: { type: String },
    customerNumber: { type: String },
    customerEmail: { type: String },
    customerAddress: { type: String },
    customerDriversLicense: { type: String },
    carMake: { type: String },
    carModel: { type: String },
    carYear: { type: String },
    carColor: { type: String },
    carVIN: { type: String },
    accidentDate: { type: Date },
    billable: { type: Boolean },
    isRenterAtFault: { type: Boolean },
    damagesTotal: { type: Number },
    bodyShopName: { type: String },
    raNumber: { type: String },
    insuranceCarrier: { type: String },
    insuranceAgent: { type: String },
    insurancePhoneNumber: { type: String },
    insuranceFaxNumber: { type: String },
    insuranceAddress: { type: String },
    insuranceClaimNumber: { type: String },
    thirdPartyName: { type: String },
    thirdPartyPhoneNumber: { type: String },
    thirdPartyInsuranceName: { type: String },
    thirdPartyPolicyNumber: { type: String },
    description: { type: String },
    status: { type: String },
    files: [{ type: String }]
}, { timestamps: true });

module.exports = mongoose.model('Claim', ClaimSchema);
