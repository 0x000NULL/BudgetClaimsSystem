# Changelog

## Customer Authentication Implementation - 2024-01-22 13:00 UTC (v1.4.9)

### Added Customer Authentication System
#### Customer Model and Routes
- Created Customer model with comprehensive user data schema
- Implemented secure password hashing with bcryptjs
- Added customer-specific authentication routes
- Implemented registration with validation
- Added customer dashboard with claims overview
- Created separate authentication strategy for customers

#### Security Enhancements
- Implemented customer-specific middleware protection
- Added proper session handling for customers
- Created separate Passport.js strategy for customer login
- Added input validation and sanitization
- Implemented proper error handling and logging

### Template Implementation
#### Customer Views
- Created customer registration form with validation
- Implemented customer login interface
- Added customer dashboard with statistics
- Created claims overview section
- Implemented quick actions menu
- Added toast notifications system

### Technical Improvements
- **Authentication**: Separate customer authentication flow
- **Security**: Customer-specific session handling
- **Data Model**: Comprehensive customer schema with validation
- **UX**: Intuitive registration and dashboard interface
- **Error Handling**: Proper validation and error messages
- **Logging**: Added detailed logging for customer actions

### Frontend Enhancements
#### Dashboard Interface
- Added claims statistics display
- Implemented recent claims list
- Created quick action cards
- Added responsive layout design
- Implemented toast notification system

#### JavaScript Organization
- Separated dashboard JavaScript into standalone file
- Implemented proper event handling
- Added toast notification management
- Enhanced code maintainability

### Breaking Changes
- Changed authentication middleware structure
- Modified Passport.js configuration
- Updated session handling for multiple user types
- Added new database schema for customers

### Notes
- Customer authentication is separate from employee system
- Registration requires terms acceptance
- Password requirements include special characters
- Dashboard shows real-time claims data
- Session handling supports both user types

### Future Considerations
- Add email verification for new registrations
- Implement password reset functionality
- Add two-factor authentication option
- Enhance claims management interface
- Add customer profile management

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