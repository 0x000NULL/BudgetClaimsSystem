const express = require('express');
const { ensureAuthenticated, ensureRoles } = require('../middleware/auth'); // Import authentication and role-checking middleware
const logActivity = require('../middleware/activityLogger'); // Import activity logging middleware
const router = express.Router();

// Route to view feedback, accessible by admin and manager
router.get('/', ensureAuthenticated, ensureRoles(['admin', 'manager']), logActivity('Viewed feedback'), (req, res) => {
    res.render('feedback', { title: 'Feedback' });
});

module.exports = router;
