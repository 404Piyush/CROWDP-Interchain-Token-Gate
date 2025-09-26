import discord
from discord.ext import commands
from discord import app_commands
import os
import asyncio
from typing import Optional
import logging
from database import db

# Configure logging
logger = logging.getLogger(__name__)

class RoleCommands(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @app_commands.command(name="rolegoals", description="View all available roles and their requirements")
    async def role_goals(self, interaction: discord.Interaction):
        """Show all available roles and their OSMO requirements"""
        try:
            await interaction.response.defer()
            
            # Get roles directly from database
            roles = await db.get_all_roles()
            
            if not roles:
                embed = discord.Embed(
                    title="🎭 Crowdpunk Role Goals",
                    description="No roles have been configured yet. Ask an admin to add some roles!",
                    color=0x14b8a6
                )
                await interaction.followup.send(embed=embed)
                return
                    
            # Create role goals embed
            embed = discord.Embed(
                title="🎭 Crowdpunk Role Goals",
                description="Achieve these roles by holding OSMO tokens in your connected wallet!",
                color=0x14b8a6  # teal-500
            )
            
            # Sort roles by amount threshold (holder roles first, then by amount)
            sorted_roles = sorted(roles, key=lambda x: (x.get('amountThreshold', 0) if x['type'] == 'amount' else -1))
            
            for i, role in enumerate(sorted_roles):
                # Add role emoji based on tier
                if i == 0:
                    emoji = "🥉"
                elif i == 1:
                    emoji = "🥈"
                elif i == 2:
                    emoji = "🥇"
                else:
                    emoji = "⭐"
                
                # Format role description based on type
                if role['type'] == 'holder':
                    description = "Entry level trader with 1+ OSMO tokens"
                    threshold_text = "1 OSMO"
                else:
                    threshold = role.get('amountThreshold', 0)
                    if threshold >= 10:
                        description = f"Elite member with {threshold}+ OSMO tokens"
                    elif threshold >= 5:
                        description = f"Experienced community member with {threshold}+ OSMO tokens"
                    else:
                        description = f"Entry level trader with {threshold}+ OSMO tokens"
                    threshold_text = f"{threshold} OSMO"
                
                # Get Discord role mention if available
                role_mention = ""
                if role.get('discordRoleId'):
                    role_mention = f" <@&{role['discordRoleId']}>"
                
                embed.add_field(
                    name=f"**{i+1}.** {emoji} {role['name']}{role_mention}",
                    value=f"**{threshold_text}**\n{description}",
                    inline=False
                )
            
            embed.add_field(
                name="💡 How to Get Roles",
                value="Connect your wallet at our web app and use the role testing button!",
                inline=False
            )
            
            embed.set_footer(text="Visit our web app to test role assignments!")
            
            await interaction.followup.send(embed=embed)
                    
        except Exception as e:
            logger.error(f"Error in role_goals command: {e}")
            error_embed = discord.Embed(
                title="❌ Error",
                description=f"Failed to load role goals: {str(e)}",
                color=0xff0000
            )
            await interaction.followup.send(embed=error_embed)

    # Admin check decorator
    def is_admin():
        def predicate(interaction: discord.Interaction) -> bool:
            return interaction.user.guild_permissions.administrator
        return app_commands.check(predicate)

    @app_commands.command(name="addreward", description="Add a new role reward to the database (Admin only)")
    @app_commands.describe(
        discord_role="The Discord role to assign",
        amount="The minimum token amount required (optional - leave empty for all holders)"
    )
    @is_admin()
    async def add_reward(
        self,
        interaction: discord.Interaction,
        discord_role: discord.Role,
        amount: Optional[float] = None
    ):
        """Add a new role reward to the database"""
        try:
            await interaction.response.defer(ephemeral=True)
            
            # Check if role already exists
            if await db.role_exists(str(discord_role.id)):
                error_embed = discord.Embed(
                    title="❌ Role Already Exists",
                    description=f"The role {discord_role.mention} already exists in the database.",
                    color=0xff0000
                )
                await interaction.followup.send(embed=error_embed, ephemeral=True)
                return
            
            # Determine role type and prepare data
            role_type = "holder" if amount is None else "amount"
            created_by = f"{interaction.user.display_name} (ID: {interaction.user.id})"
            
            # Add role to database
            role_data = await db.add_role(
                name=discord_role.name,
                discord_role_id=str(discord_role.id),
                amount_threshold=int(amount) if amount is not None else None,
                role_type=role_type,
                created_by=created_by
            )
            
            # Create success embed
            embed = discord.Embed(
                title="✅ Role Added Successfully",
                description=f"Role {discord_role.mention} has been added to the database.",
                color=0x00ff00
            )
            
            embed.add_field(
                name="Role Name",
                value=discord_role.name,
                inline=True
            )
            
            embed.add_field(
                name="Role ID",
                value=str(discord_role.id),
                inline=True
            )
            
            if amount is None:
                embed.add_field(
                    name="Type",
                    value="🎯 **Holder Role** - Available to all token holders",
                    inline=False
                )
            else:
                embed.add_field(
                    name="Type",
                    value=f"💰 **Amount Role** - Requires minimum {int(amount)} OSMO",
                    inline=False
                )
            
            embed.add_field(
                name="Added by",
                value=f"{interaction.user.display_name}",
                inline=True
            )
            
            embed.set_footer(text="Users can now see this role in the web app!")
            
            await interaction.followup.send(embed=embed, ephemeral=True)
            logger.info(f"Role '{discord_role.name}' (ID: {discord_role.id}) added by {interaction.user.display_name} (ID: {interaction.user.id})")
                
        except Exception as e:
            logger.error(f"Error in add_reward command: {e}")
            error_embed = discord.Embed(
                title="❌ Database Error",
                description=f"Failed to add role to database: {str(e)}",
                color=0xff0000
            )
            await interaction.followup.send(embed=error_embed, ephemeral=True)
                
        except Exception as e:
            logger.error(f"Error in add_reward command: {str(e)}")
            error_embed = discord.Embed(
                title="❌ Error",
                description=f"An error occurred while adding the role: {str(e)}",
                color=0xff0000
            )
            await interaction.followup.send(embed=error_embed, ephemeral=True)

    # Error handler for missing permissions
    @add_reward.error
    async def add_reward_error(self, interaction: discord.Interaction, error: app_commands.AppCommandError):
        if isinstance(error, app_commands.MissingPermissions):
            embed = discord.Embed(
                title="❌ Access Denied",
                description="You need administrator permissions to use this command.",
                color=0xff0000
            )
            await interaction.response.send_message(embed=embed, ephemeral=True)

    @app_commands.command(name="removereward", description="Remove a role reward from the database (Admin only)")
    @app_commands.describe(
        discord_role="The Discord role to remove from the database"
    )
    @is_admin()
    async def remove_reward(
        self,
        interaction: discord.Interaction,
        discord_role: discord.Role
    ):
        """Remove a role reward from the database"""
        try:
            await interaction.response.defer(ephemeral=True)
            
            # Check if role exists in database
            if not await db.role_exists(str(discord_role.id)):
                error_embed = discord.Embed(
                    title="❌ Role Not Found",
                    description=f"The role {discord_role.mention} is not in the database.",
                    color=0xff0000
                )
                await interaction.followup.send(embed=error_embed, ephemeral=True)
                return
            
            # Remove role from database
            success = await db.delete_role(str(discord_role.id))
            
            if success:
                # Create success embed
                embed = discord.Embed(
                    title="✅ Role Removed Successfully",
                    description=f"The role reward has been removed from the database.",
                    color=0x00ff00
                )
                embed.add_field(name="Role Name", value=discord_role.name, inline=True)
                embed.add_field(name="Role ID", value=str(discord_role.id), inline=True)
                embed.set_footer(text=f"Removed by {interaction.user.display_name}")
                
                await interaction.followup.send(embed=embed, ephemeral=True)
                logger.info(f"Role '{discord_role.name}' (ID: {discord_role.id}) removed by {interaction.user.display_name} (ID: {interaction.user.id})")
            else:
                error_embed = discord.Embed(
                    title="❌ Removal Failed",
                    description=f"Failed to remove the role {discord_role.mention} from the database.",
                    color=0xff0000
                )
                await interaction.followup.send(embed=error_embed, ephemeral=True)
                
        except Exception as e:
            logger.error(f"Error in remove_reward command: {e}")
            error_embed = discord.Embed(
                title="❌ Database Error",
                description=f"Failed to remove role from database: {str(e)}",
                color=0xff0000
            )
            await interaction.followup.send(embed=error_embed, ephemeral=True)

    # Error handler for missing permissions
    @remove_reward.error
    async def remove_reward_error(self, interaction: discord.Interaction, error: app_commands.AppCommandError):
        if isinstance(error, app_commands.MissingPermissions):
            embed = discord.Embed(
                title="❌ Access Denied",
                description="You need administrator permissions to use this command.",
                color=0xff0000
            )
            await interaction.response.send_message(embed=embed, ephemeral=True)

    async def assign_test_role(self, user_id: str, role_id: str):
        """Assign a test role to a user and auto-remove after 30 seconds"""
        try:
            guild = self.bot.get_guild(int(os.getenv('DISCORD_GUILD_ID')))
            if not guild:
                print(f"Guild not found: {os.getenv('DISCORD_GUILD_ID')}")
                return False
            
            user = guild.get_member(int(user_id))
            if not user:
                print(f"User not found: {user_id}")
                return False
            
            role = guild.get_role(int(role_id))
            if not role:
                print(f"Role not found: {role_id}")
                return False
            
            # Add the role
            await user.add_roles(role, reason="Test role assignment from web app")
            print(f"Assigned role {role.name} to {user.display_name}")
            
            # Wait 30 seconds then remove the role
            await asyncio.sleep(30)
            
            # Check if user still has the role before removing
            if role in user.roles:
                await user.remove_roles(role, reason="Auto-removal after 30 seconds")
                print(f"Removed role {role.name} from {user.display_name}")
            
            return True
            
        except Exception as e:
            print(f"Error in assign_test_role: {str(e)}")
            return False

    def create_progress_bar(self, percentage: int, length: int = 10) -> str:
        """Create a text-based progress bar"""
        filled = int(length * percentage / 100)
        empty = length - filled
        return "█" * filled + "░" * empty

async def setup(bot):
    await bot.add_cog(RoleCommands(bot))