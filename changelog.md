# Changelog

## [1.4.42] - 2024-01-08 (Commit: TBD)

### Added
- Added standardized API response formatting with success/error structure
- Added helper functions for consistent error responses and success messages
- Added initialization of global file settings constants to prevent undefined references
- Added improved password hashing and security in customer routes
- Added fallback mechanism for Settings.updateSettings with helper function
- Added enhanced input validation across all API routes
- Added JSDoc documentation for settings management routes
- Added comprehensive test suite for API routes with 60+ test cases covering:
  - Claims management endpoints (GET, POST, PUT, DELETE)
  - Customer management with security validations
  - Settings management for file types, sizes, and count limits
  - Location, status, and damage type CRUD operations
  - Error scenario handling and validation
- Added pagination, filtering, and export options to audit logs
  - Implemented page-based navigation with configurable page size
  - Added filtering by user ID, action type, and date range
  - Added export functionality for CSV, Excel, and PDF formats
  - Added unique action type dropdown for easier filtering
- Added comprehensive unit tests for audit logs functionality
  - Added tests for filtering and pagination
  - Added tests for export features (CSV, Excel, PDF)
  - Added error handling test cases
- Added input validation to helper functions in claims.js:
  - Enhanced validateFile function to handle edge cases and validate file/category inputs
  - Improved sanitizeFilename function to handle null values and add timestamps for uniqueness
  - Enhanced filterSensitiveData function to handle nested objects and arrays
  - Improved calculateAdminFee function to validate invoice totals and handle edge cases
- Added percentage statistics for dashboard status distribution
- Added statusColors to dashboard render context for consistent UI color usage
- Added explicit dashboard request logging for better audit trail
- Added null safety checks throughout dashboard.js to prevent runtime errors
- Added comprehensive test suite for dashboard.js:
  - Added test coverage for all utility functions (filterSensitiveData, logRequest, color utilities)
  - Added tests for dashboard route with various data scenarios
  - Added error case testing for null/undefined handling
  - Added edge case tests for empty claims and status collections
  - Added validation for dashboard data transformation
- Added HTML email support in email routes with improved body handling
- Added email attachment support in email sending functionality
- Added proper validation for email sending with required field checks
- Added improved error details in email route responses
- Added null safety checks to email template variable replacement

### Changed
- Standardized error handling and response format across all API endpoints
- Improved security by excluding passwords from customer API responses
- Enhanced validation for all numeric inputs with proper type checking
- Improved email uniqueness validation when creating/updating customers
- Enhanced error messages with more specific details for client debugging
- Updated all settings routes to use consistent validation patterns
- Enhanced middleware usage for better security and authentication
- Improved audit logs user experience
  - Enhanced EJS template with filter controls and export buttons
  - Updated audit logs display with null safety for user objects
  - Added date range picker for filtering logs by timeframe 
- Replaced console.log debugging with structured Pino logging in audit logs routes
- Improved error handling in audit logs with better error page rendering
- Standardized logging across the claims.js file:
  - Replaced all console.log/console.error calls with logger.info/logger.error
  - Added detailed context to log messages for better debugging
  - Improved error logging with appropriate error levels
- Enhanced error handling in claims routes:
  - Updated error responses to use consistent JSON format
  - Improved error messages with better context
  - Added proper status codes to error responses
- Improved dashboard.js code organization with better structure and logical flow
- Enhanced Mongoose query patterns in dashboard.js with proper promise handling
- Improved JSDoc documentation in dashboard.js with detailed parameter descriptions and return values
- Enhanced color manipulation functions with better error handling and validation
- Modified dashboard.js to expose utility functions for testing when in test environment
- Converted callback-based email sending to async/await pattern in email routes
- Improved email.js structure with external nodemailer configuration
- Enhanced email route logging with better context and sanitization

### Fixed
- Fixed undefined global constants (ALLOWED_FILE_TYPES, MAX_FILE_SIZES, MAX_FILES_PER_CATEGORY)
- Fixed potential security issues with password handling in customer routes
- Fixed validation issues for file type settings to ensure proper format and content
- Fixed settings update behavior with better error handling
- Fixed item deletion routes to prevent removing items in use by claims
- Fixed case sensitivity issues with duplicate checking via regex pattern matching
- Fixed potential MongoDB error handling for duplicate key errors (code 11000)
- Fixed error handling in audit logs to render error templates instead of returning JSON
- Fixed potential null reference errors in audit logs display
- Fixed missing pagination in audit logs for handling large datasets
- Fixed duplicate route handler for '/location/add' in claims.js
- Fixed deprecated Mongoose method usage:
  - Replaced claim.remove() with claim.deleteOne() for proper document deletion
- Fixed inconsistent error handling in claims routes
- Fixed potential crashes in dashboard.js when claims or statuses are empty
- Fixed color lightening calculation in dashboard.js to prevent invalid color values
- Fixed destructuring errors in request logging by providing default empty objects
- Fixed case sensitivity issues in sensitive data filtering
- Fixed MongoDB connection handling in tests to prevent "already connected" errors
- Fixed absolute file path in email.js JSDoc comment to use relative path
- Fixed potential null reference errors in email template variable replacement
- Fixed inconsistent template rendering in email routes
- Fixed potential security issues in email header logging

### Security
- Improved password handling with bcryptjs for secure hashing
- Enhanced protection against duplicate resource creation
- Added validation to prevent security issues in settings management
- Improved email uniqueness validation to prevent account conflicts
- Added sanitization for input data across all routes
- Enhanced error responses to avoid leaking sensitive information in production
- Enhanced audit logs security with proper authorization checks
- Improved error handling to prevent information disclosure in audit logs
- Enhanced sensitive data filtering:
  - Improved filterSensitiveData function to handle nested objects
  - Added more fields to the sensitive data list (creditCard, securityAnswer)
  - Implemented recursive filtering for complex data structures
  - Added case-insensitive comparison for sensitive field detection
- Added more sensitive fields to redaction list in email routes (customerDriversLicense, carVIN)
- Enhanced email header filtering to prevent leaking sensitive information
- Improved email route authentication checks

### Technical
- Implemented standardized response format for all API endpoints
- Added consistency in route handler patterns
- Improved MongoDB query patterns with proper validation
- Enhanced error logging with filtered sensitive data
- Improved integration with pino logger for better debugging
- Enhanced mongoose model interactions with proper options (runValidators, etc.)
- Added in-memory MongoDB testing with mongodb-memory-server
- Implemented mock authentication for secure route testing
- Added isolated test environment with proper setup/teardown
- Enhanced audit logs with optimized database queries
  - Added query filtering at database level for improved performance
  - Added pagination with skip/limit for efficient data retrieval
  - Added lean() for better query performance
- Limited PDF exports to 1000 records for performance optimization
- Improved helper function robustness:
  - Enhanced file validation with better error messages
  - Improved filename sanitization with proper extension handling
  - Added timestamp-based uniqueness to filenames
  - Enhanced calculateAdminFee to handle various edge cases
- Added explicit .exec() to Mongoose queries for proper promise handling in dashboard.js
- Implemented better regex validation for hex color codes in dashboard.js
- Enhanced dashboard data transformation with proper null handling
- Added try-catch blocks for better error management in utility functions
- Implemented conditional exports in dashboard.js for better testability
- Refactored email.js to use external nodemailer configuration
- Enhanced email variable replacement with fallbacks for all claim properties
- Added proper async/await pattern for email sending with structured try-catch blocks

### Testing
- Created comprehensive Jest test suite with Supertest for API integration testing
- Added test coverage for all API endpoints and CRUD operations
- Implemented test cases for error scenarios and edge cases
- Added validation tests for input data requirements
- Added security tests for password handling and permission checks
- Implemented database verification tests to ensure proper data persistence
- Added mock implementations for external dependencies
- Added comprehensive audit logs route tests
  - Implemented mock AuditLog model for testing
  - Added CSV, Excel and PDF export testing
  - Tested filtering functionality with various parameters
  - Added error condition handling tests
- Added comprehensive dashboard.js test coverage:
  - Implemented MongoDB memory server for dashboard route testing
  - Added mocking for Claim and Status models
  - Added tests for error handling and data validation
  - Added utility function unit tests
  - Added color calculation validation tests
- Improved test cleanup and connection management:
  - Enhanced MongoDB connection handling to prevent "already connected" errors
  - Added connection state checking before establishing new connections
  - Implemented proper resource cleanup in afterAll hooks
  - Added safeguards around stopping MongoDB memory server instances

## [1.4.41] - 2024-01-06 (Commit: 29aed0e)

### Added
- Added "Clear Filters" button to claims search page
- Added ability to clear individual multiple-select filters
- Added visual feedback for filter clearing options
- Added AJAX-based search functionality to prevent page refreshes
- Added client-side pagination without page reloads
- Added Rentworks CSV/Excel import functionality
- Added automatic status creation for imported claims
- Added Excel to CSV conversion for import process
- Added support for multiple date formats in imports
- Added detailed debug logging for import process
- Added status mapping for Rentworks statuses
- Added race condition handling for status creation
- Added notes system to claims with support for import summaries
- Added automatic conversion of Rentworks summaries to claim notes
- Added Rentworks user mapping for imported notes
- Added rentworksId field to User model
- Added migration for rentworksId field
- Added debug logging for recent claims in dashboard
- Added enhanced status handling with automatic color contrast calculation
- Added improved status badge styling in dashboard
- Added better null handling for claim display values
- Added detailed debug logging for dashboard data
- Added comprehensive PDF export format with table of contents
- Added section-based organization for PDF exports
- Added page numbers for photos in PDF exports
- Added "Not Provided" indicators for empty fields in PDF exports
- Added automatic page breaks between photo sections
- Added better file categorization in PDF exports
- Added consistent image sizing and spacing in PDF exports

### Changed
- Improved claims search UX with better filter management
- Updated pagination to use event delegation instead of inline handlers
- Made search interface more CSP compliant
- Moved claims search JavaScript to separate file for better organization
- Enhanced search form to maintain state during AJAX updates
- Enhanced file upload handling with better error management
- Improved import error handling and validation
- Updated status handling to support case-insensitive matching
- Enhanced file cleanup process for imported files
- Improved data mapping for Rentworks imports
- Enhanced Claim model with structured notes system
- Improved data mapping for Rentworks imports including summary notes
- Enhanced note creation to link with mapped Rentworks users
- Improved error handling for note creation
- Enhanced timestamp handling in claim updates to ensure accurate recent activity display
- Enhanced dashboard recent claims display with better visual hierarchy
- Improved status color handling with automatic text contrast
- Updated status query middleware to handle string values better
- Enhanced error logging with Pino logger integration
- Improved PDF export layout with better organization and readability
- Enhanced photo display in PDF exports with one photo per page
- Updated PDF margins and formatting for better presentation
- Improved file attachment handling in PDF exports
- Enhanced section headers with consistent formatting
- Improved boolean value display in PDFs (Yes/No instead of true/false)

### Fixed
- Fixed CSP violations in pagination controls
- Fixed issue with inability to clear damage type and status filters
- Fixed pagination refresh issues
- Fixed search form submission causing full page reload
- Fixed duplicate status creation issues during import
- Fixed Excel parsing issues for Rentworks format
- Fixed file cleanup in import process
- Fixed status mapping for non-standard statuses
- Fixed createdBy validation errors in note imports
- Fixed user mapping for Rentworks imported notes
- Fixed recent activity not showing updated claims in dashboard
- Fixed incorrect timestamp updates in claim modifications
- Fixed claim model timestamps configuration
- Fixed "Cast to ObjectId" errors in status queries
- Fixed status reference handling in Claim model
- Fixed empty status display in dashboard
- Fixed status color contrast issues in UI
- Fixed overlapping images in PDF exports
- Fixed missing page breaks between sections in PDF exports
- Fixed inconsistent formatting in PDF exports
- Fixed image sizing issues in PDF exports
- Fixed missing fields in PDF exports
- Fixed PDF generation for claims with multiple file types

### Security
- Removed inline JavaScript event handlers for better CSP compliance
- Improved client-side script organization
- Enhanced file upload validation
- Added sanitization for imported data
- Improved error handling to prevent data leaks
- Enhanced status validation to prevent injection attacks

### Technical
- Added support for Excel file formats (.xls, .xlsx)
- Added CSV parsing with headers detection
- Implemented case-insensitive status matching
- Added atomic operations for status creation
- Enhanced debug logging for import process
- Added file cleanup safeguards
- Improved error reporting for failed imports
- Added notes schema to Claim model with type categorization
- Added support for source tracking in imported notes
- Enhanced Mongoose schema configuration with strict mode and proper timestamps
- Improved claim update process to properly track modification times
- Added color contrast calculation utilities
- Enhanced status middleware for better query handling
- Improved Mongoose schema configuration
- Added better type checking for status values
- Enhanced PDFKit configuration for better document handling
- Improved PDF generation with async/await pattern
- Added helper functions for consistent PDF formatting

### Documentation
- Added technical documentation for claim number generation
- Updated API documentation for claim creation
- Added migration script documentation
- Added troubleshooting guides for claim number issues
- Added documentation for timestamp handling in claims
- Added documentation for status color handling
- Updated dashboard component documentation

### Dependencies
- No new dependencies added
- Utilizing existing MongoDB features for atomic operations

## [1.4.40] - 2025-1-06 (Commit: d33099f)

### Added
- Implemented sequential claim number generation system starting from 10000000
- Added ClaimSettings model to manage and track claim number sequences
- Added migration script for initializing and updating existing claim numbers
- Added verification system to ensure claim numbers are properly generated

### Changed
- Modified claim number generation from random to sequential
- Updated Claim model's pre-save middleware for more robust claim number generation
- Enhanced claim number validation with post-save verification
- Improved error handling for claim number generation
- Updated claim creation process to use new sequential numbering system

### Technical
- Added new ClaimSettings model with:
  - Atomic updates for claim number generation
  - Initialization and verification methods
  - Minimum value enforcement (10000000)
  - Timestamp tracking for updates
- Enhanced Claim model with:
  - Retry logic for claim number generation
  - Improved validation middleware
  - Better error handling and logging
  - Post-save verification hooks
- Added migration script features:
  - Environment configuration support
  - Batch processing for existing claims
  - Direct database updates to bypass middleware
  - Progress logging during migration
  - Validation of final counter state

### Fixed
- Fixed potential race conditions in claim number generation
- Fixed validation issues with claim number requirements
- Fixed middleware conflicts during claim updates
- Fixed initialization issues with claim number sequences

### Security
- Added immutability to claim numbers after creation
- Implemented atomic updates to prevent duplicate numbers
- Added validation to prevent claim number manipulation

### Documentation
- Added technical documentation for claim number generation
- Updated API documentation for claim creation
- Added migration script documentation
- Added troubleshooting guides for claim number issues

### Dependencies
- No new dependencies added
- Utilizing existing MongoDB features for atomic operations

### Migration
- Added initialize-claim-numbers.js migration script
- Added safety checks in migration process
- Added detailed logging for migration tracking
- Added rollback capability for failed migrations

## [1.4.39] - 2024-12-24 (Commit: 9162ff1)

### Added
- Added invoice total editing functionality in claim view
- Added admin fee auto-calculation based on invoice totals
- Added real-time invoice total updates without page refresh

### Changed
- Enhanced invoice display with better formatting and alignment
- Improved invoice total editing UI with edit/save button toggle
- Updated admin fee calculation to update automatically when invoice totals change
- Improved form tab structure in add claim view for better organization

### Fixed
- Fixed missing div closure in claim details tab causing subsequent tabs to be hidden
- Fixed invoice total display formatting to always show two decimal places
- Fixed admin fee element selection in JavaScript
- Fixed tab ID mismatch for Additional Coverage section
- Fixed claim ID reference in invoice total editing functionality

### Technical
- Added client-side JavaScript for handling invoice total updates
- Enhanced server-side route for updating invoice totals
- Added admin fee calculation helper function
- Improved error handling for invoice total updates

### UI/UX
- Added visual feedback for invoice total editing
- Improved alignment of invoice amounts
- Enhanced button styling for edit/save functionality
- Better organization of claim form tabs

## [1.4.38] - 2024-12-23 (Commit: pending)

### Changed
- Improved file viewer layout and functionality
- Enhanced handling of long filenames with proper text wrapping
- Updated PDF viewer container height for better visibility
- Improved file list display with better spacing and alignment

### Fixed
- Fixed PDF viewer height issue causing truncated display
- Fixed long filename overflow issues in file list and viewer
- Fixed file action button alignment issues
- Fixed file viewer header text wrapping

## [1.4.37] - 2024-12-20 (Commit: 7683344)

### Added
- Added new damage type management functionality
- Added location management system
- Implemented status management system
- N/a and Unknown options for billable, RLI, LDW, and isRenterAtFault fields

### Changed
- Updated claim form layout with improved tab organization
- Enhanced file upload handling with better error management
- Improved error message display system
- Updated styling for form elements and tabs
- Enhanced validation for claim updates
- Improved notification system with more detailed messages

### Fixed
- File upload directory creation issues
- Form validation error handling
- Status update notification bugs
- File path sanitization issues
- Invoice total calculation errors

### Security
- Enhanced file upload security with improved validation
- Added sanitization for file paths and names
- Improved role-based access control checks
- Enhanced input validation for claim updates

### Technical
- Updated Node.js dependencies
- Updated JSDoc documentation generation
- Extended error logging
- Enhanced MongoDB integration

### Documentation
- Extended API documentation
- Updated installation guide
- Updated help documentation for users
- Added audit logging documentation


### Dependencies
- Updated dependencies to latest versions

### Testing
- No changes of note


## [1.4.32] - 2024-03-21 (Commit: cd8dc1d)

### Added
- Implemented tabbed navigation system for claim forms
- Added new file upload validation and sanitization
- Integrated email notification system for claims updates
- Added support for invoice total tracking
- Implemented version history for claims
- Added new damage type management functionality
- Added location management system
- Implemented status management system

### Changed
- Updated claim form layout with improved tab organization
- Enhanced file upload handling with better error management
- Improved error message display system
- Updated styling for form elements and tabs
- Enhanced validation for claim updates
- Improved notification system with more detailed messages

### Fixed
- File upload directory creation issues
- Form validation error handling
- Status update notification bugs
- File path sanitization issues
- Invoice total calculation errors

### Security
- Enhanced file upload security with improved validation
- Added sanitization for file paths and names
- Improved role-based access control checks
- Enhanced input validation for claim updates

### Technical
- Updated Node.js dependencies
- Added JSDoc documentation generation
- Implemented GitHub Actions workflow for automated documentation
- Added comprehensive error logging
- Enhanced MongoDB integration
- Improved Redis caching implementation

### Documentation
- Added detailed API documentation
- Updated installation guide
- Added help documentation for users
- Enhanced email template documentation
- Added audit logging documentation

### Dependencies
- Updated to Node.js 22.3.0
- Updated various npm packages to latest versions
- Added new dependencies for enhanced functionality:
  - archiver: ^7.0.1
  - cache-manager: ^5.1.0
  - pino: ^9.2.0
  - redis: ^4.7.0

### Testing
- Added new test configurations
- Implemented Cypress test framework
- Added Jest test coverage reporting