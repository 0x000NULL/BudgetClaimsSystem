document.addEventListener('DOMContentLoaded', function() {
    // File viewer functionality
    window.openFileViewer = function(filename) {
        const fileViewer = document.getElementById('fileViewer');
        const fileViewerTitle = document.getElementById('fileViewerTitle');
        const fileViewerFrame = document.getElementById('fileViewerFrame');
        
        fileViewerTitle.textContent = filename;
        fileViewerFrame.src = `/uploads/${filename}`;
        fileViewer.style.display = 'block';
    };

    window.closeFileViewer = function() {
        const fileViewer = document.getElementById('fileViewer');
        const fileViewerFrame = document.getElementById('fileViewerFrame');
        fileViewerFrame.src = '';
        fileViewer.style.display = 'none';
    };

    // Add click handlers for view buttons
    document.querySelectorAll('.view-file').forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const filename = this.dataset.file;
            openFileViewer(filename);
        });
    });

    // Add click handler for close button
    document.getElementById('closeFileViewerBtn').addEventListener('click', closeFileViewer);

    // Close viewer when clicking outside
    document.getElementById('fileViewer').addEventListener('click', function(e) {
        if (e.target === this) {
            closeFileViewer();
        }
    });

    // Handle escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeFileViewer();
        }
    });
}); 