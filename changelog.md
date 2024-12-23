# Changelog

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
