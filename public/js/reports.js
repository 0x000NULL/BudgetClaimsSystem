/**
 * Toggles the visibility of date input fields based on the selected date range
 */
function toggleDateInputs() {
    const dateRange = document.getElementById('dateRange');
    const dateInputs = document.getElementById('dateInputs');
    dateInputs.style.display = dateRange.value === 'custom' ? 'block' : 'none';
}

/**
 * Initialize the reports page functionality
 */
document.addEventListener('DOMContentLoaded', function() {
    // Set up initial state of date inputs
    toggleDateInputs();

    // Add form submission handler
    const reportForm = document.querySelector('.report-form');
    if (reportForm) {
        reportForm.addEventListener('submit', function(e) {
            const dateRange = document.getElementById('dateRange');
            const startDate = document.getElementById('startDate');
            const endDate = document.getElementById('endDate');

            if (dateRange.value === 'custom') {
                // Validate date inputs
                if (!startDate.value || !endDate.value) {
                    e.preventDefault();
                    alert('Please select both start and end dates for custom date range');
                    return;
                }

                if (new Date(startDate.value) > new Date(endDate.value)) {
                    e.preventDefault();
                    alert('Start date must be before or equal to end date');
                    return;
                }
            }
        });
    }
}); 