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

    // Track removed files
    const removedFiles = new Set();

    // Handle file viewing
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('view-file')) {
            const filename = e.target.dataset.file;
            openFileViewer(filename);
        }
    });

    // Handle file removal
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('remove-file')) {
            const fileItem = e.target.closest('.file-item');
            const filename = e.target.dataset.file;
            const fileType = fileItem.closest('.file-section').querySelector('input[type="file"]').name;
            
            // Add to removedFiles set
            removedFiles.add(JSON.stringify({ type: fileType, name: filename }));
            
            // Add hidden input to track removed files
            let input = document.querySelector('input[name="removedFiles"]');
            if (!input) {
                input = document.createElement('input');
                input.type = 'hidden';
                input.name = 'removedFiles';
                document.querySelector('form').appendChild(input);
            }
            input.value = JSON.stringify(Array.from(removedFiles));
            
            // Remove the file item from display
            fileItem.remove();
        }
    });

    // Handle new file selections
    const fileInputs = document.querySelectorAll('input[type="file"]');
    fileInputs.forEach(input => {
        input.addEventListener('change', function() {
            const fileSection = input.closest('.file-section');
            const existingFiles = fileSection.querySelector('.existing-files');
            
            Array.from(this.files).forEach(file => {
                const fileItem = document.createElement('div');
                fileItem.className = 'file-item new-file';
                fileItem.innerHTML = `
                    <span class="file-name">${file.name}</span>
                    <div class="file-actions">
                        <button type="button" class="remove-file" data-file="${file.name}">Remove</button>
                    </div>
                `;
                existingFiles.appendChild(fileItem);
            });
        });
    });

    // Handle form submission
    document.querySelector('form').addEventListener('submit', function(e) {
        // Add any additional form validation if needed
        if (removedFiles.size > 0) {
            const input = document.querySelector('input[name="removedFiles"]');
            if (!input) {
                const input = document.createElement('input');
                input.type = 'hidden';
                input.name = 'removedFiles';
                input.value = JSON.stringify(Array.from(removedFiles));
                this.appendChild(input);
            }
        }
    });

    function openFileViewer(filename) {
        window.open(`/uploads/${filename}`, '_blank');
    }
}); 