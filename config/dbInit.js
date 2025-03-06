const Status = require('../models/Status');
const logger = require('../logger');

async function initializeDatabase() {
    try {
        // Check if default status exists
        const defaultStatus = await Status.findOne({ name: 'Open' });
        
        // If not, create default statuses
        if (!defaultStatus) {
            logger.info('Creating default claim statuses...');
            
            // Create default statuses
            const defaultStatuses = [
                { name: 'Open' },
                { name: 'In Progress' },
                { name: 'Pending' },
                { name: 'Closed' }
            ];
            
            await Status.insertMany(defaultStatuses);
            logger.info('Default claim statuses created successfully');
        }
    } catch (error) {
        logger.error('Error initializing database:', error);
        throw error; // Re-throw to handle in the application startup
    }
}

module.exports = initializeDatabase; 