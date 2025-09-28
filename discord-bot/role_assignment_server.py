import asyncio
import logging
import os
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any, Annotated

import discord
from discord.ext import commands
from discord import app_commands
from fastapi import FastAPI, HTTPException, Header, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
from pymongo import MongoClient
from pymongo.collection import Collection
from pymongo.database import Database
import aiohttp
import threading
import time

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# Import custom modules
from database import db
from role_commands import RoleCommands

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# FastAPI app
app = FastAPI(title="Discord Role Assignment API")

# Pydantic models
class PermanentRoleAssignmentRequest(BaseModel):
    discord_id: str
    role_ids: List[str]
    wallet_address: str

class RoleAssignmentResponse(BaseModel):
    success: bool
    assigned_roles: List[str]
    message: str

# Discord bot instance
bot_instance = None

# API Key authentication
async def verify_api_key(x_api_key: Annotated[str, Header()] = None):
    """Verify API key for protected endpoints"""
    expected_api_key = os.getenv('DISCORD_BOT_API_KEY')
    
    if not expected_api_key:
        raise HTTPException(status_code=500, detail="API key not configured on server")
    
    if not x_api_key:
        raise HTTPException(status_code=401, detail="API key required")
    
    if x_api_key != expected_api_key:
        raise HTTPException(status_code=401, detail="Invalid API key")
    
    return True

# Custom embed creation function
def create_embed(title: str, description: str, color: int = 0x00ff00, thumbnail_url: str = None, guild: discord.Guild = None) -> discord.Embed:
    """Create a standardized embed for the bot"""
    embed = discord.Embed(
        title=title,
        description=description,
        color=color
    )
    
    if thumbnail_url:
        embed.set_thumbnail(url=thumbnail_url)
    
    # Add server footer if guild is provided, otherwise use default
    if guild:
        embed.set_footer(
            text=guild.name,
            icon_url=guild.icon.url if guild.icon else None
        )
    else:
        embed.set_footer(
            text="Cosmos Token Verifier Bot",
            icon_url="https://cryptologos.cc/logos/cosmos-atom-logo.png"
        )
    
    return embed

# Custom view for connect button
class ConnectView(discord.ui.View):
    def __init__(self, user_id: int, web_app_url: str):
        super().__init__(timeout=300)
        self.user_id = user_id
        self.web_app_url = web_app_url
        
        # Add link button instead of regular button
        redirect_url = self.web_app_url
        self.add_item(discord.ui.Button(
            label='Connect Wallet & Discord',
            style=discord.ButtonStyle.link,
            url=redirect_url,
            emoji='🔗'
        ))

# Admin check decorator
def is_admin():
    def predicate(interaction: discord.Interaction) -> bool:
        return interaction.user.guild_permissions.administrator
    return app_commands.check(predicate)

class RoleAssignmentBot(commands.Bot):
    def __init__(self):
        intents = discord.Intents.default()
        # Enable required intents for role management and member access
        intents.guilds = True
        intents.members = True  # Required to access member information
        
        super().__init__(
            command_prefix='!',
            intents=intents,
            help_command=None
        )
        
    async def setup_hook(self):
        """Called when the bot is starting up"""
        # Add the role commands cog
        await self.add_cog(RoleCommands(self))
        
        # Add slash commands
        self.tree.add_command(connect_command)
        self.tree.add_command(send_embed)
        
        # Sync commands with Discord
        try:
            synced = await self.tree.sync()
            logger.info(f"Synced {len(synced)} command(s)")
        except Exception as e:
            logger.error(f"Failed to sync commands: {e}")
        
        logger.info(f"Role assignment bot logged in as {self.user} (ID: {self.user.id})")
    
    async def on_ready(self):
        """Called when the bot is ready"""
        logger.info(f"Bot is ready! Logged in as {self.user}")
    
    async def close(self):
        """Called when the bot is shutting down"""
        await super().close()

# Initialize bot
discord_bot = RoleAssignmentBot()

@app.on_event("startup")
async def startup_event():
    """Start the Discord bot when FastAPI starts"""
    global bot_instance
    bot_instance = discord_bot
    
    # Initialize database connection
    try:
        await db.connect()
        logger.info("Database connection initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize database connection: {e}")
        raise HTTPException(status_code=500, detail="Database connection failed")
    
    token = os.getenv('DISCORD_BOT_TOKEN')
    if not token:
        logger.error("DISCORD_BOT_TOKEN not found in environment variables")
        raise HTTPException(status_code=500, detail="Discord bot token not configured")
    
    # Start bot in background
    asyncio.create_task(discord_bot.start(token))
    
    # Wait for bot to be ready
    await asyncio.sleep(3)

@app.post("/assign-permanent-roles", response_model=RoleAssignmentResponse)
async def assign_permanent_roles(request: PermanentRoleAssignmentRequest, _: bool = Depends(verify_api_key)):
    """Assign permanent Discord roles to a user based on their token holdings"""
    try:
        logger.info(f"Starting role assignment for discord_id: {request.discord_id}, wallet: {request.wallet_address}, role_ids: {request.role_ids}")
        
        if not bot_instance or not bot_instance.is_ready():
            logger.error("Discord bot is not ready")
            raise HTTPException(status_code=503, detail="Discord bot is not ready")
        
        guild_id_str = os.getenv('DISCORD_GUILD_ID')
        logger.info(f"Guild ID from env: {guild_id_str}")
        
        if not guild_id_str:
            logger.error("DISCORD_GUILD_ID environment variable not set")
            raise HTTPException(status_code=500, detail="DISCORD_GUILD_ID environment variable not set")
        
        try:
            guild_id = int(guild_id_str)
            logger.info(f"Parsed guild ID: {guild_id}")
        except ValueError as e:
            logger.error(f"Invalid DISCORD_GUILD_ID: {guild_id_str}, error: {str(e)}")
            raise HTTPException(status_code=500, detail="DISCORD_GUILD_ID must be a valid integer")
            
        guild = bot_instance.get_guild(guild_id)
        logger.info(f"Guild object: {guild}")
        
        if not guild:
            logger.error(f"Discord server not found for guild ID: {guild_id}")
            raise HTTPException(status_code=404, detail="Discord server not found")
        
        # Get the Discord member
        logger.info(f"Looking for member with ID: {request.discord_id}")
        member = guild.get_member(int(request.discord_id))
        logger.info(f"Member object: {member}")
        
        if not member:
            logger.error(f"User not found in Discord server: {request.discord_id}")
            raise HTTPException(status_code=404, detail="User not found in Discord server")
        
        assigned_roles = []
        failed_roles = []
        
        # Get all roles from the server that match the role IDs
        for role_id in request.role_ids:
            try:
                logger.info(f"Processing role ID: {role_id}")
                role = guild.get_role(int(role_id))
                if not role:
                    logger.warning(f"Role with ID {role_id} not found in server")
                    failed_roles.append(role_id)
                    continue
                
                logger.info(f"Found role: {role.name} (ID: {role.id})")
                
                # Check if user already has this role
                if role in member.roles:
                    logger.info(f"User {member.display_name} already has role {role.name}")
                    assigned_roles.append(role.name)
                    continue
                
                # Check bot permissions
                if not guild.me.guild_permissions.manage_roles:
                    logger.error("Bot does not have 'Manage Roles' permission")
                    failed_roles.append(role_id)
                    continue
                
                # Check role hierarchy
                if role.position >= guild.me.top_role.position:
                    logger.error(f"Cannot assign role {role.name} - role is higher than bot's highest role")
                    failed_roles.append(role_id)
                    continue
                
                # Assign the role
                logger.info(f"Attempting to assign role {role.name} to {member.display_name}")
                await member.add_roles(role, reason=f"Token verification - Wallet: {request.wallet_address}")
                assigned_roles.append(role.name)
                logger.info(f"Successfully assigned role {role.name} to {member.display_name}")
                
            except discord.Forbidden as e:
                logger.error(f"Forbidden error when assigning role {role_id}: {str(e)}")
                failed_roles.append(role_id)
            except discord.HTTPException as e:
                logger.error(f"HTTP error when assigning role {role_id}: {str(e)}")
                failed_roles.append(role_id)
            except ValueError as e:
                logger.error(f"Invalid role ID {role_id}: {str(e)}")
                failed_roles.append(role_id)
            except Exception as e:
                logger.error(f"Unexpected error assigning role {role_id}: {type(e).__name__}: {str(e)}")
                failed_roles.append(role_id)
        
        # Remove roles that the user no longer qualifies for
        # Get all roles from database to check which ones are token-based
        try:
            all_db_roles = await db.get_all_roles()
            db_role_ids = {role.get('discordRoleId') for role in all_db_roles if role.get('discordRoleId')}
            
            for role in guild.roles:
                # Check if this is a token-based role by seeing if it's in our database
                if str(role.id) in request.role_ids:
                    continue  # Skip roles they should have
                
                # Remove roles that are token-based but not in the eligible list
                if role in member.roles and str(role.id) in db_role_ids:
                    try:
                        await member.remove_roles(role, reason=f"Token verification - No longer qualifies")
                        logger.info(f"Removed role {role.name} from {member.display_name}")
                    except Exception as e:
                        logger.error(f"Failed to remove role {role.name}: {str(e)}")
        except Exception as e:
            logger.error(f"Failed to fetch roles from database for cleanup: {str(e)}")
            # Continue without role cleanup if database fails
        
        success_message = f"Successfully assigned {len(assigned_roles)} roles"
        if failed_roles:
            success_message += f", failed to assign {len(failed_roles)} roles"
        
        # Send DM notification to user about role assignment
        if assigned_roles:
            try:
                embed = discord.Embed(
                    title="🎉 Roles Assigned Successfully!",
                    description="Your Discord roles have been updated based on your token holdings.",
                    color=0x14b8a6  # teal-500
                )
                
                embed.add_field(
                    name="✅ Assigned Roles",
                    value="\n".join([f"• {role}" for role in assigned_roles]),
                    inline=False
                )
                
                embed.add_field(
                    name="💰 Wallet Address",
                    value=f"`{request.wallet_address}`",
                    inline=False
                )
                
                embed.set_footer(text="Thank you for connecting your wallet to CrowdPunk!")
                embed.set_thumbnail(url="https://cdn.discordapp.com/emojis/1234567890123456789.png")  # Optional: Add server icon
                
                await member.send(embed=embed)
                logger.info(f"Sent DM notification to {member.display_name} about role assignment")
                
            except discord.Forbidden:
                logger.warning(f"Could not send DM to {member.display_name} - DMs may be disabled")
            except Exception as e:
                logger.error(f"Failed to send DM notification to {member.display_name}: {str(e)}")
        
        return RoleAssignmentResponse(
            success=len(assigned_roles) > 0,
            assigned_roles=assigned_roles,
            message=success_message
        )
        
    except Exception as e:
        error_msg = str(e) if str(e) else "Unknown error occurred during role assignment"
        logger.error(f"Error in assign_permanent_roles: {error_msg}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {error_msg}")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    bot_ready = bot_instance and bot_instance.is_ready()
    return {
        "status": "healthy" if bot_ready else "bot_not_ready",
        "bot_ready": bot_ready,
        "bot_user": str(bot_instance.user) if bot_instance and bot_instance.user else None
    }

# Connect Command
@app_commands.command(
    name="connect",
    description="Get the connection link to verify your Cosmos token holdings"
)
async def connect_command(interaction: discord.Interaction):
    """Send generic announcement embed with connect button"""
    try:
        user = interaction.user
        web_app_url = os.getenv('WEB_APP_URL', 'http://localhost:3000')
        
        embed = create_embed(
            title="🌌 Cosmos Token Verification",
            description=(
                "**Connect your wallet to verify token holdings and unlock exclusive roles!**\n\n"
                "**How it works:**\n"
                "1. 🔗 Click the connection button below\n"
                "2. 💰 Connect your Cosmos ecosystem wallet\n"
                "3. 🔍 System verifies your token holdings across multiple chains\n"
                "4. 🎭 Receive appropriate roles based on your holdings\n"
                "5. 🎉 Access exclusive channels and features\n\n"
                "**Supported Networks:** Cosmos Hub, Osmosis, Juno, Stargaze, and more\n"
                "*Your wallet data is secure and only used for verification purposes.*"
            ),
            color=0x3498db,
            thumbnail_url=user.display_avatar.url,
            guild=interaction.guild
        )
        
        view = ConnectView(user.id, web_app_url)
        
        await interaction.response.send_message(
            embed=embed,
            view=view,
            ephemeral=True
        )
        
        logger.info(f"User {interaction.user} used connect command")
        
    except Exception as e:
        error_embed = create_embed(
            title="❌ Error",
            description=f"Something went wrong: {str(e)}",
            color=0xff0000,
            guild=interaction.guild
        )
        
        await interaction.response.send_message(
            embed=error_embed
        )
        
        logger.error(f"Error in connect command: {e}")

# Send Embed Command (Admin Only)
@app_commands.command(
    name="send-embed",
    description="Send a custom embed to a specified channel (Admin only)"
)
@app_commands.describe(
    channel="The channel to send the announcement embed to"
)
@is_admin()
async def send_embed(
    interaction: discord.Interaction,
    channel: discord.TextChannel
):
    """Send wallet connection announcement embed to specified channel"""
    try:
        # Create the same announcement embed as /connect command
        embed = create_embed(
            title="🌌 Cosmos Token Verification",
            description=(
                "**Connect your wallet to verify token holdings and unlock exclusive roles!**\n\n"
                "**How it works:**\n"
                "1. 🔗 Click the connection button below\n"
                "2. 💰 Connect your Cosmos ecosystem wallet\n"
                "3. 🔍 System verifies your token holdings across multiple chains\n"
                "4. 🎭 Receive appropriate roles based on your holdings\n"
                "5. 🎉 Access exclusive channels and features\n\n"
                "**Supported Networks:** Cosmos Hub, Osmosis, Juno, Stargaze, and more\n"
                "*Your wallet data is secure and only used for verification purposes.*"
            ),
            color=0x3498db,
            guild=interaction.guild
        )
        
        # Create view with generic user ID (0) for public announcement
        view = ConnectView(0, os.getenv('WEB_APP_URL', 'http://localhost:3000'))
        
        await channel.send(embed=embed, view=view)
        
        success_embed = create_embed(
            title="✅ Success",
            description=f"Announcement embed sent to {channel.mention}",
            color=0x00ff00,
            guild=interaction.guild
        )
        
        await interaction.response.send_message(
            embed=success_embed,
            ephemeral=True
        )
        
        logger.info(f"Admin {interaction.user} sent embed to {channel.name}")
        
    except Exception as e:
        error_embed = create_embed(
            title="❌ Error",
            description=f"Failed to send embed: {str(e)}",
            color=0xff0000,
            guild=interaction.guild
        )
        
        await interaction.response.send_message(
            embed=error_embed
        )
        
        logger.error(f"Error sending embed: {e}")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)