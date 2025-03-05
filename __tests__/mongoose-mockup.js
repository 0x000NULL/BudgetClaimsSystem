/**
 * @fileoverview Mongoose mockup for testing
 * This file provides centralized mongoose mocks to prevent open handles during tests
 */

// Mock the mongoose module
jest.mock('mongoose', () => {
    // Create a mock Schema constructor
    const Schema = function(definition, options) {
        this.definition = definition;
        this.options = options;
        this.statics = {};
        this.methods = {};
        this.virtual = jest.fn().mockReturnThis();
        this.pre = jest.fn().mockReturnThis();
        this.post = jest.fn().mockReturnThis();
        this.set = jest.fn().mockReturnThis();
    };
    
    // Create a mock model function that returns a constructor
    const model = jest.fn().mockImplementation((name, schema) => {
        function MockModel(data) {
            this._id = data._id || 'mockid';
            Object.assign(this, data);
            this.save = jest.fn().mockResolvedValue(this);
        }
        
        // Add static methods commonly used in tests
        MockModel.find = jest.fn().mockReturnValue({
            sort: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            skip: jest.fn().mockReturnThis(),
            populate: jest.fn().mockReturnThis(),
            exec: jest.fn().mockResolvedValue([]),
            lean: jest.fn().mockReturnThis(),
        });
        
        MockModel.findById = jest.fn().mockImplementation(() => ({
            populate: jest.fn().mockReturnThis(),
            exec: jest.fn().mockResolvedValue(null),
        }));
        
        MockModel.findOne = jest.fn().mockImplementation(() => ({
            populate: jest.fn().mockReturnThis(),
            exec: jest.fn().mockResolvedValue(null),
        }));
        
        MockModel.findByIdAndUpdate = jest.fn().mockResolvedValue(null);
        MockModel.findByIdAndDelete = jest.fn().mockResolvedValue(null);
        MockModel.create = jest.fn().mockResolvedValue(new MockModel({}));
        MockModel.deleteMany = jest.fn().mockResolvedValue({ n: 0, ok: 1 });
        MockModel.countDocuments = jest.fn().mockResolvedValue(0);
        MockModel.estimatedDocumentCount = jest.fn().mockResolvedValue(0);
        MockModel.updateOne = jest.fn().mockResolvedValue({ n: 0, nModified: 0, ok: 1 });
        MockModel.aggregate = jest.fn().mockResolvedValue([]);
        MockModel.createIndexes = jest.fn().mockResolvedValue(null);
        
        // Add any schema statics to the model
        if (schema && schema.statics) {
            Object.assign(MockModel, schema.statics);
        }
        
        return MockModel;
    });
    
    // Return the mocked mongoose object
    return {
        Schema,
        model,
        connect: jest.fn().mockResolvedValue({}),
        connection: {
            on: jest.fn(),
            once: jest.fn(),
            close: jest.fn().mockResolvedValue(true),
        },
        Types: {
            ObjectId: jest.fn().mockImplementation((id) => id || 'mockobjectid'),
            Mixed: 'mixed',
        },
    };
});

// Export the mocked mongoose
module.exports = require('mongoose'); 