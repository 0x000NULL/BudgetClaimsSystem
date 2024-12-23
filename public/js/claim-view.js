document.addEventListener('DOMContentLoaded', function() {
    // Event delegation for file actions
    document.addEventListener('click', function(event) {
        const target = event.target;

        // Handle file viewing
        if (target.matches('.file-link')) {
            event.preventDefault();
            const filename = target.dataset.filename;
            openFileViewer(filename);
        }

        // Handle file downloading
        if (target.matches('[data-action="download"]')) {
            event.preventDefault();
            const filePath = target.dataset.filepath;
            handleFileDownload(filePath);
        }

        // Handle email form
        if (target.matches('[data-action="email"]')) {
            event.preventDefault();
            const claimId = target.dataset.claimid;
            handleEmailForm(claimId);
        }
    });

    // Setup file viewer event listeners
    setupFileViewerEvents();
});

function setupFileViewerEvents() {
    // Close button event
    document.querySelector('.close-button').addEventListener('click', closeFileViewer);

    // Close on escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeFileViewer();
        }
    });

    // Prevent click inside viewer from closing it
    document.querySelector('.file-viewer-content').addEventListener('click', function(e) {
        e.stopPropagation();
    });

    // Close on click outside viewer
    document.querySelector('.file-viewer').addEventListener('click', function(e) {
        if (e.target === this) {
            closeFileViewer();
        }
    });
}

function openFileViewer(filename) {
    const fileViewer = document.querySelector('.file-viewer');
    const fileViewerContent = document.querySelector('.file-viewer-content');
    const ext = filename.split('.').pop().toLowerCase();

    // Clear previous content
    fileViewerContent.innerHTML = '';
    
    // Update the filename display in header
    document.querySelector('.file-viewer-header span').textContent = filename;

    if (ext === 'pdf') {
        // Create iframe for PDF viewing
        const iframe = document.createElement('iframe');
        iframe.src = `/uploads/${filename}#toolbar=0`; // Disable default PDF toolbar
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = 'none';
        fileViewerContent.appendChild(iframe);
    } else if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) {
        // Handle images
        const img = document.createElement('img');
        img.src = `/uploads/${filename}`;
        img.style.maxWidth = '100%';
        img.style.maxHeight = '100%';
        img.style.objectFit = 'contain';
        fileViewerContent.appendChild(img);
    } else {
        // Handle other file types
        fileViewerContent.innerHTML = `
            <div class="unsupported-file">
                <p>This file type (${ext}) cannot be previewed directly.</p>
                <a href="/uploads/${filename}" download class="btn">Download File</a>
            </div>
        `;
    }

    // Show the viewer
    fileViewer.style.display = 'block';
}

function closeFileViewer() {
    const fileViewer = document.querySelector('.file-viewer');
    const fileViewerContent = document.querySelector('.file-viewer-content');
    fileViewerContent.innerHTML = '';
    fileViewer.style.display = 'none';
}

function handleFileDownload(filePath) {
    const link = document.createElement('a');
    link.href = filePath;
    link.download = filePath.split('/').pop();
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function handleEmailForm(claimId) {
    const url = `/email/form/${claimId}`;
    const windowName = 'EmailForm';
    const windowFeatures = 'width=600,height=600';
    window.open(url, windowName, windowFeatures);
} 