const express = require('express');
const { ensureAuthenticated, ensureRoles } = require('../middleware/auth');
const logActivity = require('../middleware/activityLogger');
const router = express.Router();

console.log("Feedback route - ensureRoles:", ensureRoles);

// Route to view feedback, accessible by admin and manager
router.get('/', ensureAuthenticated, ensureRoles(['admin', 'manager']), logActivity('Viewed feedback'), (req, res) => {
    res.render('feedback', { title: 'Feedback' });
});

module.exports = router;
