# Budget Claims System Installation Guide

This guide provides detailed instructions for installing the Budget Claims System across different operating systems.

## Prerequisites

- Administrative/sudo access
- Git
- Command line familiarity
- Minimum system requirements:
  - 4GB RAM
  - 2 CPU cores
  - 20GB storage

## Quick Install (Ubuntu/Debian)

```sh
# Update system
sudo apt update && sudo apt upgrade -y

# Install core dependencies
sudo apt install nodejs npm mongodb redis-server -y

# Clone and setup project
git clone https://github.com/your-org/budget-claims-system.git
cd budget-claims-system
npm install
cp .env.example .env

# Start services
sudo systemctl start mongodb redis
npm start
```

## Detailed Installation Steps

### 1. Node.js and npm

<details>
<summary>Ubuntu/Debian</summary>

```sh
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
```
</details>

<details>
<summary>macOS</summary>

```sh
brew install node
```
</details>

<details>
<summary>Windows</summary>

1. Download Node.js LTS from [nodejs.org](https://nodejs.org)
2. Run installer with default options
3. Verify installation:
```sh
node --version
npm --version
```
</details>

### 2. MongoDB

<details>
<summary>Ubuntu/Debian</summary>

```sh
# Import MongoDB public key
curl -fsSL https://pgp.mongodb.com/server-6.0.asc | \
   sudo gpg -o /usr/share/keyrings/mongodb-server-6.0.gpg \
   --dearmor

# Add MongoDB repository
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-6.0.gpg ] \
   https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/6.0 multiverse" | \
   sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list

# Install MongoDB
sudo apt update
sudo apt install -y mongodb-org

# Start MongoDB
sudo systemctl enable mongod
sudo systemctl start mongod
```
</details>

<details>
<summary>macOS</summary>

```sh
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```
</details>

### 3. Redis

<details>
<summary>Ubuntu/Debian</summary>

```sh
sudo apt install redis-server
sudo systemctl enable redis-server
sudo systemctl start redis-server
```
</details>

<details>
<summary>macOS</summary>

```sh
brew install redis
brew services start redis
```
</details>

## Project Setup

1. Clone the repository:
```sh
git clone https://github.com/your-org/budget-claims-system.git
cd budget-claims-system
```

2. Install dependencies:
```sh
npm install
```

3. Configure environment:
```sh
cp .env.example .env
```

4. Update `.env` with your settings:
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/budget-claims
REDIS_HOST=localhost
REDIS_PORT=6379
SESSION_SECRET=your-secure-session-secret
```

5. Initialize database:
```sh
npm run db:init
```

## Running the Application

### Development Mode
```sh
npm run dev
```

### Production Mode
```sh
# Install PM2 globally
sudo npm install -g pm2

# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 process list
pm2 save

# Setup PM2 startup script
pm2 startup
```

## Production Deployment

### Nginx Configuration

1. Install Nginx:
```sh
sudo apt install nginx
```

2. Create configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;

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

3. Enable and start Nginx:
```sh
sudo ln -s /etc/nginx/sites-available/budget-claims /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Security Recommendations

1. Enable UFW firewall:
```sh
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https
sudo ufw enable
```

2. Configure MongoDB security:
```sh
# Edit MongoDB configuration
sudo nano /etc/mongod.conf

# Add security section
security:
  authorization: enabled
```

3. Secure Redis:
```sh
# Edit Redis configuration
sudo nano /etc/redis/redis.conf

# Set password and disable remote connections
requirepass your-strong-password
bind 127.0.0.1
```

## Troubleshooting

- **MongoDB won't start**: Check logs with `sudo journalctl -u mongod`
- **Redis connection issues**: Verify Redis is running with `redis-cli ping`
- **Node.js errors**: Check for correct Node version with `node -v`

## License

Copyright © 2024 BudgetClaimsSystem, Ethan Aldrich. All Rights Reserved.