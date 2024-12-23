document.addEventListener('DOMContentLoaded', function() {
    // Get all tab buttons
    const tabButtons = document.querySelectorAll('.tablinks');
    
    // Add click event listener to each button
    tabButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            const tabName = this.getAttribute('data-tab');
            if (tabName) {
                openTab(e, tabName);
            }
        });
    });

    // Function to open a specific tab
    function openTab(evt, tabName) {
        // Get all tab content elements
        const tabcontent = document.getElementsByClassName("tabcontent");
        
        // Hide all tab content
        for (let i = 0; i < tabcontent.length; i++) {
            tabcontent[i].style.display = "none";
        }
        
        // Remove 'active' class from all tab buttons
        const tablinks = document.getElementsByClassName("tablinks");
        for (let i = 0; i < tablinks.length; i++) {
            tablinks[i].className = tablinks[i].className.replace(" active", "");
        }
        
        // Show the selected tab content and mark the button as active
        const selectedTab = document.getElementById(tabName);
        if (selectedTab) {
            selectedTab.style.display = "block";
            evt.currentTarget.className += " active";
        }
    }

    // Open the default tab if it exists
    const defaultTab = document.getElementById("defaultOpen");
    if (defaultTab) {
        defaultTab.click();
    }

    handleInvoiceUpload();
});

// Function to display a toast message
function showToast(message, type) {
    const toast = document.getElementById('toast');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toast.style.display = 'block';

    // Hide the toast after 3 seconds
    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}

// Example usage of toast notifications
// showToast('Claim added successfully!', 'success');
// showToast('Error adding claim!', 'error');

// Existing dynamic addition functions
async function addStatus() {
    const status = document.getElementById('newStatus').value;
    if (status) {
        const response = await fetch('/claims/statuses', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status })
        });

        if (response.ok) {
            const option = document.createElement('option');
            option.value = status;
            option.textContent = status;
            document.getElementById('status').appendChild(option);
            document.getElementById('newStatus').value = '';
            showToast('Status added successfully!', 'success');
        } else {
            showToast('Error adding status!', 'error');
        }
    }
}

async function addDamageType() {
    const damageType = document.getElementById('newDamageType').value;
    if (damageType) {
        const response = await fetch('/claims/damageTypes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ damageType })
        });

        if (response.ok) {
            const option = document.createElement('option');
            option.value = damageType;
            option.textContent = damageType;
            document.getElementById('damageType').appendChild(option);
            document.getElementById('newDamageType').value = '';
            showToast('Damage type added successfully!', 'success');
        } else {
            showToast('Error adding damage type!', 'error');
        }
    }
}

async function addLocation() {
    const location = document.getElementById('newLocation').value;
    if (location) {
        const response = await fetch('/claims/locations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ location })
        });

        if (response.ok) {
            const option = document.createElement('option');
            option.value = location;
            option.textContent = location;
            document.getElementById('rentingLocation').appendChild(option);
            document.getElementById('newLocation').value = '';
            showToast('Location added successfully!', 'success');
        } else {
            showToast('Error adding location!', 'error');
        }
    }
}

// Add this function to handle invoice file uploads and totals
function handleInvoiceUpload() {
    const invoiceInput = document.getElementById('invoices');
    const invoiceTotalsContainer = document.getElementById('invoiceTotalsContainer');

    invoiceInput.addEventListener('change', function() {
        invoiceTotalsContainer.innerHTML = ''; // Clear existing totals

        Array.from(this.files).forEach((file, index) => {
            const totalDiv = document.createElement('div');
            totalDiv.className = 'invoice-total';
            totalDiv.innerHTML = `
                <label for="invoiceTotal_${index}">Invoice Total for ${file.name}:</label>
                <input type="number" 
                       id="invoiceTotal_${index}" 
                       name="invoiceTotal_${file.name}"
                       step="0.01" 
                       min="0" 
                       placeholder="Enter total amount"
                       required>
                <input type="hidden" name="invoiceFileName_${index}" value="${file.name}">
            `;
            invoiceTotalsContainer.appendChild(totalDiv);
        });
    });
}