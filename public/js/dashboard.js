// Store the original data
let originalData = null;
let activeFilters = {
    liability: true,
    physical: true
};

// Function to update the dashboard based on active filters
function updateDashboard() {
    if (!originalData) return;

    // Update stats
    const totalClaims = activeFilters.liability && activeFilters.physical ? 
        originalData.totalAllClaims :
        activeFilters.liability ? 
            originalData.openLiabilityClaims + originalData.totalClosedClaims :
            originalData.openDamageClaims + originalData.totalClosedClaims;

    const openLiabilityClaims = activeFilters.liability ? originalData.openLiabilityClaims : 0;
    const openDamageClaims = activeFilters.physical ? originalData.openDamageClaims : 0;
    const totalClosedClaims = activeFilters.liability && activeFilters.physical ? 
        originalData.totalClosedClaims :
        activeFilters.liability ? 
            originalData.totalClosedClaims * 0.5 : // Assuming half are liability
            originalData.totalClosedClaims * 0.5; // Assuming half are physical

    // Update the stats cards
    document.getElementById('totalClaims').textContent = totalClaims;
    document.getElementById('openLiabilityClaims').textContent = openLiabilityClaims;
    document.getElementById('openDamageClaims').textContent = openDamageClaims;
    document.getElementById('totalClosedClaims').textContent = totalClosedClaims;

    // Show/hide stat cards based on toggle state
    const liabilityCard = document.querySelector('.stat-card:nth-child(2)'); // Open Liability Claims card
    const damageCard = document.querySelector('.stat-card:nth-child(3)'); // Open Damage Claims card
    
    liabilityCard.style.display = activeFilters.liability ? '' : 'none';
    damageCard.style.display = activeFilters.physical ? '' : 'none';

    // Update the recent claims list
    const claimsList = document.getElementById('recentClaimsList');
    const claimItems = claimsList.querySelectorAll('.claim-item');
    
    claimItems.forEach(item => {
        const claimType = item.getAttribute('data-type');
        if (activeFilters[claimType]) {
            item.style.display = '';
        } else {
            item.style.display = 'none';
        }
    });

    // Show no claims message if all items are hidden
    const visibleClaims = claimsList.querySelectorAll('.claim-item[style=""]').length;
    const noClaimsMessage = claimsList.querySelector('.no-claims-message');
    if (visibleClaims === 0 && noClaimsMessage) {
        noClaimsMessage.style.display = '';
    } else if (noClaimsMessage) {
        noClaimsMessage.style.display = 'none';
    }
}

// Function to initialize the dashboard
function initializeDashboard(data) {
    originalData = data;
    
    // Add click handlers to toggle buttons
    document.querySelectorAll('.toggle-btn').forEach(button => {
        button.addEventListener('click', () => {
            const type = button.getAttribute('data-type');
            activeFilters[type] = !activeFilters[type];
            
            // Update button appearance
            if (activeFilters[type]) {
                button.classList.add('active');
                button.style.backgroundColor = '#007bff';
                button.style.color = 'white';
            } else {
                button.classList.remove('active');
                button.style.backgroundColor = 'white';
                button.style.color = '#007bff';
            }

            // Update the dashboard
            updateDashboard();
        });
    });

    // Initialize the dashboard
    updateDashboard();
}

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

// Express claim button handler
const expressClaimButton = document.getElementById('expressClaimButton');
if (expressClaimButton) {
    expressClaimButton.addEventListener('click', () => {
        window.location.href = '/claims/express';
    });
}

// Initialize the dashboard when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Get the dashboard data from the data attributes
    const dashboardData = {
        totalAllClaims: parseInt(document.getElementById('totalClaims').textContent),
        openLiabilityClaims: parseInt(document.getElementById('openLiabilityClaims').textContent),
        openDamageClaims: parseInt(document.getElementById('openDamageClaims').textContent),
        totalClosedClaims: parseInt(document.getElementById('totalClosedClaims').textContent),
        recentClaims: JSON.parse(document.getElementById('recentClaimsList').dataset.claims || '[]')
    };
    
    initializeDashboard(dashboardData);
}); 