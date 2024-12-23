document.addEventListener('DOMContentLoaded', function() {
    // Get claim ID from the page
    if (typeof claimId === 'undefined') {
        console.error('Claim ID not found on page');
        return;
    }

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

    // Handle invoice total editing
    document.querySelectorAll('.btn-edit-invoice').forEach(button => {
        button.addEventListener('click', function() {
            const invoiceItem = this.closest('.invoice-item');
            const amountSpan = invoiceItem.querySelector('.invoice-amount');
            const amountInput = invoiceItem.querySelector('.invoice-edit-input');
            
            if (this.textContent === 'Edit') {
                // Switch to edit mode
                amountSpan.style.display = 'none';
                amountInput.style.display = 'inline-block';
                this.textContent = 'Save';
                this.classList.add('save');
                // Set value to current amount without $ sign
                const currentAmount = parseFloat(amountSpan.textContent.replace('$', '')) || 0;
                amountInput.value = currentAmount.toFixed(2);
                amountInput.focus();
            } else {
                // Save the changes
                const fileName = invoiceItem.dataset.filename;
                const newTotal = parseFloat(amountInput.value) || 0;

                fetch(`/claims/${claimId}/invoice-total`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        fileName: fileName,
                        total: newTotal
                    })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        // Update the display with proper formatting
                        amountSpan.textContent = `$${newTotal.toFixed(2)}`;
                        amountSpan.style.display = 'inline-block';
                        amountInput.style.display = 'none';
                        this.textContent = 'Edit';
                        this.classList.remove('save');

                        // Update admin fee with the returned value
                        const adminFeeElement = document.getElementById('adminFeeAmount');
                        if (adminFeeElement && data.data.adminFee !== undefined) {
                            adminFeeElement.textContent = `$${data.data.adminFee.toFixed(2)}`;
                        }
                    } else {
                        alert('Failed to update invoice total');
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    alert('Error updating invoice total');
                });
            }
        });
    });

    // Function to update admin fee
    function updateAdminFee() {
        const invoiceTotals = Array.from(document.querySelectorAll('.invoice-amount'))
            .map(span => parseFloat(span.textContent.replace('$', '')) || 0);
        
        const totalInvoices = invoiceTotals.reduce((sum, total) => sum + total, 0);
        let adminFee = 0;
        
        if (totalInvoices >= 100 && totalInvoices < 500) {
            adminFee = 50;
        } else if (totalInvoices >= 500 && totalInvoices < 1500) {
            adminFee = 100;
        } else if (totalInvoices >= 1500) {
            adminFee = 150;
        }

        document.querySelector('label[for="adminFee"] + p').textContent = `$${adminFee.toFixed(2)}`;
    }
}); 