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
  requiredShares: 3, // How many times users need to share the link
  verificationChannelId: '1370259139153887252', // Replace with your verification channel ID
  verifiedRoleId: '1370259899350782024', // Replace with your verified role ID
  welcomeChannelId: '1370265673455898706', // Replace with your welcome channel ID
  cooldownTime: 60000 // Cooldown in milliseconds (1 minute) between shares to prevent spam
};

// Database to track user shares (in a production app, use a proper database)
const userShares = new Map();
const userCooldowns = new Map();

// Bot ready event
client.once(Events.ClientReady, () => {
  console.log(`Logged in as ${client.user.tag}`);
  console.log('Verification bot with Telegram sharing is ready!');
});

// When a new member joins the server
client.on(Events.GuildMemberAdd, async (member) => {
  try {
    // Send welcome message and instructions to verification channel
    const verificationChannel = member.guild.channels.cache.get(config.verificationChannelId);
    
    if (verificationChannel) {
      await sendVerificationMessage(member, verificationChannel);
    }
    
    // Initialize user in tracking system
    userShares.set(member.id, 0);
    
  } catch (error) {
    console.error('Error handling new member:', error);
  }
});

// Function to send verification message with buttons
async function sendVerificationMessage(member, channel) {
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
    await interaction.reply({ 
      content: 'May error na nangyari. Please try again.',
      ephemeral: true
    });
  }
}

// Handle button interactions
client.on(Events.InteractionCreate, async (interaction) => {
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
    
    await interaction.reply({ 
      content: `Salamat sa pag-share sa Telegram! Ina-update ang verification progress mo...`,
      ephemeral: true
    });
    
    // Update the verification progress
    await updateVerificationProgress(interaction, userId);
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
});

// Process messages in verification channel for manual verification (screenshots)
client.on(Events.MessageCreate, async (message) => {
  // Ignore bot messages
  if (message.author.bot) return;
  
  // Only process messages in verification channel
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
});

// Admin commands for managing verification
client.on(Events.MessageCreate, async (message) => {
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
      }
    }
  }
  
  if (message.content === '!verification-status') {
    let statusMessage = '**Verification Status:**\n';
    for (const [userId, shareCount] of userShares.entries()) {
      const user = await client.users.fetch(userId).catch(() => null);
      if (user) {
        statusMessage += `${user.username}: ${shareCount}/${config.requiredShares} shares\n`;
      }
    }
    await message.reply(statusMessage);
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
      }
    } else {
      await message.reply('Please mention a user to send the verification message to.');
    }
  }
});

// Log in to Discord with client token
client.login(process.env.DISCORD_TOKEN);
