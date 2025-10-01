import discord
from discord.ext import commands
from discord import app_commands
import os
from dotenv import load_dotenv
import asyncio
import logging
from database import db
from balance_monitor import BalanceMonitor

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Bot configuration
class VerifierBot(commands.Bot):
    def __init__(self):
        intents = discord.Intents.default()
        intents.guilds = True
        # Remove privileged intents that require approval
        # intents.message_content = True
        # intents.members = True
        
        super().__init__(
            command_prefix='!',
            intents=intents,
            help_command=None
        )
        
        # Initialize balance monitor
        self.balance_monitor = BalanceMonitor()
        
    async def setup_hook(self):
        """Called when the bot is starting up"""
        logger.info(f"Logged in as {self.user} (ID: {self.user.id})")
        logger.info("Bot is ready!")
        
        # Initialize database connection
        try:
            await db.connect()
            logger.info("Database connection established")
        except Exception as e:
            logger.error(f"Failed to connect to database: {e}")
        
        # Load role commands cog
        try:
            await self.load_extension('role_commands')
            logger.info("Loaded role commands cog")
        except Exception as e:
            logger.error(f"Failed to load role commands: {e}")
        
        # Start balance monitoring
        try:
            self.balance_monitor.start_monitoring()
            logger.info("Balance monitoring started")
        except Exception as e:
            logger.error(f"Failed to start balance monitoring: {e}")
    
    async def close(self):
        """Called when the bot is shutting down"""
        logger.info("Bot is shutting down...")
        
        # Stop balance monitoring
        if hasattr(self, 'balance_monitor'):
            self.balance_monitor.stop_monitoring()
            logger.info("Balance monitoring stopped")
        
        # Disconnect from database
        try:
            await db.disconnect()
            logger.info("Database connection closed")
        except Exception as e:
            logger.error(f"Error closing database connection: {e}")
        
        await super().close()
        # Sync commands globally
        try:
            synced = await self.tree.sync()
            logger.info(f"Synced {len(synced)} command(s)")
        except Exception as e:
            logger.error(f"Failed to sync commands: {e}")

    async def on_ready(self):
        """Called when the bot is ready"""
        logger.info(f"Bot is online and ready!")
        await self.change_presence(
            activity=discord.Activity(
                type=discord.ActivityType.watching,
                name="for Cosmos token holders"
            )
        )

# Initialize bot
bot = VerifierBot()

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
        redirect_url = f"{self.web_app_url}/connect?discord_id={self.user_id}"
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

# Send Embed Command (Admin Only)
@bot.tree.command(
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
            thumbnail_url="https://cryptologos.cc/logos/cosmos-atom-logo.png",
            guild=interaction.guild
        )
        
        # Add the connect button view
        web_app_url = os.getenv('WEB_APP_URL', 'http://localhost:3000')
        view = ConnectView(0, web_app_url)  # Use 0 as placeholder since it's for announcement
        
        await channel.send(embed=embed, view=view)
        
        # Confirm to admin
        success_embed = create_embed(
            title="✅ Embed Sent Successfully",
            description=f"Embed has been sent to {channel.mention}",
            color=0x00ff00,
            guild=interaction.guild
        )
        
        await interaction.response.send_message(
            embed=success_embed
        )
        
        logger.info(f"Admin {interaction.user} sent embed to #{channel.name}")
        
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

# Connect Command
@bot.tree.command(
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

# Error handler for missing permissions
@send_embed.error
async def send_embed_error(interaction: discord.Interaction, error: app_commands.AppCommandError):
    if isinstance(error, app_commands.MissingPermissions):
        embed = create_embed(
            title="❌ Access Denied",
            description="You need administrator permissions to use this command.",
            color=0xff0000,
            guild=interaction.guild
        )
        await interaction.response.send_message(embed=embed)

# Run the bot
if __name__ == "__main__":
    token = os.getenv('DISCORD_BOT_TOKEN')
    if not token:
        logger.error("DISCORD_BOT_TOKEN not found in environment variables")
        exit(1)
    
    try:
        bot.run(token)
    except Exception as e:
        logger.error(f"Failed to start bot: {e}")
    finally:
        # Cleanup database connection
        try:
            asyncio.run(db.disconnect())
            logger.info("Database connection closed")
        except Exception as e:
            logger.error(f"Error closing database connection: {e}")