const mongoose = require('mongoose'); // Import Mongoose to interact with MongoDB
const Schema = mongoose.Schema; // Use Schema to define the structure of documents in the collection
const { ClaimSettings, INITIAL_CLAIM_NUMBER } = require('./ClaimSettings');

// Define the schema for a Claim
const ClaimSchema = new Schema({
    // Field for the claim number
    claimNumber: {
        type: String,
        unique: true,
        index: true,
        immutable: true, // This prevents the field from being changed after creation
        required: function() { 
            // Only require claimNumber after the document is saved
            return !this.isNew;
        }
    },
    // Field for the MVA number
    mva: {
        type: String, // Data type is String
        required: true,
        trim: true
    },
    // Field for the customer's name
    customerName: {
        type: String, // Data type is String
        required: true,
        trim: true
    },
    // Field for the customer's number
    customerNumber: {
        type: String, // Data type is String
        trim: true
    },
    // Field for the customer's email
    customerEmail: {
        type: String, // Data type is String
        trim: true,
        lowercase: true
    },
    // Field for the customer's address
    customerAddress: {
        type: String, // Data type is String
        trim: true
    },
    // Field for the customer's driver's license number
    customerDriversLicense: {
        type: String, // Data type is String
        trim: true
    },
    // Field for the car make
    carMake: {
        type: String, // Data type is String
        trim: true
    },
    // Field for the car model
    carModel: {
        type: String, // Data type is String
        trim: true
    },
    // Field for the car year
    carYear: {
        type: String, // Data type is String
        trim: true
    },
    // Field for the car color
    carColor: {
        type: String, // Data type is String
        trim: true
    },
    // Field for the car VIN number
    carVIN: {
        type: String, // Data type is String
        trim: true
    },
    // Field for the accident date
    accidentDate: {
        type: Date, // Data type is Date
    },
    // Field for whether the claim is billable
    billable: {
        type: Boolean, // Data type is Boolean
        default: false
    },
    // Field for whether the renter is at fault
    isRenterAtFault: {
        type: Boolean, // Data type is Boolean
        default: false
    },
    // Field for the total damages
    damagesTotal: {
        type: Number, // Data type is Number
        required: true,
        min: 0
    },
    // Field for the body shop name
    bodyShopName: {
        type: String, // Data type is String
        trim: true
    },
    // Field for the RA number
    raNumber: {
        type: String, // Data type is String
        trim: true
    },
    // Field for the insurance carrier
    insuranceCarrier: {
        type: String, // Data type is String
        trim: true
    },
    // Field for the insurance adjuster
    insuranceAdjuster: {
        type: String, // Data type is String
        trim: true
    },
    // Field for the insurance email
    insuranceEmail: {
        type: String, // Data type is String
        trim: true,
        lowercase: true
    },
    // Field for the insurance phone number
    insurancePhoneNumber: {
        type: String, // Data type is String
        trim: true
    },
    // Field for the insurance fax number
    insuranceFaxNumber: {
        type: String, // Data type is String
        trim: true
    },
    // Field for the insurance address
    insuranceAddress: {
        type: String, // Data type is String
        trim: true
    },
    // Field for the insurance policy number
    insurancePolicyNumber: {
        type: String, // Data type is String
        trim: true
    },
    // Field for the insurance claim number
    insuranceClaimNumber: {
        type: String, // Data type is String
        trim: true
    },
    // Field for the third party's name
    thirdPartyName: {
        type: String, // Data type is String
        trim: true
    },
    // Field for the third party's address
    thirdPartyAddress: {
        type: String, // Data type is String
        trim: true
    },
    // Field for the third party's phone number
    thirdPartyPhoneNumber: {
        type: String, // Data type is String
        trim: true
    },
    // Field for the third party's insurance name
    thirdPartyInsuranceName: {
        type: String, // Data type is String
        trim: true
    },
    // Field for the third party's adjuster name
    thirdPartyAdjusterName: {
        type: String, // Data type is String
        trim: true
    },
    // Field for the third party's policy number
    thirdPartyPolicyNumber: {
        type: String, // Data type is String
        trim: true
    },
    // Field for the third party's claim number
    thirdPartyClaimNumber: {
        type: String, // Data type is String
        trim: true
    },
    // Field for the renting location
    rentingLocation: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Location',
        required: true
    },
    // Field for whether LDW was accepted
    ldwAccepted: {
        type: Boolean, // Data type is Boolean
        default: false
    },
    // Field for the police department
    policeDepartment: {
        type: String, // Data type is String
        trim: true
    },
    // Field for the police report number
    policeReportNumber: {
        type: String, // Data type is String
        trim: true
    },
    // Field for the claim close date
    claimCloseDate: {
        type: Date, // Data type is Date
    },
    // Field for the vehicle odometer reading
    vehicleOdometer: {
        type: Number, // Data type is Number
        min: 0
    },
    // Field for the description of the claim
    description: {
        type: String, // Data type is String
        required: true,
        trim: true
    },
    // Field for the damage type
    damageType: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'DamageType',
        required: true
    },
    // Field for the claim status
    status: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Status',
        required: true
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
        fileName: {
            type: String,
            required: true
        },
        total: {
            type: Number,
            required: true,
            default: 0
        }
    }],
    // Field for storing different versions of the claim
    versions: {
        type: [Schema.Types.Mixed] // Data type is an array of objects
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
        type: Boolean, // Data type is Boolean
        default: false
    },
    // New field: Was Loss Damage Waiver purchased?
    lossDamageWaiver: {
        type: Boolean, // Data type is Boolean
        default: false
    },
    // Field for storing notes and summaries
    notes: [{
        content: {
            type: String,
            required: true
        },
        type: {
            type: String,
            enum: ['import', 'user', 'system'],
            default: 'user'
        },
        source: {
            type: String,
            default: null
        },
        createdAt: {
            type: Date,
            default: Date.now
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        }
    }],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true, // This should be true
    strict: true // Enforce schema validation
});

// Add a pre-save middleware to generate sequential claim numbers
ClaimSchema.pre('save', async function(next) {
    try {
        if (this.isNew && !this.claimNumber) {
            // Find and update the last claim number atomically with retries
            let attempts = 3;
            let settings = null;
            
            while (attempts > 0 && !settings) {
                try {
                    settings = await ClaimSettings.findOneAndUpdate(
                        { type: 'lastClaimNumber' },
                        { $inc: { value: 1 } },
                        { 
                            upsert: true, 
                            new: true,
                            setDefaultsOnInsert: true
                        }
                    );
                } catch (err) {
                    attempts--;
                    if (attempts === 0) throw err;
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }

            if (!settings) {
                throw new Error('Failed to generate claim number - settings not found');
            }

            // Ensure the number is at least INITIAL_CLAIM_NUMBER
            const claimNumber = Math.max(settings.value, INITIAL_CLAIM_NUMBER);
            this.claimNumber = claimNumber.toString().padStart(8, '0');
        }
        next();
    } catch (error) {
        next(error);
    }
});

// Add a post-save hook to verify claim number was generated
ClaimSchema.post('save', function(doc, next) {
    if (!doc.claimNumber) {
        next(new Error('Claim number was not generated properly'));
    } else {
        next();
    }
});

// Add virtual for status name
ClaimSchema.virtual('statusName').get(async function() {
    try {
        if (this.status) {
            const Status = mongoose.model('Status');
            const status = await Status.findById(this.status);
            return status ? status.name : 'Unknown';
        }
        return 'Unknown';
    } catch (error) {
        return 'Unknown';
    }
});

// Add virtual for damage type name
ClaimSchema.virtual('damageTypeName').get(async function() {
    try {
        if (this.damageType) {
            const DamageType = mongoose.model('DamageType');
            const damageType = await DamageType.findById(this.damageType);
            return damageType ? damageType.name : 'Unknown';
        }
        return 'Unknown';
    } catch (error) {
        return 'Unknown';
    }
});

// Add virtual for location name
ClaimSchema.virtual('locationName').get(async function() {
    try {
        if (this.rentingLocation) {
            const Location = mongoose.model('Location');
            const location = await Location.findById(this.rentingLocation);
            return location ? location.name : 'Unknown';
        }
        return 'Unknown';
    } catch (error) {
        return 'Unknown';
    }
});

// Ensure virtuals are included in JSON
ClaimSchema.set('toJSON', { virtuals: true });
ClaimSchema.set('toObject', { virtuals: true });

// Helper method to get status name
ClaimSchema.methods.getStatusName = async function() {
    return this.statusName;
};

// Helper method to get damage type name
ClaimSchema.methods.getDamageTypeName = async function() {
    return this.damageTypeName;
};

// Helper method to get location name
ClaimSchema.methods.getLocationName = async function() {
    return this.locationName;
};

// Create a model from the schema
const Claim = mongoose.model('Claim', ClaimSchema);

// Export the model
module.exports = Claim;
