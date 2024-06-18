# Budget Claims System Installation Guide

This guide provides detailed instructions for installing Node.js, npm, MongoDB, and the Budget Claims System on Ubuntu, Debian, and Windows.

## Prerequisites

Before you begin, ensure you have the following:

- Internet connection
- Administrative privileges on your machine

---

## Table of Contents

1. [Install Node.js and npm](#install-nodejs-and-npm)
   - [Ubuntu](#ubuntu)
   - [Debian](#debian)
   - [Windows](#windows)
2. [Install MongoDB](#install-mongodb)
   - [Ubuntu](#ubuntu-1)
   - [Debian](#debian-1)
   - [Windows](#windows-1)
3. [Set Up the Budget Claims System](#set-up-the-budget-claims-system)

---

## Install Node.js and npm

### Ubuntu

1. **Update your package index:**
    ```bash
    sudo apt update
    ```

2. **Install Node.js and npm from NodeSource:**
    ```bash
    curl -sL https://deb.nodesource.com/setup_14.x | sudo -E bash -
    sudo apt install -y nodejs
    ```

3. **Verify the installation:**
    ```bash
    node -v
    npm -v
    ```

### Debian

1. **Update your package index:**
    ```bash
    sudo apt update
    ```

2. **Install build-essential (required for some npm packages):**
    ```bash
    sudo apt install -y build-essential
    ```

3. **Install Node.js and npm from NodeSource:**
    ```bash
    curl -sL https://deb.nodesource.com/setup_14.x | sudo -E bash -
    sudo apt install -y nodejs
    ```

4. **Verify the installation:**
    ```bash
    node -v
    npm -v
    ```

### Windows

1. **Download Node.js and npm:**
    - Visit the [Node.js website](https://nodejs.org/) and download the LTS version.

2. **Run the installer:**
    - Follow the prompts in the Node.js Setup Wizard. Accept the license agreement and click "Next" until you reach the "Install" button.

3. **Verify the installation:**
    - Open Command Prompt or PowerShell and run:
        ```bash
        node -v
        npm -v
        ```

---

## Install MongoDB

### Ubuntu

1. **Import the public key used by the package management system:**
    ```bash
    wget -qO - https://www.mongodb.org/static/pgp/server-4.4.asc | sudo apt-key add -
    ```

2. **Create a list file for MongoDB:**
    ```bash
    echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/4.4 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-4.4.list
    ```

3. **Reload the local package database:**
    ```bash
    sudo apt update
    ```

4. **Install the MongoDB packages:**
    ```bash
    sudo apt install -y mongodb-org
    ```

5. **Start MongoDB:**
    ```bash
    sudo systemctl start mongod
    ```

6. **Enable MongoDB to start on boot:**
    ```bash
    sudo systemctl enable mongod
    ```

7. **Verify the installation:**
    ```bash
    sudo systemctl status mongod
    ```

### Debian

1. **Import the public key used by the package management system:**
    ```bash
    wget -qO - https://www.mongodb.org/static/pgp/server-4.4.asc | sudo apt-key add -
    ```

2. **Create a list file for MongoDB:**
    ```bash
    echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/debian buster/mongodb-org/4.4 main" | sudo tee /etc/apt/sources.list.d/mongodb-org-4.4.list
    ```

3. **Reload the local package database:**
    ```bash
    sudo apt update
    ```

4. **Install the MongoDB packages:**
    ```bash
    sudo apt install -y mongodb-org
    ```

5. **Start MongoDB:**
    ```bash
    sudo systemctl start mongod
    ```

6. **Enable MongoDB to start on boot:**
    ```bash
    sudo systemctl enable mongod
    ```

7. **Verify the installation:**
    ```bash
    sudo systemctl status mongod
    ```

### Windows

1. **Download MongoDB:**
    - Visit the [MongoDB Download Center](https://www.mongodb.com/try/download/community) and download the MongoDB installer for Windows.

2. **Run the installer:**
    - Follow the prompts in the MongoDB Setup Wizard. Accept the license agreement, and choose the Complete setup type. Ensure "Install MongoDB as a Service" is checked.

3. **Verify the installation:**
    - Open Command Prompt or PowerShell and run:
        ```bash
        mongo --version
        ```

---

## Set Up the Budget Claims System

1. **Clone the repository:**
    ```bash
    git clone https://github.com/yourusername/BudgetClaimsSystem.git
    cd BudgetClaimsSystem
    ```

2. **Install dependencies:**
    ```bash
    npm install
    ```

3. **Set up environment variables:**
    - Create a `.env` file in the root directory and add the following:
    ```env
    PORT=5000
    MONGODB_URI=mongodb://localhost:27017/BudgetClaimsSystem
    SESSION_SECRET=your_secret_key
    JWT_SECRET=your_jwt_secret
    EMAIL_USER=your_email@gmail.com
    EMAIL_PASS=your_email_password
    ```

4. **Start the server:**
    ```bash
    npm start
    ```

5. **Access the application:**
    - Open your browser and go to `http://localhost:5000`.

### Additional PM2 Commands

- **Install PM2** (if not already installed):
    ```bash
    npm install pm2 -g
    ```

- **Start the application with PM2**:
    ```bash
    pm2 start server.js --name BudgetClaimsSystem
    ```

- **View running processes:**
    ```bash
    pm2 list
    ```

- **Stop the application:**
    ```bash
    pm2 stop BudgetClaimsSystem
    ```

- **Restart the application:**
    ```bash
    pm2 restart BudgetClaimsSystem
    ```

- **View logs:**
    ```bash
    pm2 logs BudgetClaimsSystem
    ```

- **Delete the application from PM2:**
    ```bash
    pm2 delete BudgetClaimsSystem
    ```

## Troubleshooting

### Common Issues

- **Node.js and npm installation errors:**
    - Ensure that your system is updated and the correct Node.js version is installed.

- **MongoDB service not starting:**
    - Check the status of the MongoDB service and review logs for errors:
      ```bash
      sudo systemctl status mongod
      sudo journalctl -u mongod
      ```

- **Environment variables not set correctly:**
    - Ensure the `.env` file is in the root directory of your project and contains all necessary variables.

For further assistance, please refer to the official documentation of Node.js, npm, and MongoDB, or contact the project maintainers.

---

This installation guide should help you set up the Budget Claims System on Ubuntu, Debian, and Windows with detailed steps and troubleshooting tips. If you encounter any issues, feel free to seek help from the community or the project maintainers.
