const mongoose = require('mongoose'); // Import Mongoose to interact with MongoDB
const Schema = mongoose.Schema; // Use Schema to define the structure of documents in the collection
const { ClaimSettings, INITIAL_CLAIM_NUMBER } = require('./ClaimSettings');

// Define the schema for a Liability Claim
const LiabilityClaimSchema = new Schema({
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
        type: String, // Data type is Boolean
        required: false // This field is not required
    },
    // Field for whether the renter is at fault
    isRenterAtFault: {
        type: String, // Data type is Boolean
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
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Location',
        required: false
    },
    // Field for pickup location
    pickupLocation: {
        type: String,
        required: false
    },
    // Field for return location
    returnLocation: {
        type: String,
        required: false
    },
    // Field for whether LDW was accepted
    ldwAccepted: {
        type: String, // Data type is Boolean
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
    damageType: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'DamageType',
        required: false
    }],
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
        required: false // This field is not required
    },
    // New field: Was Loss Damage Waiver purchased?
    lossDamageWaiver: {
        type: String, // Data type is String
        required: false // This field is not required
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
    }]
}, {
    timestamps: true, // This should be true
    strict: true // Enforce schema validation
});

// Add a pre-save middleware to generate sequential claim numbers with "L" suffix
LiabilityClaimSchema.pre('save', async function(next) {
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
            // Add "L" suffix to the claim number
            this.claimNumber = claimNumber.toString().padStart(8, '0') + 'L';
            console.log('Generated liability claim number:', this.claimNumber);
        }
        next();
    } catch (error) {
        console.error('Error in liability claim pre-save middleware:', error);
        next(error);
    }
});

// Add a post-save hook to verify claim number was generated
LiabilityClaimSchema.post('save', function(doc, next) {
    if (!doc.claimNumber) {
        console.error('Liability claim saved without claim number:', doc._id);
        next(new Error('Claim number was not generated properly'));
    } else {
        console.log('Liability claim saved successfully with number:', doc.claimNumber);
        next();
    }
});

// Update the pre-save middleware for status conversion
LiabilityClaimSchema.pre('save', async function(next) {
    try {
        // Skip if status is already an ObjectId
        if (this.status instanceof mongoose.Types.ObjectId) {
            return next();
        }

        const Status = mongoose.model('Status');
        
        // If status is a string, try to find matching status
        if (typeof this.status === 'string') {
            const status = await Status.findOne({ 
                name: { $regex: new RegExp(`^${this.status}$`, 'i') }
            });
            
            if (status) {
                this.status = status._id;
            } else {
                // If no matching status found, use default 'Open' status
                const openStatus = await Status.findOne({ name: 'Open' });
                if (!openStatus) {
                    throw new Error('Default Open status not found');
                }
                this.status = openStatus._id;
            }
        } else if (!this.status) {
            // If no status set, use default 'Open' status
            const openStatus = await Status.findOne({ name: 'Open' });
            if (!openStatus) {
                throw new Error('Default Open status not found');
            }
            this.status = openStatus._id;
        }
        
        next();
    } catch (error) {
        next(error);
    }
});

// Add virtual for status name
LiabilityClaimSchema.virtual('statusName').get(async function() {
    try {
        if (this.status instanceof mongoose.Types.ObjectId) {
            const Status = mongoose.model('Status');
            const status = await Status.findById(this.status);
            return status ? status.name : 'Unknown';
        }
        return typeof this.status === 'string' ? this.status : 'Unknown';
    } catch (error) {
        console.error('Error getting status name:', error);
        return 'Unknown';
    }
});

// Add this method to help with status conversion
LiabilityClaimSchema.methods.getStatusName = async function() {
    try {
        if (this.status instanceof mongoose.Types.ObjectId) {
            const Status = mongoose.model('Status');
            const status = await Status.findById(this.status);
            return status ? status.name : 'Unknown';
        }
        return typeof this.status === 'string' ? this.status : 'Unknown';
    } catch (error) {
        console.error('Error getting status name:', error);
        return 'Unknown';
    }
};

// Create a model from the schema
const LiabilityClaim = mongoose.model('LiabilityClaim', LiabilityClaimSchema);

// Export the model
module.exports = LiabilityClaim; 