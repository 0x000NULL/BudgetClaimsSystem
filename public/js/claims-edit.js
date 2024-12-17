document.addEventListener('DOMContentLoaded', function () {
    // Helper function to open a tab
    function openTab(evt, tabName) {
        var i, tabcontent, tablinks;
        tabcontent = document.getElementsByClassName("tabcontent");
        for (i = 0; i < tabcontent.length; i++) {
            tabcontent[i].style.display = "none";
        }
        tablinks = document.getElementsByClassName("tablinks");
        for (i = 0; i < tablinks.length; i++) {
            tablinks[i].className = tablinks[i].className.replace(" active", "");
        }
        document.getElementById(tabName).style.display = "block";
        evt.currentTarget.className += " active";
    }

    // Add event listeners to each tab button
    const tabs = {
        'customerInfoTab': 'customerInfo',
        'vehicleInfoTab': 'vehicleInfo',
        'claimDetailsTab': 'claimDetails',
        'insuranceInfoTab': 'insuranceInfo',
        'thirdPartyInfoTab': 'thirdPartyInfo',
        'rentalPoliceInfoTab': 'rentalPoliceInfo',
        'additionalCoverageTab': 'additionalCoverage',
        'fileUploadsTab': 'fileUploads'
    };

    Object.entries(tabs).forEach(([tabId, contentId]) => {
        const tabElement = document.getElementById(tabId);
        if (tabElement) {
            tabElement.addEventListener('click', function(event) {
                openTab(event, contentId);
            });
        }
    });

    // Open the default tab
    const defaultTab = document.getElementById('customerInfoTab');
    if (defaultTab) {
        defaultTab.click();
    }
}); 