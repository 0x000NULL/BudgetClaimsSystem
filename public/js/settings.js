document.addEventListener('DOMContentLoaded', function() {
    // Modal handling
    const modal = document.getElementById('editModal');
    const closeBtn = document.getElementsByClassName('close')[0];
    
    closeBtn.onclick = function() {
        modal.style.display = 'none';
    }

    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    }

    // Add event delegation for list items
    document.addEventListener('click', function(e) {
        const target = e.target;
        
        // Handle edit buttons
        if (target.classList.contains('btn-edit')) {
            const id = target.dataset.id;
            const name = target.dataset.name;
            const type = target.dataset.type;
            editItem(id, name, type);
        }
        
        // Handle delete buttons
        if (target.classList.contains('btn-delete')) {
            const id = target.dataset.id;
            const type = target.dataset.type;
            deleteItem(id, type);
        }
    });

    // Form submission handlers
    const addLocationForm = document.getElementById('addLocationForm');
    const addStatusForm = document.getElementById('addStatusForm');
    const addDamageTypeForm = document.getElementById('addDamageTypeForm');
    const editForm = document.getElementById('editForm');

    if (addLocationForm) addLocationForm.addEventListener('submit', handleAdd);
    if (addStatusForm) addStatusForm.addEventListener('submit', handleAdd);
    if (addDamageTypeForm) addDamageTypeForm.addEventListener('submit', handleAdd);
    if (editForm) editForm.addEventListener('submit', handleEdit);
});

function handleAdd(e) {
    e.preventDefault();
    const form = e.target;
    const type = form.id.replace('add', '').replace('Form', '').toLowerCase();
    const formData = new FormData(form);
    const name = formData.get('name');

    console.log('Submitting form:', {
        type,
        name,
        endpoint: `/api/settings/${type}`
    });

    fetch(`/api/settings/${type}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name })
    })
    .then(response => {
        if (!response.ok) {
            return response.text().then(text => {
                throw new Error(`Server responded with ${response.status}: ${text}`);
            });
        }
        return response.json();
    })
    .then(data => {
        console.log('Server response:', data);
        if (data.success) {
            location.reload();
        } else {
            alert('Error: ' + (data.message || 'Failed to add item'));
        }
    })
    .catch(error => {
        console.error('Error adding item:', error);
        alert('Error: ' + error.message);
    });

    form.reset();
}

function handleEdit(e) {
    e.preventDefault();
    const id = document.getElementById('editItemId').value;
    const type = document.getElementById('editItemType').value;
    const name = document.getElementById('editItemName').value;

    console.log('Submitting edit:', {
        type,
        id,
        name,
        endpoint: `/api/settings/${type}/${id}`
    });

    fetch(`/api/settings/${type}/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name })
    })
    .then(response => {
        if (!response.ok) {
            return response.text().then(text => {
                throw new Error(`Server responded with ${response.status}: ${text}`);
            });
        }
        return response.json();
    })
    .then(data => {
        console.log('Edit response:', data);
        if (data.success) {
            location.reload();
        } else {
            alert('Error: ' + (data.message || 'Failed to update item'));
        }
    })
    .catch(error => {
        console.error('Error updating item:', error);
        alert('Error: ' + error.message);
    });

    // Close the modal
    const modal = document.getElementById('editModal');
    modal.style.display = 'none';
}

function editItem(id, name, type) {
    const modal = document.getElementById('editModal');
    document.getElementById('editItemId').value = id;
    document.getElementById('editItemType').value = type;
    document.getElementById('editItemName').value = name;
    modal.style.display = 'block';
}

function deleteItem(id, type) {
    if (confirm(`Are you sure you want to delete this ${type}?`)) {
        console.log(`Attempting to delete ${type} with ID:`, id);
        
        fetch(`/api/settings/${type}/${id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            if (!response.ok) {
                return response.text().then(text => {
                    throw new Error(`Server responded with ${response.status}: ${text}`);
                });
            }
            return response.json();
        })
        .then(data => {
            console.log('Delete response:', data);
            if (data.success) {
                location.reload();
            } else {
                alert('Error: ' + (data.message || 'Failed to delete item'));
            }
        })
        .catch(error => {
            console.error('Error deleting item:', error);
            alert('Error: ' + error.message);
        });
    }
}

// Helper functions for each type
function editLocation(id, name) { editItem(id, name, 'location'); }
function editStatus(id, name) { editItem(id, name, 'status'); }
function editDamageType(id, name) { editItem(id, name, 'damagetype'); }

function deleteLocation(id) { deleteItem(id, 'location'); }
function deleteStatus(id) { deleteItem(id, 'status'); }
function deleteDamageType(id) { deleteItem(id, 'damagetype'); }