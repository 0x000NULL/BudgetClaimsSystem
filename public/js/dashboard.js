document.addEventListener('DOMContentLoaded', () => {
    // Add new claim button handler
    const newClaimButton = document.getElementById('newClaimButton');
    if (newClaimButton) {
        newClaimButton.addEventListener('click', () => {
            window.location.href = '/claims/add';
        });
    }

    // Generate reports button handler
    const generateReportsButton = document.getElementById('generateReportsButton');
    if (generateReportsButton) {
        generateReportsButton.addEventListener('click', () => {
            window.location.href = '/reports';
        });
    }
}); 