# Budget Claims System

## Overview

The Budget Claims System is a comprehensive application designed for the claims department of Budget Las Vegas to manage vehicle claims. This system allows the claims department to add, edit, search, and remove claims, as well as manage user permissions, send emails, and generate reports in various formats.

## Features

- **User Authentication**: Secure login and registration using Passport.js.
- **Claims Management**: Add, edit, view, and delete vehicle claims.
- **Search Functionality**: Search for claims using various filters and keywords.
- **File Support**: Upload and manage files related to claims.
- **Email Notifications**: Send emails to customers directly from the system.
- **Export and Reporting**: Export claims and generate reports in CSV, Excel, and PDF formats.
- **User Management**: Create, delete, and modify user permissions.

## Technologies Used

- **Node.js**: Server-side JavaScript runtime.
- **Express.js**: Web application framework for Node.js.
- **MongoDB**: NoSQL database for storing claims and user information.
- **Mongoose**: ODM for MongoDB.
- **Passport.js**: Authentication middleware for Node.js.
- **EJS**: Embedded JavaScript templating.
- **Nodemailer**: Module to send emails.
- **Multer**: Middleware for handling file uploads.
- **PDFKit**: Library to create PDF documents.
- **xlsx**: Library to create Excel files.
- **Bootstrap**: CSS framework for styling (optional).
- **PM2**: Process manager for Node.js applications.

## Installation

### Prerequisites

- Node.js (v14.x or later)
- npm (v6.x or later)
- MongoDB (v4.x or later)

### Steps

1. **Clone the repository**
    ```bash
    git clone https://github.com/yourusername/BudgetClaimsSystem.git
    cd BudgetClaimsSystem
    ```

2. **Install dependencies**
    ```bash
    npm install
    ```

3. **Set up environment variables**
    Create a `.env` file in the root directory and add the following:
    ```env
    PORT=5000
    MONGODB_URI=mongodb://localhost:27017/BudgetClaimsSystem
    SESSION_SECRET=your_secret_key
    JWT_SECRET=your_jwt_secret
    EMAIL_USER=your_email@gmail.com
    EMAIL_PASS=your_email_password
    ```

4. **Start MongoDB**
    Ensure MongoDB is running. You can start it using the following command if installed locally:
    ```bash
    mongod
    ```

5. **Start the server using PM2**
    ```bash
    npm start
    ```

6. **Access the application**
    Open your browser and go to `http://localhost:5000`.

## Managing the Application with PM2

- **View running processes**:
  ```bash
  pm2 list
  ```
Stop the application:

```bash
pm2 stop BudgetClaimsSystem
```

Restart the application:

```bash

pm2 restart BudgetClaimsSystem
```

View logs:

```bash

pm2 logs BudgetClaimsSystem
```

Delete the application from PM2:

```bash

    pm2 delete BudgetClaimsSystem
```

Project Structure

```bash

BudgetClaimsSystem/
├── config/
│   └── passport.js           # Passport.js configuration
├── models/
│   ├── Claim.js              # Mongoose schema for claims
│   └── User.js               # Mongoose schema for users
├── public/
│   ├── css/
│   │   └── styles.css        # CSS file for styling
│   ├── images/
│   │   └── Budget_logo.svg   # Budget logo image
│   └── js/
│       └── scripts.js        # JavaScript file for client-side scripts
├── routes/
│   ├── claims.js             # Routes for claims management
│   ├── email.js              # Routes for email functionality
│   └── users.js              # Routes for user management and authentication
├── views/
│   ├── index.ejs             # Landing page view
│   ├── login.ejs             # Login page view
│   ├── dashboard.ejs         # Dashboard view for logged-in users
│   ├── claims_search.ejs     # Claims search page view
│   ├── claim_view_edit.ejs   # View and edit claim page view
│   ├── logout.ejs            # Logout page view
│   ├── help.ejs              # Help page view
│   ├── user_management.ejs   # User management page view
│   └── reports.ejs           # Reports generation page view
├── uploads/                  # Directory for uploaded files
├── server.js                 # Main server file
├── package.json              # Project metadata and dependencies
└── .env                      # Environment variables (not included in the repository)
```


## Detailed Documentation
### Authentication

    Login: Users can log in using their email and password. The login form is found on the /login page.
    Registration: New users can register on the system. Ensure proper validation is in place to check for existing emails.
    Sessions: User sessions are managed using express-session and stored in MongoDB via connect-mongo.

### Claims Management

    Add Claim: Navigate to the /claims/search page and click the "Add Claim" button. Fill out the form and submit.
    Edit Claim: Search for the claim you want to edit, click on it to view details, make changes, and save.
    Search Claims: Use the search form on the /claims/search page to filter claims by MVA, customer name, etc.
    Delete Claim: From the claim detail view, you can delete a claim if necessary.

### File Support

    Upload Files: During claim creation or editing, you can upload relevant files. These are stored in the uploads directory.
    Manage Files: Uploaded files can be accessed and managed from the claim detail view.

### Email Functionality

    Send Emails: Use the email functionality to send notifications to customers. Configure your email settings in the .env file.

### Export and Reporting

    Export Claims: Export claims to CSV, Excel, or PDF formats from the /claims/search page.
    Generate Reports: Generate detailed reports from the /reports page. Select the desired format and generate the report.

### User Management

    Create User: Admins can create new users from the /users page.
    Delete User: Admins can delete users by entering their User ID.
    Modify Permissions: Admins can update user permissions from the user management interface.

## Help and Support

For detailed instructions and support, visit the /help page. Here you will find step-by-step guides for all major features and contact information for support.
Contributing

Contributions are welcome! Please fork the repository and create a pull request with your changes. Ensure your code follows the project's coding standards and includes relevant tests.
License

This project is licensed under the UNLicense. See the LICENSE file for more details.