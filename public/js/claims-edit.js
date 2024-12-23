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

    // Handle file management
    const fileInputs = document.querySelectorAll('input[type="file"]');

    fileInputs.forEach(input => {
        const fileSection = input.closest('.file-section');
        const existingFiles = fileSection.querySelector('.existing-files');
        
        // Add rename functionality to existing files
        if (existingFiles) {
            Array.from(existingFiles.children).forEach(fileItem => {
                addFileControls(fileItem, input.name);
            });
        }

        // Handle new file selections
        input.addEventListener('change', function() {
            Array.from(this.files).forEach(file => {
                const fileItem = document.createElement('div');
                fileItem.className = 'file-item new-file';
                addFileControls(fileItem, input.name, file.name);
                existingFiles.appendChild(fileItem);
            });
        });
    });

    function addFileControls(fileItem, fileType, fileName = fileItem.dataset.filename) {
        fileItem.innerHTML = `
            <div class="file-info">
                <span class="file-name">${fileName}</span>
                <input type="text" class="rename-input" value="${fileName}" style="display: none;">
            </div>
            <div class="file-actions">
                <button type="button" class="view-file" data-file="${fileName}">View</button>
                <button type="button" class="rename-file" data-file="${fileName}">Rename</button>
                <button type="button" class="remove-file" data-file="${fileName}">Remove</button>
            </div>
        `;

        // Add rename event listener
        const renameBtn = fileItem.querySelector('.rename-file');
        const fileNameSpan = fileItem.querySelector('.file-name');
        const renameInput = fileItem.querySelector('.rename-input');

        renameBtn.addEventListener('click', function() {
            if (renameInput.style.display === 'none') {
                // Show rename input
                fileNameSpan.style.display = 'none';
                renameInput.style.display = 'block';
                renameInput.focus();
                renameBtn.textContent = 'Save';
            } else {
                // Save new filename
                const newName = renameInput.value.trim();
                const oldName = fileNameSpan.textContent;
                
                if (newName && newName !== oldName) {
                    // Add hidden input to track renamed files
                    let renamedFiles = document.querySelector('input[name="renamedFiles"]');
                    if (!renamedFiles) {
                        renamedFiles = document.createElement('input');
                        renamedFiles.type = 'hidden';
                        renamedFiles.name = 'renamedFiles';
                        renamedFiles.value = '[]';
                        document.querySelector('form').appendChild(renamedFiles);
                    }

                    // Update renamed files array
                    const renamedFilesArray = JSON.parse(renamedFiles.value);
                    renamedFilesArray.push({
                        type: fileType,
                        oldName: oldName,
                        newName: newName
                    });
                    renamedFiles.value = JSON.stringify(renamedFilesArray);

                    // Update UI
                    fileNameSpan.textContent = newName;
                    fileItem.dataset.filename = newName;
                    fileItem.querySelector('.view-file').dataset.file = newName;
                    fileItem.querySelector('.remove-file').dataset.file = newName;
                    fileItem.querySelector('.rename-file').dataset.file = newName;
                }
                
                fileNameSpan.style.display = 'block';
                renameInput.style.display = 'none';
                renameBtn.textContent = 'Rename';
            }
        });

        // Handle Enter key in rename input
        renameInput.addEventListener('keyup', function(e) {
            if (e.key === 'Enter') {
                renameBtn.click();
            }
        });

        // Handle Escape key to cancel rename
        renameInput.addEventListener('keyup', function(e) {
            if (e.key === 'Escape') {
                renameInput.value = fileNameSpan.textContent;
                fileNameSpan.style.display = 'block';
                renameInput.style.display = 'none';
                renameBtn.textContent = 'Rename';
            }
        });
    }

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

    // Add this to your existing DOMContentLoaded event listener
    const modal = document.getElementById('invoiceTotalModal');
    const modalClose = modal.querySelector('.modal-close');
    const cancelBtn = modal.querySelector('.cancel-btn');
    const saveBtn = modal.querySelector('.save-btn');
    const amountInput = modal.querySelector('#invoiceAmount');
    let currentInvoiceFile = null;

    // Handle clicking "Add Total" button
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('add-invoice-total')) {
            currentInvoiceFile = e.target.dataset.file;
            modal.style.display = 'block';
            amountInput.value = '';
            amountInput.focus();
        }
    });

    // Close modal handlers
    modalClose.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeModal();
        }
    });

    // Save invoice total
    saveBtn.addEventListener('click', function() {
        const amount = parseFloat(amountInput.value);
        if (isNaN(amount) || amount < 0) {
            alert('Please enter a valid amount');
            return;
        }

        // Add hidden input to track invoice totals
        let invoiceTotals = document.querySelector('input[name="invoiceTotals"]');
        if (!invoiceTotals) {
            invoiceTotals = document.createElement('input');
            invoiceTotals.type = 'hidden';
            invoiceTotals.name = 'invoiceTotals';
            invoiceTotals.value = '[]';
            document.querySelector('form').appendChild(invoiceTotals);
        }

        // Update invoice totals array
        const totalsArray = JSON.parse(invoiceTotals.value);
        const existingIndex = totalsArray.findIndex(item => item.fileName === currentInvoiceFile);
        
        if (existingIndex !== -1) {
            totalsArray[existingIndex].total = amount;
        } else {
            totalsArray.push({
                fileName: currentInvoiceFile,
                total: amount
            });
        }
        
        invoiceTotals.value = JSON.stringify(totalsArray);
        
        // Visual feedback
        const fileItem = document.querySelector(`.file-item[data-filename="${currentInvoiceFile}"]`);
        const existingTotal = fileItem.querySelector('.invoice-total');
        if (existingTotal) {
            existingTotal.textContent = `$${amount.toFixed(2)}`;
        } else {
            const totalSpan = document.createElement('span');
            totalSpan.className = 'invoice-total';
            totalSpan.textContent = `$${amount.toFixed(2)}`;
            fileItem.querySelector('.file-info').appendChild(totalSpan);
        }

        closeModal();
    });

    function closeModal() {
        modal.style.display = 'none';
        currentInvoiceFile = null;
        amountInput.value = '';
    }

    // Handle Enter key in amount input
    amountInput.addEventListener('keyup', function(e) {
        if (e.key === 'Enter') {
            saveBtn.click();
        }
    });
}); 