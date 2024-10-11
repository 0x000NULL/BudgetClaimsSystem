const mongoose = require('mongoose'); // Import Mongoose to interact with MongoDB
const Schema = mongoose.Schema; // Use Schema to define the structure of documents in the collection

// Define the schema for a Claim
const ClaimSchema = new Schema({
    // Field for the MVA number
    mva: {
        type: String, // Data type is String
        required: false // This field is not required
    },
    // Field for the customer's name
    customerName: {
        type: String, // Data type is String
        required: false // This field is not required
    },
    // Field for the customer's number
    customerNumber: {
        type: String, // Data type is String
        required: false // This field is not required
    },
    // Field for the customer's email
    customerEmail: {
        type: String, // Data type is String
        required: false // This field is not required
    },
    // Field for the customer's address
    customerAddress: {
        type: String, // Data type is String
        required: false // This field is not required
    },
    // Field for the customer's driver's license number
    customerDriversLicense: {
        type: String, // Data type is String
        required: false // This field is not required
    },
    // Field for the car make
    carMake: {
        type: String, // Data type is String
        required: false // This field is not required
    },
    // Field for the car model
    carModel: {
        type: String, // Data type is String
        required: false // This field is not required
    },
    // Field for the car year
    carYear: {
        type: String, // Data type is String
        required: false // This field is not required
    },
    // Field for the car color
    carColor: {
        type: String, // Data type is String
        required: false // This field is not required
    },
    // Field for the car VIN number
    carVIN: {
        type: String, // Data type is String
        required: false // This field is not required
    },
    // Field for the accident date
    accidentDate: {
        type: Date, // Data type is Date
        required: false // This field is not required
    },
    // Field for whether the claim is billable
    billable: {
        type: Boolean, // Data type is Boolean
        required: false // This field is not required
    },
    // Field for whether the renter is at fault
    isRenterAtFault: {
        type: Boolean, // Data type is Boolean
        required: false // This field is not required
    },
    // Field for the total damages
    damagesTotal: {
        type: Number, // Data type is Number
        required: false // This field is not required
    },
    // Field for the body shop name
    bodyShopName: {
        type: String, // Data type is String
        required: false // This field is not required
    },
    // Field for the RA number
    raNumber: {
        type: String, // Data type is String
        required: false // This field is not required
    },
    // Field for the insurance carrier
    insuranceCarrier: {
        type: String, // Data type is String
        required: false // This field is not required
    },
    // Field for the insurance adjuster
    insuranceAdjuster: {
        type: String, // Data type is String
        required: false // This field is not required
    },
    // Field for the insurance email
    insuranceEmail: {
        type: String, // Data type is String
        required: false // This field is not required
    },
    // Field for the insurance phone number
    insurancePhoneNumber: {
        type: String, // Data type is String
        required: false // This field is not required
    },
    // Field for the insurance fax number
    insuranceFaxNumber: {
        type: String, // Data type is String
        required: false // This field is not required
    },
    // Field for the insurance address
    insuranceAddress: {
        type: String, // Data type is String
        required: false // This field is not required
    },
    // Field for the insurance policy number
    insurancePolicyNumber: {
        type: String, // Data type is String
        required: false // This field is not required
    },
    // Field for the insurance claim number
    insuranceClaimNumber: {
        type: String, // Data type is String
        required: false // This field is not required
    },
    // Field for the third party's name
    thirdPartyName: {
        type: String, // Data type is String
        required: false // This field is not required
    },
    // Field for the third party's address
    thirdPartyAddress: {
        type: String, // Data type is String
        required: false // This field is not required
    },
    // Field for the third party's phone number
    thirdPartyPhoneNumber: {
        type: String, // Data type is String
        required: false // This field is not required
    },
    // Field for the third party's insurance name
    thirdPartyInsuranceName: {
        type: String, // Data type is String
        required: false // This field is not required
    },
    // Field for the third party's adjuster name
    thirdPartyAdjusterName: {
        type: String, // Data type is String
        required: false // This field is not required
    },
    // Field for the third party's policy number
    thirdPartyPolicyNumber: {
        type: String, // Data type is String
        required: false // This field is not required
    },
    // Field for the third party's claim number
    thirdPartyClaimNumber: {
        type: String, // Data type is String
        required: false // This field is not required
    },
    // Field for the renting location
    rentingLocation: {
        type: String, // Data type is String
        required: false // This field is not required
    },
    // Field for whether LDW was accepted
    ldwAccepted: {
        type: Boolean, // Data type is Boolean
        required: false // This field is not required
    },
    // Field for the police department
    policeDepartment: {
        type: String, // Data type is String
        required: false // This field is not required
    },
    // Field for the police report number
    policeReportNumber: {
        type: String, // Data type is String
        required: false // This field is not required
    },
    // Field for the claim close date
    claimCloseDate: {
        type: Date, // Data type is Date
        required: false // This field is not required
    },
    // Field for the vehicle odometer reading
    vehicleOdometer: {
        type: Number, // Data type is Number
        required: false // This field is not required
    },
    // Field for the description of the claim
    description: {
        type: String, // Data type is String
        required: false // This field is not required
    },
    // Field for the damage type
    damageType: {
        type: [String], // Data type is an array of strings
        enum: ['Heavy hit', 'Light hit', 'Mystery', 'Tire', 'Windshield', 'Undercarriage', 'Mechanical', 'Interior', 'Trunk', 'Gas/Tank', 'Roof', 'Driver Front Door', 'Driver Rear Door', 'Passenger Rear Door', 'Passenger Front Door', 'Left Rear Bumper', 'Right Rear Bumper', 'Rear Bumper', 'Left Front Bumper', 'Right Front Bumper', 'Front Bumper', 'Headlamp', 'Tail Light', 'Window', 'Left Quarter Panel', 'Right Quarter Panel', 'Right Fender', 'Left Fender', 'Hood', 'Mirrors', 'Left Rocker', 'Right Rocker', 'Vandalism', 'Stolen', 'Totaled', 'Total - Flood', 'Total - Fire', 'Total - Hail', 'Total - Biohazard', 'Left Pillar', 'Right Pillar', 'Stolen - Recovered', 'Employee'], // Possible values for damage type
        required: false // This field is not required
    },
    // Field for the claim status
    status: {
        type: [String], // Data type is an array of strings
        enum: ['Closed', 'Vince Pre-Sub', 'Vince Sub', 'Deonte Pre-Sub', 'Deonte Sub', 'Stef Claim', 'Bodyshop', 'LDW Discharge', 'Stef Pre-Litigation', 'Stef Litigation', 'Tina Pre-Litigation', 'Tina Litigation', 'Collections', 'Collections Review'], // Possible values for status
        required: false // This field is not required
    },
    // Field for the files associated with the claim
    files: {
        incidentReports: [String], // Array of strings for incident reports
        correspondence: [String], // Array of strings for correspondence
        rentalAgreement: [String], // Array of strings for rental agreements
        policeReport: [String], // Array of strings for police reports
        invoices: [String], // Array of strings for invoices
        photos: [String] // Array of strings for photos
    },
    // New field: Invoice totals
    invoiceTotals: [{
        fileName: String,
        total: Number
    }],
    // Field for storing different versions of the claim
    versions: {
        type: [Object] // Data type is an array of objects
    },
    // Field for the date the claim was created
    date: {
        type: Date, // Data type is Date
        default: Date.now // Default value is the current date
    },
    // Field for the date the claim was last updated
    updatedAt: {
        type: Date, // Data type is Date
        default: Date.now // Default value is the current date
    },
    // New field: Was Renters Liability Insurance purchased?
    rentersLiabilityInsurance: {
        type: String, // Data type is String
        enum: ['yes', 'no'], // Possible values for Renters Liability Insurance
        required: false // This field is not required
    },
    // New field: Was Loss Damage Waiver purchased?
    lossDamageWaiver: {
        type: String, // Data type is String
        enum: ['yes', 'no'], // Possible values for Loss Damage Waiver
        required: false // This field is not required
    }
});

// Create a model from the schema
const Claim = mongoose.model('Claim', ClaimSchema);

// Export the model
module.exports = Claim;
