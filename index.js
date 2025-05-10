// Discord Verification Bot - With Telegram Sharing
// Using Discord.js v14
const { Client, GatewayIntentBits, PermissionFlagsBits, Events, EmbedBuilder, 
  ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
require('dotenv').config();

// Create a new client instance
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ]
});

// Configuration
const config = {
  serverInviteLink: 'https://discord.gg/K5E9yRVr', // Your server link
  telegramShareLink: 'https://t.me/share/url?url=https://discord.gg/K5E9yRVr&text=Join%20this%20awesome%20server!', // Pre-formatted Telegram share link
  telegramProductLink: 'https://t.me/VlPcontentbot?startapp=Product', // Product link to share when users chat
  requiredShares: 3, // How many times users need to share the link
  verificationChannelId: '1370259139153887252', // Replace with your verification channel ID
  verifiedRoleId: '1370259899350782024', // Replace with your verified role ID
  welcomeChannelId: '1370265673455898706', // Replace with your welcome channel ID
  cooldownTime: 60000 // Cooldown in milliseconds (1 minute) between shares to prevent spam
};

// Database to track user shares (in a production app, use a proper database)
const userShares = new Map();
const userCooldowns = new Map();
// Track message cooldowns to prevent spam
const messageCooldowns = new Map();
const MESSAGE_COOLDOWN = 10000; // 10 seconds between auto-replies

// Error handling - add general error handlers to prevent crashes
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Bot ready event
client.once(Events.ClientReady, () => {
  console.log(`Logged in as ${client.user.tag}`);
  console.log('Verification bot with Telegram sharing is ready!');
  
  // Set bot activity
  client.user.setActivity('Verifying Members', { type: 'WATCHING' });
});

// When a new member joins the server
client.on(Events.GuildMemberAdd, async (member) => {
  try {
    // Send welcome message and instructions to verification channel
    const verificationChannel = member.guild.channels.cache.get(config.verificationChannelId);
    
    if (verificationChannel) {
      await sendVerificationMessage(member, verificationChannel);
    } else {
      console.error(`Verification channel with ID ${config.verificationChannelId} not found`);
    }
    
    // Initialize user in tracking system
    userShares.set(member.id, 0);
    
  } catch (error) {
    console.error('Error handling new member:', error);
  }
});

// Function to send verification message with buttons
async function sendVerificationMessage(member, channel) {
  try {
    const userId = member.id;
    const currentShares = userShares.get(userId) || 0;
    
    const embed = new EmbedBuilder()
      .setColor(0x0099FF)
      .setTitle('Welcome sa Server!')
      .setDescription(`Welcome, ${member.user.username}! Para magkaroon ng full access sa server na ito, kailangan mong ibahagi ang invite link namin **${config.requiredShares} beses** sa Telegram.`)
      .addFields(
        { name: 'Mga Instructions', value: '1. Click ang "Share sa Telegram" button sa ibaba\n2. Ibahagi ang link sa mga Telegram groups o friends mo\n3. Click ang "I Shared on Telegram" button pagkatapos mong mag-share\n4. Ulitin ito ng '+config.requiredShares+' beses\n5. Kapag na-verify ka na, makakakuha ka na ng full access sa server!' },
        { name: 'Progress', value: `${currentShares}/${config.requiredShares} shares` }
      )
      .setTimestamp();
    
    // Create buttons
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setLabel(`Share sa Telegram`)
          .setStyle(ButtonStyle.Link)
          .setURL(config.telegramShareLink)
          .setEmoji('🔗'),
        new ButtonBuilder()
          .setCustomId(`share_confirm_${userId}`)
          .setLabel(`I Shared on Telegram (${currentShares}/${config.requiredShares})`)
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`manual_verify_${userId}`)
          .setLabel('Show Screenshot Proof')
          .setStyle(ButtonStyle.Secondary)
      );
    
    await channel.send({ 
      content: `<@${userId}>`, 
      embeds: [embed],
      components: [row]
    });
  } catch (error) {
    console.error('Error sending verification message:', error);
  }
}

// Update progress for a user
async function updateVerificationProgress(interaction, userId) {
  try {
    // Get current share count for user
    const currentShares = userShares.get(userId) || 0;
    const newShareCount = currentShares + 1;
    
    // Check cooldown
    const lastShareTime = userCooldowns.get(userId) || 0;
    const now = Date.now();
    
    if (now - lastShareTime < config.cooldownTime) {
      const remainingTime = Math.ceil((config.cooldownTime - (now - lastShareTime)) / 1000);
      return await interaction.reply({ 
        content: `Masyado kang mabilis mag-share! Maghintay ka ng ${remainingTime} seconds bago mag-share ulit.`,
        ephemeral: true
      });
    }
    
    // Update share count
    userShares.set(userId, newShareCount);
    userCooldowns.set(userId, now);
    
    if (newShareCount >= config.requiredShares) {
      // User has met the requirement, give them access
      const member = interaction.guild.members.cache.get(userId);
      if (member) {
        try {
          // Add the verified role
          await member.roles.add(config.verifiedRoleId);
          
          // Send success message
          const successEmbed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('Verification Complete!')
            .setDescription(`Congratulations ${member.user.username}! Matagumpay kang na-verify at mayroon ka na ngayong full access sa server.`)
            .setTimestamp();
          
          await interaction.update({ 
            embeds: [successEmbed],
            components: [] // Remove buttons after verification
          });
          
          // Send welcome message to welcome channel
          const welcomeChannel = interaction.guild.channels.cache.get(config.welcomeChannelId);
          if (welcomeChannel) {
            await welcomeChannel.send(`Welcome sa server, <@${userId}>! Salamat sa pagtulong sa pag-grow ng community namin.`);
          } else {
            console.error(`Welcome channel with ID ${config.welcomeChannelId} not found`);
          }
        } catch (roleError) {
          console.error('Error adding role to user:', roleError);
          // Reply with error message but don't throw the error
          await interaction.followUp({ 
            content: 'Error adding verified role. Please contact an admin.',
            ephemeral: true
          });
        }
      }
    } else {
      // Update user on their progress
      const progressEmbed = new EmbedBuilder()
        .setColor(0xFFA500)
        .setTitle('Verification Progress')
        .setDescription(`Salamat ${interaction.user.username}! Naibahagi mo na ang aming server link ${newShareCount}/${config.requiredShares} beses.`)
        .addFields(
          { name: 'Natitira', value: `Ibahagi mo pa ng ${config.requiredShares - newShareCount} beses para ma-verify.` }
        )
        .setTimestamp();
      
      // Update button with new count
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setLabel(`Share sa Telegram`)
            .setStyle(ButtonStyle.Link)
            .setURL(config.telegramShareLink)
            .setEmoji('🔗'),
          new ButtonBuilder()
            .setCustomId(`share_confirm_${userId}`)
            .setLabel(`I Shared on Telegram (${newShareCount}/${config.requiredShares})`)
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId(`manual_verify_${userId}`)
            .setLabel('Show Screenshot Proof')
            .setStyle(ButtonStyle.Secondary)
        );
      
      await interaction.update({ 
        embeds: [progressEmbed],
        components: [row]
      });
    }
  } catch (error) {
    console.error('Error updating verification progress:', error);
    // Try to reply if we can, but don't throw another error if this fails
    try {
      await interaction.followUp({ 
        content: 'May error na nangyari. Please try again.',
        ephemeral: true
      });
    } catch (replyError) {
      console.error('Error replying to interaction:', replyError);
    }
  }
}

// Handle button interactions
client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (!interaction.isButton()) return;
    
    const customId = interaction.customId;
    
    // Handle share confirmation button
    if (customId.startsWith('share_confirm_')) {
      const userId = customId.split('_')[2];
      
      // Only allow the owner of the button to use it
      if (interaction.user.id !== userId) {
        return await interaction.reply({ 
          content: 'Hindi mo pwedeng gamitin ang button na ito dahil hindi ito para sa iyo.',
          ephemeral: true
        });
      }
      
      await interaction.deferReply({ ephemeral: true });
      
      try {
        await interaction.editReply({ 
          content: `Salamat sa pag-share sa Telegram! Ina-update ang verification progress mo...`,
          ephemeral: true
        });
        
        // Update the verification progress
        await updateVerificationProgress(interaction, userId);
      } catch (error) {
        console.error('Error handling share confirmation:', error);
        // Try to reply if possible
        try {
          await interaction.editReply({ 
            content: 'Error updating your verification progress. Please try again later.',
            ephemeral: true
          });
        } catch (replyError) {
          console.error('Failed to reply to interaction:', replyError);
        }
      }
    }
    
    // Handle manual verification button (for screenshot method)
    if (customId.startsWith('manual_verify_')) {
      const userId = customId.split('_')[2];
      
      // Only allow the owner of the button to use it
      if (interaction.user.id !== userId) {
        return await interaction.reply({ 
          content: 'Hindi mo pwedeng gamitin ang button na ito dahil hindi ito para sa iyo.',
          ephemeral: true
        });
      }
      
      await interaction.reply({ 
        content: 'Mag-upload ng screenshot ng pagshare mo ng invite link sa Telegram. I-send dito sa channel na ito para ma-verify ng admin.',
        ephemeral: true
      });
    }
  } catch (error) {
    console.error('Error handling interaction:', error);
  }
});

// Process messages in verification channel for manual verification (screenshots)
client.on(Events.MessageCreate, async (message) => {
  try {
    // Ignore bot messages
    if (message.author.bot) return;
    
    // Auto-reply to any message with the product link
    await handleAutoReply(message);
    
    // Only process verification messages in verification channel
    if (message.channel.id !== config.verificationChannelId) return;
    
    // Check if message has an image/screenshot
    const hasImage = message.attachments.size > 0 && 
      message.attachments.some(attachment => 
        attachment.contentType?.startsWith('image/'));
    
    if (hasImage) {
      // Get current share count for user
      const userId = message.author.id;
      const currentShares = userShares.get(userId) || 0;
      const newShareCount = currentShares + 1;
      
      // Check cooldown
      const lastShareTime = userCooldowns.get(userId) || 0;
      const now = Date.now();
      
      if (now - lastShareTime < config.cooldownTime) {
        const remainingTime = Math.ceil((config.cooldownTime - (now - lastShareTime)) / 1000);
        return await message.reply(`Masyado kang mabilis mag-share! Maghintay ka ng ${remainingTime} seconds bago mag-share ulit.`);
      }
      
      // Update share count
      userShares.set(userId, newShareCount);
      userCooldowns.set(userId, now);
      
      if (newShareCount >= config.requiredShares) {
        // User has met the requirement, give them access
        try {
          const member = message.guild.members.cache.get(userId);
          if (member) {
            try {
              // Add the verified role
              await member.roles.add(config.verifiedRoleId);
              
              // Send success message
              const successEmbed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('Verification Complete!')
                .setDescription(`Congratulations ${message.author.username}! Matagumpay kang na-verify at mayroon ka na ngayong full access sa server.`)
                .setTimestamp();
              
              await message.reply({ embeds: [successEmbed] });
              
              // Send welcome message to welcome channel
              const welcomeChannel = message.guild.channels.cache.get(config.welcomeChannelId);
              if (welcomeChannel) {
                await welcomeChannel.send(`Welcome sa server, <@${userId}>! Salamat sa pagtulong sa pag-grow ng community namin.`);
              }
            } catch (roleError) {
              console.error('Error adding role:', roleError);
              await message.reply('Error adding verified role. Please contact an admin.');
            }
          }
        } catch (error) {
          console.error('Error giving access to verified user:', error);
        }
      } else {
        // Update user on their progress
        const progressEmbed = new EmbedBuilder()
          .setColor(0xFFA500)
          .setTitle('Verification Progress')
          .setDescription(`Salamat ${message.author.username}! Naibahagi mo na ang aming server link ${newShareCount}/${config.requiredShares} beses.`)
          .addFields(
            { name: 'Natitira', value: `Ibahagi mo pa ng ${config.requiredShares - newShareCount} beses para ma-verify.` }
          )
          .setTimestamp();
        
        await message.reply({ embeds: [progressEmbed] });
      }
    }
  } catch (error) {
    console.error('Error processing message:', error);
  }
});

// Function to handle auto-reply with product link
async function handleAutoReply(message) {
  try {
    // Skip if message is in verification channel (to avoid conflict with verification process)
    if (message.channel.id === config.verificationChannelId) return;
    
    const userId = message.author.id;
    const now = Date.now();
    const lastMessageTime = messageCooldowns.get(userId) || 0;
    
    // Check if user is on cooldown
    if (now - lastMessageTime < MESSAGE_COOLDOWN) return;
    
    // Set cooldown for this user
    messageCooldowns.set(userId, now);
    
    // Reply with the product link
    await message.reply(`AVAIL KANA BABY 𝐕𝐈𝐏 𝐏𝐑𝐎𝐃𝐔𝐂𝐓 : 👉\n${config.telegramProductLink}`);
  } catch (error) {
    console.error('Error sending auto-reply:', error);
  }
}

// Admin commands for managing verification
client.on(Events.MessageCreate, async (message) => {
  try {
    // Ignore bot messages
    if (message.author.bot) return;
    
    // Only process commands from admins
    if (!message.member?.permissions.has(PermissionFlagsBits.Administrator)) return;
    
    if (message.content.startsWith('!verify')) {
      const mentionedUser = message.mentions.users.first();
      if (mentionedUser) {
        try {
          const member = message.guild.members.cache.get(mentionedUser.id);
          if (member) {
            await member.roles.add(config.verifiedRoleId);
            await message.reply(`Manually verified ang user: ${mentionedUser.username}`);
          }
        } catch (error) {
          console.error('Error manually verifying user:', error);
          await message.reply('Error verifying user. Please check roles and permissions.');
        }
      } else {
        await message.reply('Please mention a user to verify.');
      }
    }
    
    if (message.content === '!verification-status') {
      let statusMessage = '**Verification Status:**\n';
      for (const [userId, shareCount] of userShares.entries()) {
        try {
          const user = await client.users.fetch(userId).catch(() => null);
          if (user) {
            statusMessage += `${user.username}: ${shareCount}/${config.requiredShares} shares\n`;
          }
        } catch (error) {
          console.error('Error fetching user for status:', error);
        }
      }
      await message.reply(statusMessage || 'No verification data to display.');
    }
    
    if (message.content === '!verification-reset') {
      userShares.clear();
      userCooldowns.clear();
      await message.reply('Nareset na ang verification tracking.');
    }
    
    if (message.content.startsWith('!send-verification')) {
      const mentionedUser = message.mentions.users.first();
      if (mentionedUser) {
        try {
          const member = message.guild.members.cache.get(mentionedUser.id);
          if (member) {
            await sendVerificationMessage(member, message.channel);
            await message.reply(`Sent verification message to ${mentionedUser.username}`);
          }
        } catch (error) {
          console.error('Error sending verification message:', error);
          await message.reply('Error sending verification message.');
        }
      } else {
        await message.reply('Please mention a user to send the verification message to.');
      }
    }
    
    // New command to test the auto-reply
    if (message.content === '!test-autoreply') {
      await message.reply('Auto-reply test: Bot will now respond to the next message you send.');
    }
  } catch (error) {
    console.error('Error processing admin command:', error);
  }
});

// Reconnection handling
client.on('disconnect', () => {
  console.log('Bot disconnected. Attempting to reconnect...');
});

client.on('reconnecting', () => {
  console.log('Bot reconnecting...');
});

// Log in to Discord with client token
client.login(process.env.DISCORD_TOKEN).catch(error => {
  console.error('Failed to login to Discord:', error);
  process.exit(1); // Exit if we can't connect to Discord
});
