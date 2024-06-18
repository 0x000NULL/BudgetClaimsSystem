# Budget Claims System Installation Guide

This guide provides detailed instructions for installing the Budget Claims System on various operating systems: Ubuntu, Debian, macOS, Arch Linux, Red Hat OS, and Windows. It covers the installation of Node.js, npm, MongoDB, and Redis, as well as setting up the project.

## Prerequisites

Before you begin, ensure you have the following:
- Administrative access to your server or local machine.
- Basic knowledge of the command line interface.

## Step 1: Install Node.js and npm

### Ubuntu/Debian

1. **Update the package index:**

   ```sh
   sudo apt update
   ```
    Install Node.js and npm:

    ```sh

sudo apt install nodejs npm -y
```
Verify the installation:

```sh

    node -v
    npm -v
```
macOS

    Install Homebrew (if not already installed):

    ```sh

/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```
Install Node.js and npm using Homebrew:

```sh

brew install node
```
Verify the installation:

```sh

    node -v
    npm -v
```
Arch Linux

    Update the package database:

    ```sh

sudo pacman -Syu
```
Install Node.js and npm:

```sh

sudo pacman -S nodejs npm
```
Verify the installation:

```sh

    node -v
    npm -v
```
Red Hat OS

    Enable EPEL repository:

    ```sh

sudo yum install epel-release
```
Install Node.js and npm:

```sh

sudo yum install nodejs npm -y
```
Verify the installation:

```sh

    node -v
    npm -v
```
Windows

    Download the Node.js installer:

    Visit the Node.js download page and download the Windows installer.

    Run the installer:

    Run the downloaded installer and follow the setup wizard. Ensure that the "npm package manager" option is selected.

    Verify the installation:

    Open a command prompt and run:

    ```sh

    node -v
    npm -v
```
Step 2: Install MongoDB
Ubuntu/Debian

    Import the MongoDB public key:

    ```sh

wget -qO - https://www.mongodb.org/static/pgp/server-4.4.asc | sudo apt-key add -
```
Create a list file for MongoDB:

```sh

echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/4.4 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-4.4.list
```
Reload the local package database:

```sh

sudo apt update
```
Install MongoDB packages:

```sh

sudo apt install -y mongodb-org
```
Start MongoDB:

```sh

sudo systemctl start mongod
```
Verify that MongoDB has started:

```sh

    sudo systemctl status mongod
```
macOS

    Install MongoDB using Homebrew:

    ```sh

brew tap mongodb/brew
brew install mongodb-community@4.4
```
Start MongoDB:

```sh

brew services start mongodb/brew/mongodb-community
```
Verify that MongoDB has started:

```sh

    brew services list
```
Arch Linux

    Install MongoDB:

    ```sh

sudo pacman -S mongodb
```
Start MongoDB:

```sh

sudo systemctl start mongodb
```
Enable MongoDB to start on boot:

```sh

    sudo systemctl enable mongodb
```
Red Hat OS

    Create a repository file for MongoDB:

    ```sh

sudo tee /etc/yum.repos.d/mongodb-org-4.4.repo <<EOF
[mongodb-org-4.4]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/redhat/\$releasever/mongodb-org/4.4/x86_64/
gpgcheck=1
enabled=1
gpgkey=https://www.mongodb.org/static/pgp/server-4.4.asc
EOF
```
Install MongoDB packages:

```sh

sudo yum install -y mongodb-org
```
Start MongoDB:

```sh

sudo systemctl start mongod
```
Verify that MongoDB has started:

```sh

    sudo systemctl status mongod
```
Windows

    Download the MongoDB installer:

    Visit the MongoDB download page and download the installer.

    Run the installer:

    Run the installer and follow the setup wizard.

    Start MongoDB:

    Follow the instructions provided by the installer to start MongoDB as a service.

## Step 3: Install Redis
### Ubuntu/Debian

    Install Redis:

    ```sh

sudo apt install redis-server
```
Verify Redis installation:

```sh

redis-server --version
```
Enable Redis to start on boot:

```sh

    sudo systemctl enable redis-server
```
### macOS

    Install Redis using Homebrew:

    ```sh

brew install redis
```
Start Redis:

```sh

brew services start redis
```
Verify that Redis has started:

```sh

    brew services list
```
### Arch Linux

    Install Redis:

    ```sh

sudo pacman -S redis
```
Start Redis:

```sh

sudo systemctl start redis
```
Enable Redis to start on boot:

```sh

    sudo systemctl enable redis
```
### Red Hat OS

    Enable the EPEL repository:

    ```sh

sudo yum install epel-release
```
Install Redis:

```sh

sudo yum install redis
```
Start Redis:

```sh

sudo systemctl start redis
```
Enable Redis to start on boot:

```sh

    sudo systemctl enable redis
```
## Windows

    Download the Redis MSI installer:

    Visit the Redis download page and download the Redis MSI installer.

    Run the Redis server:

    Run the Redis server by executing redis-server.exe.

### Step 4: Clone the Budget Claims System Repository

```sh

git clone <repository_url>
```
### Step 5: Install Project Dependencies

Navigate to the project directory and run:

```sh

npm install
```
### Step 6: Set Up Environment Variables

Create a .env file in the root of the project and add the required environment variables.

Example .env file:

```makefile

MONGODB_URI=mongodb://localhost:27017/budget-claims-system
SESSION_SECRET=your_session_secret
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
EMAIL_USER=your_email@example.com
EMAIL_PASS=your_email_password
```
### Step 7: Start the Application

```sh

npm start
```
Your application should now be running on http://localhost:5000.
# Usage
Running the Application in Development Mode

To start the application in development mode with hot-reloading using Nodemon:

```sh

npm run dev
```
Running the Application in Production Mode

To start the application in production mode using PM2:

```sh

pm2 start server.js
```
Additional Configuration
Configuring PM2 for Production

    Install PM2 globally:

    ```sh

npm install pm2@latest -g
```
Start the application with PM2:

```sh

pm2 start server.js
```
Save the PM2 process list:

```sh

pm2 save
```
Set PM2 to start on boot:

```sh

    pm2 startup
```
Setting Up Reverse Proxy with Nginx

    Install Nginx:

    ```sh

sudo apt install nginx
```
Configure Nginx:

Create a configuration file for your application:

```sh

sudo nano /etc/nginx/sites-available/budget-claims-system
```
Add the following content:

```nginx

server {
    listen 80;
    server_name your_domain_or_IP;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```
Enable the configuration:

```sh

sudo ln -s /etc/nginx/sites-available/budget-claims-system /etc/nginx/sites-enabled/
```
Test the Nginx configuration:

```sh

sudo nginx -t
```
Restart Nginx:

```sh

    sudo systemctl restart nginx
```
License

This project is licensed under the UNLICENSE.