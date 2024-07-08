# Budget Claims System

The Budget Claims System is a web application designed to manage vehicle claims for Budget Las Vegas. It allows the claims department to add, edit, search, and remove claims, email customers, export claims in various formats, generate reports, and much more.

## Features

- **Add Claims**: Allows users to add new claims with details like MVA, customer name, description, status, and files.
- **Edit Claims**: Users can edit existing claims.
- **Search Claims**: Search for claims through various filters and keywords.
- **Remove Claims**: Delete claims from the system.
- **Email Customers**: Send email notifications to customers.
- **Export Claims**: Export claims in CSV, Excel, and PDF formats.
- **Generate Reports**: Generate reports in PDF, CSV, or Excel formats.
- **Authentication**: Secure login for users.
- **Role-Based Access Control (RBAC)**: Different levels of access for users (admin, manager, employee).
- **File Support**: Upload and manage files related to claims.
- **Activity Logging**: Track user activities such as logins, claim creations, edits, and deletions.
- **Notifications System**: Send notifications for various events.
- **Advanced Search and Filtering**: Enhanced search functionality with more filters.
- **Dashboard Analytics**: Key metrics and analytics on a dashboard.
- **File Versioning**: Track changes made to uploaded files.
- **Bulk Operations**: Perform bulk operations like updating the status of multiple claims.
- **Two-Factor Authentication (2FA)**: Enhanced security with 2FA for user logins.
- **Mobile-Friendly Design**: Responsive and mobile-friendly application.
- **Customizable Reports**: Create and customize reports with specific data fields and filters.
- **API Access**: Provide API endpoints for key functionalities.
- **Data Import/Export**: Import data from external sources and export data to various formats.
- **User Feedback System**: Report issues, suggest features, and provide feedback.
- **Caching**: Implement caching strategies using Redis for frequently accessed data.

## Usage

### Running the Application in Development Mode

To start the application in development mode with hot-reloading using Nodemon:

```sh
npm run dev
```

Running the Application in Production Mode

To start the application in production mode using PM2:

```sh

pm2 start server.js
```
API Documentation

The application provides several API endpoints for managing claims, customers, and users. For detailed API documentation, please refer to the routes/api.js file.
Contributing

We welcome contributions to improve the Budget Claims System. Please follow these steps to contribute:

    Fork the repository.
    Create a new branch for your feature or bugfix.
    Commit your changes with clear commit messages.
    Push your changes to your fork.
    Submit a pull request to the main repository.

License

All rights reserved; Ethan Aldrich.
