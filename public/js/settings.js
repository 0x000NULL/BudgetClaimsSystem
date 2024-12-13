document.addEventListener('DOMContentLoaded', function() {
    // Handle Max File Sizes Form
    document.getElementById('maxFileSizesForm').addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData(event.target);
        const data = {
            photos: formData.get('photos'),
            documents: formData.get('documents'),
            invoices: formData.get('invoices')
        };

        try {
            const response = await fetch('/api/settings/file-sizes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();
            if (result.success) {
                showSuccessMessage('File size settings updated successfully');
                
                // Update the form values with the new settings
                const settings = result.settings;
                document.querySelector('input[name="photos"]').value = settings.photos / (1024 * 1024);
                document.querySelector('input[name="documents"]').value = settings.documents / (1024 * 1024);
                document.querySelector('input[name="invoices"]').value = settings.invoices / (1024 * 1024);
            } else {
                showErrorMessage('Failed to update file size settings');
            }
        } catch (error) {
            console.error('Error:', error);
            showErrorMessage('Error updating file size settings');
        }
    });

    // Handle Max Files Per Category Form
    document.getElementById('maxFilesForm').addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData(event.target);
        const data = {
            photos: formData.get('photos'),
            documents: formData.get('documents'),
            invoices: formData.get('invoices')
        };

        try {
            const response = await fetch('/api/settings/file-count', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();
            if (result.success) {
                showSuccessMessage('File count settings updated successfully');
                
                // Update the form values with the new settings
                const settings = result.settings;
                document.querySelector('#maxFilesForm input[name="photos"]').value = settings.photos;
                document.querySelector('#maxFilesForm input[name="documents"]').value = settings.documents;
                document.querySelector('#maxFilesForm input[name="invoices"]').value = settings.invoices;
            } else {
                showErrorMessage('Failed to update file count settings');
            }
        } catch (error) {
            console.error('Error:', error);
            showErrorMessage('Error updating file count settings');
        }
    });

    // Handle Allowed File Types Form
    document.getElementById('allowedFileTypesForm').addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData(event.target);
        const data = {
            photos: [],
            documents: [],
            invoices: []
        };
        
        for (const [key, value] of formData.entries()) {
            data[key].push(value);
        }
        
        try {
            const response = await fetch('/api/settings/file-types', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await response.json();
            if (response.ok) {
                showSuccessMessage('File types updated successfully');
            } else {
                showErrorMessage(result.error || 'Error updating settings');
            }
        } catch (error) {
            console.error('Error updating file types:', error);
            showErrorMessage('Error updating settings');
        }
    });

    // Handle Status Forms
    document.getElementById('addStatusForm').addEventListener('submit', async (event) => {
        event.preventDefault();
        const newStatus = document.getElementById('newStatus').value;
        try {
            const response = await fetch('/claims/status/add', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name: newStatus })
            });
            const result = await response.json();
            document.getElementById('statusMessage').textContent = result.message;
            location.reload();
        } catch (error) {
            console.error('Error adding status:', error);
        }
    });

    document.querySelectorAll('.removeStatusForm').forEach(form => {
        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            const statusId = form.getAttribute('data-status-id');
            try {
                const response = await fetch(`/claims/status/remove/${statusId}`, {
                    method: 'DELETE'
                });
                const result = await response.json();
                document.getElementById('statusMessage').textContent = result.message;
                location.reload();
            } catch (error) {
                console.error('Error removing status:', error);
            }
        });
    });

    // Handle Damage Type Forms
    document.getElementById('addDamageTypeForm').addEventListener('submit', async (event) => {
        event.preventDefault();
        const newDamageType = document.getElementById('newDamageType').value;
        try {
            const response = await fetch('/claims/damage-type/add', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name: newDamageType })
            });
            const result = await response.json();
            document.getElementById('damageTypeMessage').textContent = result.message;
            location.reload();
        } catch (error) {
            console.error('Error adding damage type:', error);
        }
    });

    document.querySelectorAll('.removeDamageTypeForm').forEach(form => {
        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            const damageTypeId = form.getAttribute('data-damage-type-id');
            try {
                const response = await fetch(`/claims/damage-type/remove/${damageTypeId}`, {
                    method: 'DELETE'
                });
                const result = await response.json();
                document.getElementById('damageTypeMessage').textContent = result.message;
                location.reload();
            } catch (error) {
                console.error('Error removing damage type:', error);
            }
        });
    });

    // Handle Renting Location Forms
    document.getElementById('addRentingLocationForm').addEventListener('submit', async (event) => {
        event.preventDefault();
        const newRentingLocation = document.getElementById('newRentingLocation').value;
        try {
            const response = await fetch('/claims/location/add', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name: newRentingLocation })
            });
            const result = await response.json();
            document.getElementById('rentingLocationMessage').textContent = result.message;
            location.reload();
        } catch (error) {
            console.error('Error adding renting location:', error);
        }
    });

    document.querySelectorAll('.removeRentingLocationForm').forEach(form => {
        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            const locationId = form.getAttribute('data-location-id');
            try {
                const response = await fetch(`/claims/location/remove/${locationId}`, {
                    method: 'DELETE'
                });
                const result = await response.json();
                document.getElementById('rentingLocationMessage').textContent = result.message;
                location.reload();
            } catch (error) {
                console.error('Error removing renting location:', error);
            }
        });
    });
});

// Helper functions for showing messages
function showSuccessMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'alert alert-success';
    messageDiv.textContent = message;
    messageDiv.style.position = 'fixed';
    messageDiv.style.top = '20px';
    messageDiv.style.right = '20px';
    messageDiv.style.padding = '10px';
    messageDiv.style.backgroundColor = '#dff0d8';
    messageDiv.style.border = '1px solid #d6e9c6';
    messageDiv.style.borderRadius = '4px';
    messageDiv.style.color = '#3c763d';
    document.body.appendChild(messageDiv);
    setTimeout(() => messageDiv.remove(), 3000);
}

function showErrorMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'alert alert-danger';
    messageDiv.textContent = message;
    messageDiv.style.position = 'fixed';
    messageDiv.style.top = '20px';
    messageDiv.style.right = '20px';
    messageDiv.style.padding = '10px';
    messageDiv.style.backgroundColor = '#f2dede';
    messageDiv.style.border = '1px solid #ebccd1';
    messageDiv.style.borderRadius = '4px';
    messageDiv.style.color = '#a94442';
    document.body.appendChild(messageDiv);
    setTimeout(() => messageDiv.remove(), 3000);
} 