# Cosmos Token Verifier Discord Bot

A Discord bot that verifies Cosmos token holdings and assigns roles based on token ownership across multiple chains.

## Features

- **Admin Commands:**
  - `/send-embed` - Send custom embeds to specified channels (Admin only)

- **User Commands:**
  - `/connect` - Get personalized connection link to verify token holdings

## Setup

1. **Install Dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Configure Environment:**
   - Update `.env` file with your Discord bot token
   - Set your web application URL
   - Configure MongoDB connection (for future use)

3. **Run the Bot:**
   ```bash
   python bot.py
   ```

## Commands

### `/send-embed`
**Admin Only** - Send a custom embed to a specified channel

**Parameters:**
- `channel` - The channel to send the embed to
- `title` - Title of the embed
- `description` - Description/content of the embed
- `color` - Hex color code (optional, e.g., #ff0000)

### `/connect`
**All Users** - Get your personalized connection link

This command provides users with:
1. A personalized embed with instructions
2. A button that redirects to the web application
3. Integration with the web app for wallet connection

## Workflow

1. User runs `/connect` command
2. Bot sends personalized embed with connect button
3. User clicks button and is redirected to web application
4. User connects their Cosmos wallet on the website
5. User links their Discord account
6. System verifies token holdings across multiple chains
7. User receives appropriate roles based on holdings
8. User is redirected back to Discord server

## Security Features

- Admin-only commands with permission checks
- Ephemeral responses for sensitive operations
- Secure token handling
- Environment variable configuration

## Future Enhancements

- Multi-chain token verification
- Automatic role assignment
- Token holding thresholds
- Real-time balance monitoring
- Integration with Cosmos ecosystem APIs

## Environment Variables

```env
DISCORD_BOT_TOKEN=your_discord_bot_token
WEB_APP_URL=http://localhost:3000
MONGODB_URI=mongodb://localhost:27017/verifier-db
COSMOS_CHAIN_ID=cosmoshub-4
COSMOS_RPC_URL=https://cosmos-rpc.quickapi.com
JWT_SECRET=your-jwt-secret-key-here
```

## Requirements

- Python 3.8+
- Discord.py 2.3.2+
- Active Discord Bot Token
- Web application for wallet connection