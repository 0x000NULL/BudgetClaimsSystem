/**
 * Opens the email form in a new window for the specified claim
 * @param {string} claimId - The ID of the claim
 */
function openEmailForm(claimId) {
    const url = `/email/form/${claimId}`;
    const windowName = 'EmailForm';
    const windowFeatures = 'width=600,height=600';
    window.open(url, windowName, windowFeatures);
}

/**
 * Displays a file inline in the file viewer
 * @param {Event} event - The click event
 * @param {string} filePath - Path to the file
 */
function viewFileInline(event, filePath) {
    event.preventDefault();
    const fileExtension = filePath.split('.').pop().toLowerCase();
    const viewer = document.getElementById('file-viewer');
    const content = document.getElementById('file-content');
    const fileName = event.target.getAttribute('data-filename');
    
    document.getElementById('current-file-name').textContent = fileName;
    
    content.innerHTML = '';
    
    if (['jpg', 'jpeg', 'png', 'gif'].includes(fileExtension)) {
        content.innerHTML = `<img src="${filePath}" style="max-width: 100%; max-height: 100%; object-fit: contain;">`;
    } else if (['pdf'].includes(fileExtension)) {
        content.innerHTML = `<embed src="${filePath}" width="100%" height="100%" type="application/pdf">`;
    } else {
        window.open(filePath, '_blank');
        return;
    }
    
    viewer.style.display = 'block';
}

/**
 * Closes the file viewer
 */
function closeFileViewer() {
    const viewer = document.getElementById('file-viewer');
    const content = document.getElementById('file-content');
    content.innerHTML = '';
    viewer.style.display = 'none';
}

/**
 * Initiates file download
 * @param {string} filePath - Path to the file to download
 */
function downloadFile(filePath) {
    const link = document.createElement('a');
    link.href = filePath;
    link.download = filePath.split('/').pop();
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    // Close viewer when clicking outside
    document.addEventListener('click', function(event) {
        const viewer = document.getElementById('file-viewer');
        if (event.target === viewer) {
            closeFileViewer();
        }
    });

    // Close viewer with escape key
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            closeFileViewer();
        }
    });
}); 