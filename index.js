// Discord Verification Bot - With Telegram Sharing
// Using Discord.js v14
// Last Updated: 2025-05-20 03:10:16 UTC
// Updated by: DaGreatHost

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
  telegramProductLink: 'https://t.me/availvip1bot?startapp=AvailNow', // Product link to share when users chat
  requiredShares: 3, // How many times users need to share the link
  verificationChannelId: '1370259139153887252', // Replace with your verification channel ID
  verifiedRoleId: '1370259899350782024', // Replace with your verified role ID
  welcomeChannelId: '1370265673455898706', // Replace with your welcome channel ID
  cooldownTime: 60000 // Cooldown in milliseconds (1 minute) between shares to prevent spam
};

// Database tracking systems
const userShares = new Map();
const userCooldowns = new Map();
const hasReceivedVIP = new Map(); // Track users who have received the VIP link
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
  console.log(`Bot started at: 2025-05-20 03:10:16 UTC`);
  console.log(`Updated by: DaGreatHost`);
  
  // Set bot activity
  client.user.setActivity('Verifying Members', { type: 'WATCHING' });
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

// Modified handleAutoReply function for one-time VIP message
async function handleAutoReply(message) {
  try {
    // Skip if message is in verification channel
    if (message.channel.id === config.verificationChannelId) return;
    
    const userId = message.author.id;
    
    // Check if user has already received the VIP link
    if (hasReceivedVIP.get(userId)) return;
    
    // Set that this user has received the VIP link
    hasReceivedVIP.set(userId, true);
    
    // Reply with the product link (only sent once per user)
    await message.reply(`AVAIL KANA BABY 𝐕𝐈𝐏 𝐏𝐑𝐎𝐃𝐔𝐂𝐓 : 👉\n${config.telegramProductLink}`);
  } catch (error) {
    console.error('Error sending auto-reply:', error);
  }
}

// Update progress for a user
async function updateVerificationProgress(interaction, userId) {
  try {
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
      const member = interaction.guild.members.cache.get(userId);
      if (member) {
        try {
          await member.roles.add(config.verifiedRoleId);
          
          const successEmbed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('Verification Complete!')
            .setDescription(`Congratulations ${member.user.username}! Matagumpay kang na-verify at mayroon ka na ngayong full access sa server.`)
            .setTimestamp();
          
          await interaction.update({ 
            embeds: [successEmbed],
            components: []
          });
          
          const welcomeChannel = interaction.guild.channels.cache.get(config.welcomeChannelId);
          if (welcomeChannel) {
            await welcomeChannel.send(`Welcome sa server, <@${userId}>! Salamat sa pagtulong sa pag-grow ng community namin.`);
          }
        } catch (roleError) {
          console.error('Error adding role:', roleError);
          await interaction.followUp({ 
            content: 'Error adding verified role. Please contact an admin.',
            ephemeral: true
          });
        }
      }
    } else {
      const progressEmbed = new EmbedBuilder()
        .setColor(0xFFA500)
        .setTitle('Verification Progress')
        .setDescription(`Salamat ${interaction.user.username}! Naibahagi mo na ang aming server link ${newShareCount}/${config.requiredShares} beses.`)
        .addFields(
          { name: 'Natitira', value: `Ibahagi mo pa ng ${config.requiredShares - newShareCount} beses para ma-verify.` }
        )
        .setTimestamp();
      
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

// Admin commands for managing verification and VIP status
client.on(Events.MessageCreate, async (message) => {
  try {
    if (message.author.bot) return;
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
      hasReceivedVIP.clear();
      await message.reply('Nareset na ang verification tracking at VIP message tracking.');
    }
    
    if (message.content === '!vip-status') {
      let statusMessage = '**Users who received VIP message:**\n';
      for (const [userId, received] of hasReceivedVIP.entries()) {
        try {
          const user = await client.users.fetch(userId).catch(() => null);
          if (user) {
            statusMessage += `${user.username}: Received\n`;
          }
        } catch (error) {
          console.error('Error fetching user for VIP status:', error);
        }
      }
      await message.reply(statusMessage || 'No VIP message data to display.');
    }
    
    if (message.content.startsWith('!reset-vip')) {
      const mentionedUser = message.mentions.users.first();
      if (mentionedUser) {
        hasReceivedVIP.delete(mentionedUser.id);
        await message.reply(`Reset VIP message status for ${mentionedUser.username}`);
      } else {
        await message.reply('Please mention a user to reset their VIP message status.');
      }
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
  } catch (error) {
    console.error('Error processing admin command:', error);
  }
});

// Event handlers
client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (!interaction.isButton()) return;
    
    const customId = interaction.customId;
    
    if (customId.startsWith('share_confirm_')) {
      const userId = customId.split('_')[2];
      
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
        
        await updateVerificationProgress(interaction, userId);
      } catch (error) {
        console.error('Error handling share confirmation:', error);
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
    
    if (customId.startsWith('manual_verify_')) {
      const userId = customId.split('_')[2];
      
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

// Process messages for manual verification and auto-reply
client.on(Events.MessageCreate, async (message) => {
  try {
    if (message.author.bot) return;
    
    await handleAutoReply(message);
    
    if (message.channel.id !== config.verificationChannelId) return;
    
    const hasImage = message.attachments.size > 0 && 
      message.attachments.some(attachment => 
        attachment.contentType?.startsWith('image/'));
    
    if (hasImage) {
      const userId = message.author.id;
      const currentShares = userShares.get(userId) || 0;
      const newShareCount = currentShares + 1;
      
      const lastShareTime = userCooldowns.get(userId) || 0;
      const now = Date.now();
      
      if (now - lastShareTime < config.cooldownTime) {
        const remainingTime = Math.ceil((config.cooldownTime - (now - lastShareTime)) / 1000);
        return await message.reply(`Masyado kang mabilis mag-share! Maghintay ka ng ${remainingTime} seconds bago mag-share ulit.`);
      }
      
      userShares.set(userId, newShareCount);
      userCooldowns.set(userId, now);
      
      if (newShareCount >= config.requiredShares) {
        try {
          const member = message.guild.members.cache.get(userId);
          if (member) {
            try {
              await member.roles.add(config.verifiedRoleId);
              
              const successEmbed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('Verification Complete!')
                .setDescription(`Congratulations ${message.author.username}! Matagumpay kang na-verify at mayroon ka na ngayong full access sa server.`)
                .setTimestamp();
              
              await message.reply({ embeds: [successEmbed] });
              
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
  process.exit(1);
});
