# Changelog

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
