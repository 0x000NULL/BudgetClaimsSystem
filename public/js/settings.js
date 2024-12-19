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

    // Form submission handlers
    const addLocationForm = document.getElementById('addLocationForm');
    const addStatusForm = document.getElementById('addStatusForm');
    const addDamageTypeForm = document.getElementById('addDamageTypeForm');
    const editForm = document.getElementById('editForm');

    if (addLocationForm) {
        addLocationForm.addEventListener('submit', handleAdd);
    }
    if (addStatusForm) {
        addStatusForm.addEventListener('submit', handleAdd);
    }
    if (addDamageTypeForm) {
        addDamageTypeForm.addEventListener('submit', handleAdd);
    }
    if (editForm) {
        editForm.addEventListener('submit', handleEdit);
    }
});

function handleAdd(e) {
    e.preventDefault();
    const form = e.target;
    const type = form.id.replace('add', '').replace('Form', '').toLowerCase();
    const formData = new FormData(form);
    const data = {};
    formData.forEach((value, key) => {
        data[key] = value;
    });

    fetch(`/api/settings/${type}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            location.reload();
        } else {
            alert('Error: ' + (data.message || 'Failed to add item'));
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Error: Failed to add item');
    });
}

function handleEdit(e) {
    e.preventDefault();
    const id = document.getElementById('editItemId').value;
    const type = document.getElementById('editItemType').value;
    const name = document.getElementById('editItemName').value;

    fetch(`/api/settings/${type}/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            location.reload();
        } else {
            alert('Error: ' + (data.message || 'Failed to update item'));
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Error: Failed to update item');
    });
}

function editItem(id, name, type) {
    const modal = document.getElementById('editModal');
    document.getElementById('editItemId').value = id;
    document.getElementById('editItemType').value = type;
    document.getElementById('editItemName').value = name;
    modal.style.display = 'block';
}

function deleteItem(id, type) {
    if (confirm('Are you sure you want to delete this item?')) {
        fetch(`/api/settings/${type}/${id}`, {
            method: 'DELETE'
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                location.reload();
            } else {
                alert('Error: ' + (data.message || 'Failed to delete item'));
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error: Failed to delete item');
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