# Notice of Intent (NOI) and Document Processing System TODO

## Notice of Intent (NOI) Template Implementation

### Template Creation & Management
- [ ] **Word Document Template Design**
  - [ ] Create base NOI Word template with merge fields
  - [ ] Add company letterhead and branding
  - [ ] Define standard NOI sections and formatting
  - [ ] Create template version control system
  - [ ] Add template preview functionality
  - [ ] Implement template validation checks

### Document Generation System
- [ ] **NOI Document Generation**
  - [ ] Implement document generation service using docx-templater
  - [ ] Add merge field mapping from claim data
  - [ ] Create address formatting utility
  - [ ] Implement document caching mechanism
  - [ ] Add error handling for generation failures
  - [ ] Create document preview functionality

### UI Implementation
- [ ] **Claim View Integration**
  - [ ] Add 'Generate NOI' button to claim view footer
  - [ ] Create NOI generation loading indicator
  - [ ] Implement success/error notifications
  - [ ] Add document preview modal
  - [ ] Create print dialog integration
  - [ ] Add printer selection interface

### Printing Functionality
- [ ] **Print System Integration**
  - [ ] Implement direct-to-printer functionality
  - [ ] Add printer selection dialog
  - [ ] Create address label printing option
  - [ ] Implement print queue management
  - [ ] Add print job status tracking
  - [ ] Create print history logging

### Testing & Validation
- [ ] **NOI System Testing**
  - [ ] Unit tests for document generation
  - [ ] Integration tests for printing system
  - [ ] Template validation tests
  - [ ] Print system compatibility testing
  - [ ] Error handling verification
  - [ ] Performance testing for large batches

### Documentation
- [ ] **NOI System Documentation**
  - [ ] Template modification guide
  - [ ] Printer setup instructions
  - [ ] User guide for NOI generation
  - [ ] Troubleshooting documentation
  - [ ] API documentation for NOI services
  - [ ] System architecture documentation

## Document Upload & Claim Creation System

### Document Upload Infrastructure
- [x] **File Upload System Enhancement**
  - [x] Configure Multer/Express-fileupload for handling multiple file types
  - [x] Implement file type validation (PDF, DOC, DOCX, JPG, PNG)
  - [x] Add file size restrictions (20MB limit per file)
  - [x] Create secure file storage structure
  - [ ] Implement virus scanning integration
  - [ ] Add file compression for large documents
  - [x] Create thumbnail generation for previews
  - [x] Implement file cleanup scheduling for temporary uploads

### Rental Contract Processing
- [ ] **Contract Upload & Analysis**
  - [x] Create dedicated rental agreement upload endpoint
  - [x] Implement PDF text extraction using pdf-parse
  - [x] Create document template definitions
    - [x] Define regex patterns for all required fields
    - [x] Create field validation rules
    - [x] Add field transformation functions
  - [x] Create rental agreement parsing service
    - [x] Extract RA number (raNumber)
    - [x] Extract customer information
      - [x] Customer name (customerName)
      - [x] Customer number (customerNumber)
      - [x] Customer email (customerEmail)
      - [x] Customer address (customerAddress)
      - [x] Driver's license number (customerDriversLicense)
    - [x] Extract vehicle information
      - [x] Car make (carMake)
      - [x] Car model (carModel)
      - [x] Car year (carYear)
      - [x] Car color (carColor)
      - [x] VIN number (carVIN)
      - [x] Vehicle odometer reading (vehicleOdometer)
    - [x] Extract rental location information (rentingLocation)
    - [x] Extract insurance information
      - [x] LDW acceptance status (ldwAccepted)
      - [x] Renters liability insurance status (rentersLiabilityInsurance)
      - [x] Loss damage waiver status (lossDamageWaiver)
  - [x] Add confidence scoring system
  - [x] Implement template version detection
  - [x] Create parsing error handling
  - [x] Store rental agreement in files array

### New Requirements for Automatic Claim Creation
- [ ] **Automated Claim Generation**
  - [ ] Create dedicated route for rental agreement-only claim creation
  - [ ] Implement automatic claim number generation
  - [ ] Set up default claim status for auto-generated claims
  - [ ] Create validation pipeline for extracted data
  - [ ] Implement error handling for incomplete/invalid data
  - [ ] Add notification system for new auto-generated claims
  - [ ] Create audit trail for automated claim creation

### UI Implementation for Auto-Claim Creation
- [ ] **Upload Interface**
  - [ ] Create drag-and-drop zone specifically for rental agreements
  - [ ] Add progress indicator for OCR processing
  - [ ] Implement preview of extracted data before claim creation
  - [ ] Add manual override/correction interface
  - [ ] Create success/error notification system
  - [ ] Add claim preview before final submission

### Testing & Validation
- [ ] **Automated Processing Testing**
  - [ ] Create unit tests for OCR processing
  - [ ] Implement integration tests for claim generation
  - [ ] Add validation tests for extracted data
  - [ ] Create performance tests for large documents
  - [ ] Implement error scenario testing
  - [ ] Add end-to-end testing for complete flow

### Documentation
- [ ] **Auto-Claim System Documentation**
  - [ ] Create user guide for rental agreement upload
  - [ ] Document supported rental agreement formats
  - [ ] Add troubleshooting guide for common issues
  - [ ] Create API documentation for auto-claim endpoints
  - [ ] Document template requirements for optimal OCR
  - [ ] Add system architecture documentation

### Police Report Integration
- [ ] **Police Report Processing**
  - [ ] Implement report upload functionality
  - [ ] Create PDF parsing service for police reports
    - [ ] Define police report template patterns
    - [ ] Extract police department name (policeDepartment)
    - [ ] Extract police report number (policeReportNumber)
    - [ ] Extract accident date (accidentDate)
    - [ ] Extract incident details for description field
    - [ ] Extract third party information
      - [ ] Third party name (thirdPartyName)
      - [ ] Third party address (thirdPartyAddress)
      - [ ] Third party phone number (thirdPartyPhoneNumber)
      - [ ] Third party insurance information
        - [ ] Insurance name (thirdPartyInsuranceName)
        - [ ] Adjuster name (thirdPartyAdjusterName)
        - [ ] Policy number (thirdPartyPolicyNumber)
        - [ ] Claim number (thirdPartyClaimNumber)
  - [ ] Add report validation system
  - [ ] Store police report in files.policeReport array
  - [ ] Create report-to-claim linking
  - [ ] Implement report status tracking
  - [ ] Add fault determination support (isRenterAtFault)

### Document Management System
- [ ] **Document Organization**
  - [ ] Create document categorization system
  - [ ] Implement document tagging
  - [ ] Add document search functionality
  - [ ] Create document relationship mapping
  - [ ] Implement document access controls
  - [ ] Add document retention policies
  - [ ] Create document audit trail
  - [ ] Implement document versioning

### User Interface
- [ ] **Upload Interface**
  - [ ] Create drag-and-drop upload zone
  - [ ] Add multi-file upload support
  - [ ] Implement upload progress indicators
  - [ ] Create file type validation feedback
  - [ ] Add file preview functionality
  - [ ] Implement upload retry mechanism
  - [ ] Create upload queue management
  - [ ] Add batch upload support

- [ ] **Document Processing Interface**
  - [ ] Create document review workflow
  - [ ] Implement data extraction preview
  - [ ] Add manual data correction interface
  - [ ] Create document comparison view
  - [ ] Implement batch processing controls
  - [ ] Add processing status indicators
  - [ ] Create error correction workflow

### Data Integration
- [ ] **Claim Data Management**
  - [ ] Create data mapping configurations
  - [ ] Implement field validation rules
  - [ ] Add data normalization services
  - [ ] Create data conflict resolution
  - [ ] Implement data merge strategies
  - [ ] Add automated data quality checks
  - [ ] Create data update notifications
  - [ ] Implement change tracking

### Testing & Quality Assurance
- [ ] **Upload Testing**
  - [ ] Unit tests for file processing
  - [ ] Integration tests for OCR
  - [ ] Security testing for file handling
  - [ ] Performance testing for large files
  - [ ] Error handling verification
  - [ ] Concurrent upload testing
  - [ ] Browser compatibility testing

- [ ] **Data Processing Testing**
  - [ ] Validation rule testing
  - [ ] Data extraction accuracy testing
  - [ ] Edge case handling
  - [ ] Integration testing with claim system
  - [ ] Performance testing for batch processing
  - [ ] Error recovery testing

### Security & Compliance
- [ ] **Document Security**
  - [ ] Implement document encryption
  - [ ] Add access control logging
  - [ ] Create secure storage policies
  - [ ] Implement PII detection
  - [ ] Add data masking capabilities
  - [ ] Create security audit trails
  - [ ] Implement compliance reporting

### Documentation
- [ ] **System Documentation**
  - [ ] Create user upload guidelines
  - [ ] Document supported file types
  - [ ] Create troubleshooting guides
  - [ ] Document data mapping rules
  - [ ] Create API documentation
  - [ ] Add system architecture diagrams
  - [ ] Create maintenance procedures
  - [ ] Document backup procedures 