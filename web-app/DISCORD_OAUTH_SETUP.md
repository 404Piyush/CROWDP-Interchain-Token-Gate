# Discord OAuth Configuration Guide

This guide explains how to set up Discord OAuth for the Cosmos Token Verifier web application.

## Prerequisites

- Discord Developer Account
- Discord Server (Guild) where you want to add verified users
- Discord Bot (already created for the bot component)

## Step 1: Discord Application Setup

### 1.1 Access Discord Developer Portal
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your existing application (the one used for the Discord bot)

### 1.2 Configure OAuth2 Settings
1. Navigate to **OAuth2** → **General** in the left sidebar
2. Add the following **Redirect URIs**:
   ```
   http://localhost:3000/api/auth/discord/callback
   https://yourdomain.com/api/auth/discord/callback
   ```
   (Replace `yourdomain.com` with your actual domain for production)

3. Under **Scopes**, ensure you have:
   - `identify` - to get user information
   - `guilds.join` - to add users to your Discord server

## Step 2: Environment Configuration

### 2.1 Required Environment Variables

Update your `.env.local` file with the following variables:

```env
# Discord OAuth Configuration
DISCORD_CLIENT_ID=your_discord_application_client_id
DISCORD_CLIENT_SECRET=your_discord_application_client_secret
DISCORD_BOT_TOKEN=your_discord_bot_token
DISCORD_GUILD_ID=your_discord_server_id
DISCORD_INVITE_URL=https://discord.gg/your-server-invite

# Public Environment Variables (for frontend)
NEXT_PUBLIC_DISCORD_CLIENT_ID=your_discord_application_client_id
```

### 2.2 How to Get These Values

#### Discord Client ID & Client Secret
1. In Discord Developer Portal → Your Application → **General Information**
2. Copy **Application ID** (this is your Client ID)
3. Copy **Client Secret** (click "Reset Secret" if needed)

#### Discord Bot Token
1. In Discord Developer Portal → Your Application → **Bot**
2. Copy the **Token** (this should already be configured from the bot setup)

#### Discord Guild ID (Server ID)
1. In Discord, right-click on your server name
2. Click "Copy Server ID" (you need Developer Mode enabled)
3. To enable Developer Mode: User Settings → Advanced → Developer Mode

#### Discord Invite URL
1. In your Discord server, create a permanent invite link
2. Right-click on a channel → "Invite People" → "Edit invite link"
3. Set "Expire after" to "Never" and "Max number of uses" to "No limit"

## Step 3: Bot Permissions

### 3.1 Required Bot Permissions
Ensure your Discord bot has the following permissions in your server:
- `Manage Server` (to add members)
- `Create Instant Invite`
- Any role management permissions if you plan to assign roles

### 3.2 Bot Invite URL
Generate a bot invite URL with proper permissions:
1. Discord Developer Portal → Your Application → **OAuth2** → **URL Generator**
2. Select **Scopes**: `bot`
3. Select **Bot Permissions**: `Manage Server`, `Create Instant Invite`
4. Use the generated URL to invite the bot to your server

## Step 4: Testing the Setup

### 4.1 Local Development
1. Start your Next.js development server:
   ```bash
   npm run dev
   ```
2. Navigate to `http://localhost:3000`
3. Connect a wallet and test the Discord OAuth flow

### 4.2 Verification Checklist
- [ ] Discord application created and configured
- [ ] OAuth2 redirect URIs added
- [ ] All environment variables set correctly
- [ ] Bot has proper permissions in Discord server
- [ ] Wallet connection works
- [ ] Discord OAuth redirects properly
- [ ] Users are added to Discord server after OAuth
- [ ] Database stores user information correctly

## Step 5: Production Deployment

### 5.1 Update Environment Variables
For production deployment, update:
- `NEXTAUTH_URL` to your production domain
- Add production redirect URI to Discord OAuth settings
- Ensure all secrets are properly secured

### 5.2 Security Considerations
- Never expose `DISCORD_CLIENT_SECRET` or `DISCORD_BOT_TOKEN` in frontend code
- Use environment variables for all sensitive data
- Implement proper error handling for OAuth failures
- Consider rate limiting for API endpoints

## Troubleshooting

### Common Issues

1. **"Invalid Redirect URI" Error**
   - Ensure the redirect URI in Discord matches exactly with your callback URL
   - Check for trailing slashes or protocol mismatches

2. **"Missing Access" Error**
   - Verify bot has proper permissions in Discord server
   - Check if bot is actually in the target server

3. **"Invalid Client" Error**
   - Double-check `DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET`
   - Ensure they match the values in Discord Developer Portal

4. **Users Not Added to Server**
   - Verify `DISCORD_GUILD_ID` is correct
   - Check bot permissions include "Manage Server"
   - Ensure bot token is valid and bot is in the server

### Debug Tips
- Check browser network tab for failed API requests
- Review server logs for detailed error messages
- Test OAuth flow step by step
- Verify database connections and user storage

## API Endpoints

The application includes the following API endpoints:

- `POST /api/user/check` - Check if user exists in database
- `GET /api/auth/discord/callback` - Handle Discord OAuth callback

## Database Schema

Users are stored with the following structure:
```javascript
{
  walletAddress: String,
  discordId: String,
  discordUsername: String,
  discordDiscriminator: String,
  discordAvatar: String,
  connectedAt: Date,
  accessToken: String, // Encrypted in production
  refreshToken: String // Encrypted in production
}
```

## Support

For additional help:
- [Discord Developer Documentation](https://discord.com/developers/docs)
- [Next.js API Routes Documentation](https://nextjs.org/docs/api-routes/introduction)
- [MongoDB Node.js Driver Documentation](https://docs.mongodb.com/drivers/node/)