# Budget Claims System

## Overview

The Budget Claims System is a web application designed for the claims department of Budget Las Vegas to manage vehicle claims. It allows users to add, edit, search, and remove claims. The system also supports user authentication, file uploads, notifications, activity logging, and advanced search and filtering.

## Features

- **Add Claims**: Create new claims with details such as MVA, customer name, description, status, and file attachments.
- **Edit Claims**: Modify existing claims.
- **Search and Filter Claims**: Search for claims using various filters like date ranges, claim status, and customer information.
- **Remove Claims**: Delete claims from the system.
- **Email Notifications**: Notify users of events like new claims and status updates.
- **Export Claims**: Export claims in CSV, Excel, and PDF formats.
- **Generate Reports**: Generate reports in CSV, Excel, or PDF formats.
- **User Management**: Create, delete, and manage user permissions.
- **Activity Logging**: Track user activities such as logins, claim creations, edits, and deletions.
- **Two-Factor Authentication (2FA)**: Enhance security for user logins.
- **Mobile-Friendly Design**: Access and manage claims on-the-go.
- **Customizable Reports**: Create and customize reports with specific data fields and filters.
- **API Access**: Provide API endpoints for key functionalities.
- **Data Import/Export**: Import data from external sources and export data to various formats.
- **User Feedback System**: Report issues, suggest features, and provide general feedback.

## Installation

### Prerequisites

Ensure you have the following installed:

- Node.js
- npm
- MongoDB

### Steps

1. **Clone the repository**:
    ```bash
    git clone https://github.com/yourusername/BudgetClaimsSystem.git
    cd BudgetClaimsSystem
    ```

2. **Install dependencies**:
    ```bash
    npm install
    ```

3. **Set up environment variables**:
    - Create a `.env` file in the root directory and add the following:
    ```env
    PORT=5000
    MONGODB_URI=mongodb://localhost:27017/BudgetClaimsSystem
    SESSION_SECRET=your_secret_key
    JWT_SECRET=your_jwt_secret
    EMAIL_USER=your_email@gmail.com
    EMAIL_PASS=your_email_password
    ```

4. **Start the server**:
    ```bash
    npm start
    ```

5. **Access the application**:
    - Open your browser and go to `http://localhost:5000`.

### PM2 Setup (Optional)

To run the application using PM2, install PM2 and use the following commands:

1. **Install PM2**:
    ```bash
    npm install pm2 -g
    ```

2. **Start the application with PM2**:
    ```bash
    pm2 start server.js --name BudgetClaimsSystem
    ```

3. **Other PM2 commands**:
    - **View running processes**:
        ```bash
        pm2 list
        ```
    - **Stop the application**:
        ```bash
        pm2 stop BudgetClaimsSystem
        ```
    - **Restart the application**:
        ```bash
        pm2 restart BudgetClaimsSystem
        ```
    - **View logs**:
        ```bash
        pm2 logs BudgetClaimsSystem
        ```
    - **Delete the application from PM2**:
        ```bash
        pm2 delete BudgetClaimsSystem
        ```

## Directory Structure

```bash

BudgetClaimsSystem/
├── config/
│ └── nodemailer.js # Nodemailer configuration for sending emails
├── middleware/
│ └── activityLogger.js # Middleware for logging user activities
├── models/
│ ├── ActivityLog.js # Mongoose schema and model for activity logs
│ └── Claim.js # Mongoose schema and model for claims
├── notifications/
│ ├── notify.js # Functions for sending notifications
│ └── reminderScheduler.js # Scheduler for sending reminder notifications
├── routes/
│ ├── claims.js # Routes for managing claims
│ └── users.js # Routes for user management
├── views/
│ ├── claims_search.ejs # View for searching and filtering claims
│ └── ... # Other EJS views
├── public/
│ ├── css/
│ └── images/
├── server.js # Main server file
├── package.json # Project metadata and dependencies
└── README.md # Project documentation
```

## Contributing

Contributions are welcome! Please fork the repository and create a pull request with your changes. Ensure your code follows the project's coding standards and includes relevant tests.

## License

This project is licensed under the UNLicense. See the `LICENSE` file for more details.

## Contact

For any inquiries, please contact the project maintainers at [your_email@gmail.com].
