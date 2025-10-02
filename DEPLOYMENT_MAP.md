# Deployment Map - CrowdPunk Discord Bot

## Current Status: ✅ Environment Variables Configured, ⚠️ Dependencies Installation Required

### Latest Update (2025-01-02)
- ✅ Correct environment variables copied from local `.env` file to server
- ✅ PM2 processes started but failed due to missing Python dependencies
- ⚠️ Python dependencies need to be properly installed in virtual environment
- ⚠️ Virtual environment activation needs verification

### Environment Variables Status
**Location**: `/home/ubuntu/CROWDP-Interchain-Token-Gate/discord-bot/.env`

**🔒 SECURITY NOTICE**: All sensitive environment variables are stored securely in the `.env` file on the server.

**Required Environment Variables:**
- `DISCORD_BOT_TOKEN` - Discord bot authentication token (SENSITIVE)
- `WEB_APP_URL` - Web application URL for callbacks
- `MONGODB_URI` - MongoDB connection string with authentication (SENSITIVE)
- `COSMOS_CHAIN_ID` - Cosmos blockchain network identifier
- `COSMOS_RPC_URL` - Cosmos RPC endpoint URL
- `DISCORD_GUILD_ID` - Discord server ID for bot operations (SENSITIVE)
- `DISCORD_BOT_API_KEY` - API key for bot authentication (SENSITIVE)
- `JWT_SECRET` - Secret key for JWT token signing (SENSITIVE)
- `REDIS_URL` - Redis connection string for rate limiting (SENSITIVE)
- `ENCRYPTION_KEY` - AES-256 encryption key for data protection (SENSITIVE)

**⚠️ CRITICAL SECURITY REQUIREMENTS**:
1. **NEVER** commit sensitive values to version control
2. All sensitive values must be stored only in server `.env` files
3. Use strong, randomly generated keys for all secrets
4. Rotate keys regularly and after any potential compromise
5. Ensure `.env` files have restricted permissions (600)
6. Use environment-specific configurations for development/production

### PM2 Process Status
**Current Status**: Stopped (due to missing dependencies)
- `crowdp-discord-bot`: ❌ ModuleNotFoundError: No module named 'discord'
- `crowdp-role-server`: ❌ ModuleNotFoundError: No module named 'discord'  
- `crowdp-web-server`: ❌ ModuleNotFoundError: No module named 'fastapi'

### Next Steps Required
1. **Fix Virtual Environment**: Ensure venv is properly activated
2. **Install Dependencies**: `pip install -r requirements.txt` in activated venv
3. **Restart PM2 Processes**: `pm2 restart all`
4. **Verify Bot Functionality**: Check logs and test Discord bot

## AWS EC2 Server Details
- **Instance ID**: i-05c6852a47283d0a6
- **Instance Type**: t2.micro
- **Public IP**: 34.216.37.53
- **Private IP**: 172.31.44.113
- **Public DNS**: ec2-34-216-37-53.us-west-2.compute.amazonaws.com
- **Instance State**: Running ✅
- **VPC ID**: vpc-0f8d931005fcd013d
- **Subnet ID**: subnet-04597f53ecaa4382b
- **Region**: us-west-2
- **SSH Key**: CrowdpunkServer.pem
- **OS**: Ubuntu 24.04.3 LTS
- **User**: ubuntu

## File Structure Mapping

### Local Machine (C:\Users\piyus\OneDrive\Desktop\Verifier)
```
├── .gitignore
├── Cosmos-Kit Token Holder Research.txt
├── CrowdpunkServer.pem (SSH Key)
├── DEPLOYMENT_MAP.md (This file)
├── discord-bot/
│   ├── README.md
│   ├── balance_monitor.py
│   ├── bot.py
│   ├── database.py
│   ├── requirements.txt
│   ├── role_assignment_server.py
│   ├── role_commands.py
│   ├── web_server.py
│   └── .env (Contains Discord tokens and API keys)
└── web-app/
    ├── [Full Next.js application structure]
    └── .env.local (Contains environment variables)
```

### Cloud Server (/home/ubuntu/CROWDP-Interchain-Token-Gate/)
```
├── discord-bot/                 # Discord bot deployment (from GitHub repo)
│   ├── balance_monitor.py
│   ├── bot.py
│   ├── database.py
│   ├── requirements.txt
│   ├── role_assignment_server.py
│   ├── role_commands.py
│   ├── web_server.py
│   ├── venv/                    # Python virtual environment
│   ├── ecosystem.config.js      # PM2 configuration
│   ├── .env.template           # Environment variables template
│   └── logs/                   # PM2 application logs
├── web-app/                    # Web app (from GitHub repo)
│   └── [Next.js application]
└── Cosmos-Kit Token Holder Research.txt
```

## Deployment Status
- [x] Server connection established ✅ **CONNECTED**
- [x] Dependencies installed ✅ **COMPLETED**
  - **Python 3**: ✅ Installed via apt
  - **pip3**: ✅ Installed via apt  
  - **Node.js**: ✅ Installed (v22.20.0 LTS)
  - **npm**: ✅ Installed (comes with Node.js)
  - **MongoDB**: ✅ Installed and Running (v7.0.25)
    - Service Status: Active (running)
    - Enabled on boot: Yes
    - PID: 11307
  - **PM2**: ✅ Installed globally
- [x] GitHub repository cloned ✅ **COMPLETED**
  - **Location**: `/home/ubuntu/CROWDP-Interchain-Token-Gate/`
  - **Discord Bot Files**: ✅ Available in `discord-bot/` directory
  - **Web App Files**: ✅ Available in `web-app/` directory
- [x] Python virtual environment created ✅ **COMPLETED**
- [x] PM2 ecosystem configuration created ✅ **COMPLETED**
- [ ] Environment variables configured (.env file)
- [ ] Python dependencies installed in virtual environment
- [ ] PM2 processes started
- [ ] Bot service running and tested

## Connection Success ✅
- **Status**: Successfully connected to Ubuntu 24.04.3 LTS
- **System Load**: 0.0 (excellent)
- **Memory Usage**: 20%
- **Disk Usage**: 25.6% of 6.71GB
- **SSH Key**: Working correctly
- **Current User**: ubuntu@ip-172-31-44-113

## PM2 Process Management
### Ecosystem Configuration
- **File**: `ecosystem.config.js`
- **Processes Configured**:
  1. **crowdp-discord-bot**: Main Discord bot (`bot.py`)
  2. **crowdp-role-server**: Role assignment server (`role_assignment_server.py`)
  3. **crowdp-web-server**: Web server (`web_server.py`)

### PM2 Commands
- **Start all processes**: `pm2 start ecosystem.config.js`
- **Stop all processes**: `pm2 stop all`
- **Restart all processes**: `pm2 restart all`
- **View logs**: `pm2 logs`
- **Monitor processes**: `pm2 monit`
- **Save PM2 config**: `pm2 save`
- **Setup startup script**: `pm2 startup`

### Log Files Location
- **Main Bot**: `./logs/combined.log`
- **Role Server**: `./logs/role-server-combined.log`
- **Web Server**: `./logs/web-server-combined.log`

## Environment Variables (Server)
- DISCORD_TOKEN
- DISCORD_BOT_API_KEY
- MONGODB_URI
- COSMOS_RPC_ENDPOINTS
- ROLE_CONFIGS

## Backup & Recovery
- **Local Backup**: Git repository
- **Server Backup**: Daily MongoDB dumps
- **Config Backup**: Environment files backed up separately

## Last Updated
- Created: $(Get-Date)
- Last Deployment: TBD
- Last Update: TBD