class ReportBuilder {
    constructor() {
        this.initializeEventListeners();
        this.loadAvailableFields();
        this.template = {
            name: '',
            fields: [],
            charts: [],
            conditions: []
        };
    }

    initializeEventListeners() {
        // Make fields draggable
        document.querySelectorAll('.field-item').forEach(field => {
            field.addEventListener('dragstart', this.handleDragStart.bind(this));
        });

        // Handle dropping fields onto the canvas
        const canvas = document.getElementById('reportCanvas');
        canvas.addEventListener('dragover', this.handleDragOver.bind(this));
        canvas.addEventListener('drop', this.handleDrop.bind(this));

        // Save template
        document.getElementById('saveTemplate').addEventListener('click', 
            this.saveTemplate.bind(this));

        // Preview report
        document.getElementById('previewReport').addEventListener('click',
            this.previewReport.bind(this));
    }

    async loadAvailableFields() {
        try {
            const response = await fetch('/api/metadata/fields');
            const fields = await response.json();
            this.renderAvailableFields(fields);
        } catch (error) {
            console.error('Error loading fields:', error);
        }
    }

    renderAvailableFields(fields) {
        const container = document.getElementById('availableFields');
        fields.forEach(field => {
            const fieldElement = document.createElement('div');
            fieldElement.className = 'field-item';
            fieldElement.draggable = true;
            fieldElement.dataset.fieldName = field.name;
            fieldElement.textContent = field.label;
            container.appendChild(fieldElement);
        });
    }

    async saveTemplate() {
        try {
            const response = await fetch('/reports/templates', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(this.template)
            });
            
            if (response.ok) {
                alert('Template saved successfully!');
            } else {
                throw new Error('Failed to save template');
            }
        } catch (error) {
            console.error('Error saving template:', error);
            alert('Error saving template');
        }
    }

    // ... Additional methods for handling drag and drop, 
    // updating properties, and managing the canvas ...
}

// Initialize the report builder when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new ReportBuilder();
}); 