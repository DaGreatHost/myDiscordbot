// Discord Verification Bot - Kailangan ibahagi ng users ang server link ng 3 beses
// Gumagamit ng Discord.js v14
const { Client, GatewayIntentBits, PermissionFlagsBits, Events, EmbedBuilder } = require('discord.js');
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
  requiredShares: 3, // Number of times users need to share the link
  verificationChannelId: 'VERIFICATION_CHANNEL_ID', // Replace with your verification channel ID
  verifiedRoleId: 'VERIFIED_ROLE_ID', // Replace with your verified role ID
  welcomeChannelId: 'WELCOME_CHANNEL_ID' // Replace with your welcome channel ID
};

// Database to track user shares (in a production app, use a proper database)
const userShares = new Map();

// Bot ready event
client.once(Events.ClientReady, () => {
  console.log(`Logged in as ${client.user.tag}`);
  console.log('Verification bot is ready!');
});

// When a new member joins the server
client.on(Events.GuildMemberAdd, async (member) => {
  try {
    // Send welcome message and instructions to the verification channel
    const verificationChannel = member.guild.channels.cache.get(config.verificationChannelId);
    
    if (verificationChannel) {
      const embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('Welcome to the Server!')
        .setDescription(`Welcome, ${member.user.username}! To gain access to this server, you need to share our invite link **${config.requiredShares} times** with others.`)
        .addFields(
          { name: 'Instructions', value: '1. Copy the server invite link below\n2. Share it with friends or in communities\n3. Send screenshots of your shares here\n4. Once verified, you\'ll get access to the full server!' },
          { name: 'Server Invite Link', value: config.serverInviteLink }
        )
        .setTimestamp();
      
      await verificationChannel.send({ content: `<@${member.id}>`, embeds: [embed] });
    }
    
    // Initialize user in the tracking system
    userShares.set(member.id, 0);
    
  } catch (error) {
    console.error('Error handling new member:', error);
  }
});

// Process messages in verification channel
client.on(Events.MessageCreate, async (message) => {
  // Ignore bot messages
  if (message.author.bot) return;
  
  // Only process messages in the verification channel
  if (message.channel.id !== config.verificationChannelId) return;
  
  // Check if the message has an image/screenshot
  const hasImage = message.attachments.size > 0 && 
    message.attachments.some(attachment => 
      attachment.contentType?.startsWith('image/'));
  
  // Check if message contains server link or has an image (screenshot)
  if (message.content.includes(config.serverInviteLink) || hasImage) {
    // Get current share count for the user
    const userId = message.author.id;
    const currentShares = userShares.get(userId) || 0;
    const newShareCount = currentShares + 1;
    
    // Update share count
    userShares.set(userId, newShareCount);
    
    if (newShareCount >= config.requiredShares) {
      // User has met the requirement, grant them access
      try {
        const member = message.guild.members.cache.get(userId);
        if (member) {
          // Add verified role
          await member.roles.add(config.verifiedRoleId);
          
          // Send success message
          const successEmbed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('Verification Complete!')
            .setDescription(`Congratulations ${message.author.username}! You've successfully verified and now have access to the full server.`)
            .setTimestamp();
          
          await message.reply({ embeds: [successEmbed] });
          
          // Send welcome message in the welcome channel
          const welcomeChannel = message.guild.channels.cache.get(config.welcomeChannelId);
          if (welcomeChannel) {
            await welcomeChannel.send(`Welcome to the server, <@${userId}>! Thanks for helping our community grow.`);
          }
        }
      } catch (error) {
        console.error('Error granting access to verified user:', error);
      }
    } else {
      // Update user on their progress
      const progressEmbed = new EmbedBuilder()
        .setColor(0xFFA500)
        .setTitle('Verification Progress')
        .setDescription(`Thank you ${message.author.username}! You've shared our server link ${newShareCount}/${config.requiredShares} times.`)
        .addFields(
          { name: 'Remaining', value: `Share ${config.requiredShares - newShareCount} more times to get verified.` }
        )
        .setTimestamp();
      
      await message.reply({ embeds: [progressEmbed] });
    }
  }
});

// Admin commands for managing verification (optional)
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
          await message.reply(`Manually verified user: ${mentionedUser.username}`);
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
    await message.reply('Verification tracking has been reset.');
  }
});

// Log in to Discord with your client's token
client.login(process.env.DISCORD_TOKEN);
