const mongoose = require('mongoose'); // Import Mongoose to interact with MongoDB
const { Schema, Types } = mongoose; // Use Schema and Types from mongoose
const { ClaimSettings, INITIAL_CLAIM_NUMBER } = require('./ClaimSettings');

// Define the schema for a Claim
const ClaimSchema = new Schema({
    // Field for the claim number
    claimNumber: {
        type: String,
        unique: true,
        index: true,
        immutable: true, // This prevents the field from being changed after creation
        sparse: true // Allow null values since we'll generate it in the pre-save hook
    },
    // Field for the MVA number
    mva: {
        type: String, // Data type is String
        required: [true, 'MVA number is required'],
        trim: true
    },
    // Field for the customer's name
    customerName: {
        type: String, // Data type is String
        required: [true, 'Customer name is required'],
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
        required: [true, 'Damages total is required'],
        min: [0, 'Damages total cannot be negative']
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
        type: Types.ObjectId,
        ref: 'Location',
        required: [true, 'Renting location is required']
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
        min: [0, 'Vehicle odometer reading cannot be negative']
    },
    // Field for the description of the claim
    description: {
        type: String, // Data type is String
        required: [true, 'Description is required'],
        trim: true
    },
    // Field for the damage type
    damageType: {
        type: Types.ObjectId,
        ref: 'DamageType',
        required: [true, 'Damage type is required']
    },
    // Field for the claim status
    status: {
        type: Types.ObjectId,
        ref: 'Status',
        required: [true, 'Status is required']
    },
    // Field for the files associated with the claim
    files: {
        type: {
            incidentReports: {
                type: [String],
                default: []
            },
            correspondence: {
                type: [String],
                default: []
            },
            rentalAgreement: {
                type: [String],
                default: []
            },
            policeReport: {
                type: [String],
                default: []
            },
            invoices: {
                type: [String],
                default: []
            },
            photos: {
                type: [String],
                default: []
            }
        },
        default: {
            incidentReports: [],
            correspondence: [],
            rentalAgreement: [],
            policeReport: [],
            invoices: [],
            photos: []
        }
    },
    // New field: Invoice totals
    invoiceTotals: {
        type: [{
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
        default: []
    },
    // Field for storing different versions of the claim
    versions: {
        type: Array,
        default: []
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
            type: Types.ObjectId,
            ref: 'User',
            default: null
        }
    }],
    createdBy: {
        type: Types.ObjectId,
        ref: 'User',
        required: [true, 'Created by user is required']
    },
    assignedTo: {
        type: Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Pre-save hook to generate claim number
ClaimSchema.pre('save', async function(next) {
    try {
        if (this.isNew && !this.claimNumber) {
            const settings = await ClaimSettings.findOne({ type: 'lastClaimNumber' });
            if (!settings) {
                await ClaimSettings.create({
                    type: 'lastClaimNumber',
                    value: INITIAL_CLAIM_NUMBER - 1
                });
                this.claimNumber = INITIAL_CLAIM_NUMBER.toString().padStart(8, '0');
            } else {
                settings.value = Math.max(settings.value + 1, INITIAL_CLAIM_NUMBER);
                await settings.save();
                this.claimNumber = settings.value.toString().padStart(8, '0');
            }
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

// Helper method to get status name
ClaimSchema.methods.getStatusName = async function() {
    try {
        if (!this.populated('status') && this.status) {
            await this.populate('status');
        }
        return this.status ? this.status.name : 'Unknown';
    } catch (error) {
        return 'Unknown';
    }
};

// Helper method to get damage type name
ClaimSchema.methods.getDamageTypeName = async function() {
    try {
        if (!this.populated('damageType') && this.damageType) {
            await this.populate('damageType');
        }
        return this.damageType ? this.damageType.name : 'Unknown';
    } catch (error) {
        return 'Unknown';
    }
};

// Helper method to get location name
ClaimSchema.methods.getLocationName = async function() {
    try {
        if (!this.populated('rentingLocation') && this.rentingLocation) {
            await this.populate('rentingLocation');
        }
        return this.rentingLocation ? this.rentingLocation.name : 'Unknown';
    } catch (error) {
        return 'Unknown';
    }
};

// Create a model from the schema
const Claim = mongoose.model('Claim', ClaimSchema);

// Export the model
module.exports = { Claim };
