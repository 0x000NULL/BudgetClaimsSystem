document.addEventListener('DOMContentLoaded', function () {
    // Add form submission handler
    const form = document.querySelector('form');
    form.addEventListener('submit', function(e) {
        // e.preventDefault(); // Uncomment this line for testing
        const formData = new FormData(this);
        console.log('Form submission data:');
        for (let [key, value] of formData.entries()) {
            console.log(key, value);
        }
    });

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
        'fileUploadsTab': 'fileUploads',
        'notesInfoTab': 'notesInfo'
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

        const fileInputs = document.querySelectorAll('input[type="file"]');
        let hasFiles = false;
        
        fileInputs.forEach(input => {
            if (input.files.length > 0) {
                hasFiles = true;
                console.log(`Files selected for ${input.name}:`, input.files);
            }
        });
        
        if (hasFiles) {
            // Add a loading indicator or disable submit button if needed
            console.log('Form submitted with files');
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

    // Add file preview functionality
    document.querySelectorAll('input[type="file"]').forEach(input => {
        input.addEventListener('change', function() {
            const category = this.id;
            const fileList = document.querySelector(`#${category}List`);
            
            if (fileList) {
                fileList.innerHTML = '';
                Array.from(this.files).forEach(file => {
                    const item = document.createElement('div');
                    item.className = 'file-item';
                    item.innerHTML = `
                        <span class="file-name">${file.name}</span>
                        <span class="file-size">(${(file.size / 1024).toFixed(2)} KB)</span>
                    `;
                    fileList.appendChild(item);
                });
            }
        });
    });

    // Handle adding new notes
    const addNoteButton = document.getElementById('addNote');
    const notesList = document.querySelector('.notes-list');
    
    if (addNoteButton) {
        addNoteButton.addEventListener('click', function() {
            const newNoteTextarea = document.querySelector('textarea[name="newNotes"]');
            const newNoteContent = newNoteTextarea.value;
            
            if (newNoteContent.trim()) {
                const noteData = {
                    content: newNoteContent,
                    type: 'user',
                    createdAt: new Date().toISOString(),
                    source: null
                };

                // Create new note HTML
                const noteDiv = document.createElement('div');
                noteDiv.className = 'note-item';
                noteDiv.innerHTML = `
                    <div class="note-header">
                        <span class="note-type">User</span>
                        <span class="note-date">${new Date().toLocaleString()}</span>
                    </div>
                    <div class="note-content">
                        <textarea readonly rows="3">${newNoteContent}</textarea>
                        <input type="hidden" name="newNote" value='${JSON.stringify(noteData)}' />
                    </div>
                    <button type="button" class="delete-note">Delete Note</button>
                `;

                // Remove "No notes" message if it exists
                const noNotesMessage = notesList.querySelector('p');
                if (noNotesMessage && noNotesMessage.textContent === 'No existing notes') {
                    noNotesMessage.remove();
                }

                // Add the new note at the beginning
                if (notesList.firstChild) {
                    notesList.insertBefore(noteDiv, notesList.firstChild);
                } else {
                    notesList.appendChild(noteDiv);
                }

                // Clear the input
                newNoteTextarea.value = '';
                
                // Show success message
                showToast('Note added successfully', 'success');
            } else {
                showToast('Please enter a note before adding', 'error');
            }
        });
    }

    // Handle deleting notes
    const deletedNoteIds = new Set();

    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('delete-note')) {
            if (confirm('Are you sure you want to delete this note?')) {
                const noteItem = e.target.closest('.note-item');
                const noteId = noteItem.dataset.noteId;
                
                if (noteId) {
                    // Add to deleted notes set
                    deletedNoteIds.add(noteId);
                    
                    // Add hidden input for deleted notes
                    let deletedNotesInput = document.querySelector('input[name="deletedNotes"]');
                    if (!deletedNotesInput) {
                        deletedNotesInput = document.createElement('input');
                        deletedNotesInput.type = 'hidden';
                        deletedNotesInput.name = 'deletedNotes';
                        document.querySelector('form').appendChild(deletedNotesInput);
                    }
                    deletedNotesInput.value = JSON.stringify(Array.from(deletedNoteIds));
                }

                noteItem.remove();

                // If no notes left, show the "No existing notes" message
                if (notesList.children.length === 0) {
                    notesList.innerHTML = '<p>No existing notes</p>';
                }

                // Show deletion message
                showToast('Note deleted successfully', 'success');
            }
        }
    });

    // Helper function to show toast messages
    function showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        if (toast) {
            toast.textContent = message;
            toast.className = `toast ${type}`;
            toast.style.display = 'block';
            setTimeout(() => {
                toast.style.display = 'none';
            }, 3000);
        }
    }
}); 