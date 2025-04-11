// Report Builder JavaScript
$(document).ready(function() {
    // Initialize components
    initTabs();
    initFieldSelection();
    initFormatSelection();
    initFilters();
    initDatePickers();
    initSelect2();
    initPreview();
    initFieldCategories();
    initFormSubmission();
});

// Tab Management
function initTabs() {
    $('.tab').on('click', function() {
        const tabId = $(this).data('tab');
        
        // Update active tab
        $('.tab').removeClass('active');
        $(this).addClass('active');
        
        // Show corresponding content
        $('.tab-content').removeClass('active');
        $(`#${tabId}-tab`).addClass('active');
        
        // Update preview if on preview tab
        if (tabId === 'preview') {
            updatePreview();
        }
    });
}

// Field Selection
function initFieldSelection() {
    $('.field-item').on('click', function(e) {
        // Don't toggle if clicking the checkbox directly
        if ($(e.target).is('input[type="checkbox"]')) {
            return;
        }
        
        const checkbox = $(this).find('input[type="checkbox"]');
        checkbox.prop('checked', !checkbox.prop('checked'));
        $(this).toggleClass('selected');
        updatePreview();
    });

    // Handle checkbox clicks
    $('.field-item input[type="checkbox"]').on('click', function(e) {
        e.stopPropagation();
        $(this).closest('.field-item').toggleClass('selected');
        updatePreview();
    });
}

// Format Selection
function initFormatSelection() {
    $('.format-option').on('click', function() {
        $('.format-option').removeClass('selected');
        $(this).addClass('selected');
        $(this).find('input[type="radio"]').prop('checked', true);
        updatePreview();
    });
}

// Filter Management
function initFilters() {
    // Add new filter
    $('.add-filter').on('click', function() {
        addFilterRow();
    });

    // Remove filter
    $(document).on('click', '.remove-filter', function() {
        $(this).closest('.filter-row').remove();
        updatePreview();
    });

    // Filter field change
    $(document).on('change', '.filter-field', function() {
        updateFilterOperators($(this));
    });

    // Validate filter inputs
    $(document).on('change', '.filter-value', function() {
        validateFilterInput($(this));
    });
}

// Add new filter row
function addFilterRow() {
    const filterRow = `
        <div class="filter-row">
            <select name="filterField[]" class="filter-field">
                <option value="">Select Field</option>
                <option value="date">Date</option>
                <option value="status">Status</option>
                <option value="customerName">Customer Name</option>
                <option value="insuranceCarrier">Insurance Carrier</option>
                <option value="damagesTotal">Total Damages</option>
            </select>
            <select name="filterOperator[]" class="filter-operator">
                <option value="">Select Operator</option>
                <option value="equals">Equals</option>
                <option value="contains">Contains</option>
                <option value="greaterThan">Greater Than</option>
                <option value="lessThan">Less Than</option>
                <option value="between">Between</option>
            </select>
            <input type="text" name="filterValue[]" class="filter-value" placeholder="Enter value">
            <span class="remove-filter tooltip">
                ×
                <span class="tooltiptext">Remove this filter</span>
            </span>
        </div>
    `;
    
    $('#filter-container').append(filterRow);
    initSelect2();
    initDatePickers();
    updatePreview();
}

// Update filter operators based on field type
function updateFilterOperators(select) {
    const fieldType = select.val();
    const operatorSelect = select.closest('.filter-row').find('.filter-operator');
    const valueInput = select.closest('.filter-row').find('.filter-value');
    
    // Clear existing operators
    operatorSelect.empty();
    operatorSelect.append('<option value="">Select Operator</option>');
    
    // Add appropriate operators based on field type
    if (fieldType === 'date') {
        operatorSelect.append(`
            <option value="equals">Equals</option>
            <option value="before">Before</option>
            <option value="after">After</option>
            <option value="between">Between</option>
        `);
        valueInput.attr('type', 'text').addClass('datepicker').attr('placeholder', 'Select date');
        initDatePickers();
    } else if (fieldType === 'damagesTotal') {
        operatorSelect.append(`
            <option value="equals">Equals</option>
            <option value="greaterThan">Greater Than</option>
            <option value="lessThan">Less Than</option>
            <option value="between">Between</option>
        `);
        valueInput.attr('type', 'number').attr('placeholder', 'Enter amount');
    } else {
        operatorSelect.append(`
            <option value="equals">Equals</option>
            <option value="contains">Contains</option>
            <option value="startsWith">Starts With</option>
            <option value="endsWith">Ends With</option>
        `);
        valueInput.attr('type', 'text').attr('placeholder', 'Enter value');
    }

    // Clear the value input
    valueInput.val('');
    updatePreview();
}

// Validate filter input
function validateFilterInput(input) {
    const fieldType = input.closest('.filter-row').find('.filter-field').val();
    const operator = input.closest('.filter-row').find('.filter-operator').val();
    const value = input.val();

    if (!fieldType || !operator) {
        return;
    }

    if (fieldType === 'date') {
        if (!isValidDate(value)) {
            showError(input, 'Please enter a valid date');
        } else {
            clearError(input);
        }
    } else if (fieldType === 'damagesTotal') {
        if (isNaN(value) || value < 0) {
            showError(input, 'Please enter a valid amount');
        } else {
            clearError(input);
        }
    }
}

// Show error message
function showError(input, message) {
    const errorDiv = $('<div class="error-message"></div>').text(message);
    input.addClass('error');
    input.after(errorDiv);
}

// Clear error message
function clearError(input) {
    input.removeClass('error');
    input.next('.error-message').remove();
}

// Check if date is valid
function isValidDate(dateString) {
    if (!dateString) return false;
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
}

// Initialize date pickers
function initDatePickers() {
    $('.datepicker').datepicker({
        format: 'mm/dd/yyyy',
        autoclose: true,
        todayHighlight: true,
        clearBtn: true
    });
}

// Initialize Select2
function initSelect2() {
    $('.filter-field, .filter-operator').select2({
        width: '100%',
        minimumResultsForSearch: Infinity,
        placeholder: function() {
            return $(this).data('placeholder');
        }
    });
}

// Initialize field categories
function initFieldCategories() {
    // Add collapse/expand functionality to categories
    $('.field-category h4').on('click', function() {
        $(this).closest('.field-category').toggleClass('collapsed');
    });
}

// Preview Management
function initPreview() {
    // Update preview when form changes
    $('#reportForm').on('change', function() {
        updatePreview();
    });
}

// Update preview content
function updatePreview() {
    const selectedFields = [];
    $('.field-item input[type="checkbox"]:checked').each(function() {
        selectedFields.push($(this).val());
    });

    const filters = [];
    $('.filter-row').each(function() {
        const field = $(this).find('.filter-field').val();
        const operator = $(this).find('.filter-operator').val();
        const value = $(this).find('.filter-value').val();
        if (field && operator && value) {
            filters.push({ field, operator, value });
        }
    });

    const format = $('input[name="format"]:checked').val();

    // Update preview section
    const previewHtml = `
        <h4>Preview Configuration</h4>
        <div class="preview-content">
            <div class="preview-section">
                <p><strong>Selected Fields:</strong> ${selectedFields.length ? selectedFields.join(', ') : 'None'}</p>
                <p><strong>Filters:</strong> ${filters.length ? filters.map(f => `${f.field} ${f.operator} ${f.value}`).join(', ') : 'None'}</p>
                <p><strong>Output Format:</strong> ${format.toUpperCase()}</p>
            </div>
            <div class="preview-actions">
                <button type="button" class="preview-button">Generate Preview</button>
            </div>
        </div>
    `;

    $('.preview-section').html(previewHtml);
    
    // Add event listener to the preview button
    $('.preview-button').on('click', function() {
        generatePreview();
    });
}

// Initialize form submission
function initFormSubmission() {
    $('#reportForm').on('submit', function(e) {
        e.preventDefault();
        
        // Collect form data
        const selectedFields = [];
        $('.field-item input[type="checkbox"]:checked').each(function() {
            selectedFields.push($(this).val());
        });

        const filters = [];
        $('.filter-row').each(function() {
            const field = $(this).find('.filter-field').val();
            const operator = $(this).find('.filter-operator').val();
            const value = $(this).find('.filter-value').val();
            if (field && operator && value) {
                filters.push({ field, operator, value });
            }
        });

        const format = $('input[name="format"]:checked').val();

        // Log the data being sent
        console.log('Sending report generation request with data:', {
            fields: selectedFields,
            filters: filters,
            format: format
        });

        // Validate form
        if (!validateForm()) {
            return;
        }
        
        // Show loading state
        $('.generate-button').prop('disabled', true).text('Generating...');
        
        // Create a hidden form for file download
        const downloadForm = $('<form>', {
            method: 'POST',
            action: '/reports/generate',
            target: '_blank'
        }).appendTo('body');

        // Add fields to the form
        downloadForm.append($('<input>', {
            type: 'hidden',
            name: 'fields',
            value: JSON.stringify(selectedFields)
        }));

        downloadForm.append($('<input>', {
            type: 'hidden',
            name: 'filters',
            value: JSON.stringify(filters)
        }));

        downloadForm.append($('<input>', {
            type: 'hidden',
            name: 'format',
            value: format
        }));

        // Submit the form
        downloadForm.submit();

        // Remove the form after submission
        setTimeout(() => {
            downloadForm.remove();
            $('.generate-button').prop('disabled', false).text('Generate Report');
        }, 1000);
    });
}

// Form validation
function validateForm() {
    let isValid = true;
    const selectedFields = $('.field-item input[type="checkbox"]:checked').length;
    
    if (selectedFields === 0) {
        showError($('.field-group'), 'Please select at least one field for the report.');
        isValid = false;
    } else {
        clearError($('.field-group'));
    }
    
    // Validate filters
    $('.filter-row').each(function() {
        const field = $(this).find('.filter-field').val();
        const operator = $(this).find('.filter-operator').val();
        const value = $(this).find('.filter-value').val();
        
        if (field && operator && !value) {
            showError($(this).find('.filter-value'), 'Please enter a value for this filter.');
            isValid = false;
        }
    });
    
    return isValid;
}

// Generate preview
function generatePreview() {
    const selectedFields = [];
    $('.field-item input[type="checkbox"]:checked').each(function() {
        selectedFields.push($(this).val());
    });

    const filters = [];
    $('.filter-row').each(function() {
        const field = $(this).find('.filter-field').val();
        const operator = $(this).find('.filter-operator').val();
        const value = $(this).find('.filter-value').val();
        if (field && operator && value) {
            filters.push({ field, operator, value });
        }
    });

    const format = $('input[name="format"]:checked').val();

    // Log the data being sent
    console.log('Sending preview request with data:', {
        fields: selectedFields,
        filters: filters,
        format: format
    });

    // Make AJAX request to generate preview
    $.ajax({
        url: '/reports/preview',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            fields: selectedFields,
            filters: filters,
            format: format
        }),
        success: function(response) {
            console.log('Preview response:', response);
            // Update preview section with the response
            $('.preview-section').html(response);
        },
        error: function(xhr, status, error) {
            console.error('Preview error:', {
                status: status,
                error: error,
                response: xhr.responseText
            });
            showError($('.preview-section'), 'Error generating preview: ' + error);
        }
    });
} 