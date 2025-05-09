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
  serverInviteLink: 'https://discord.gg/K5E9yRVr', // Ang server link mo
  requiredShares: 3, // Ilang beses kailangang ibahagi ng users ang link
  verificationChannelId: 'VERIFICATION_CHANNEL_ID', // Palitan mo ito ng ID ng verification channel mo
  verifiedRoleId: 'VERIFIED_ROLE_ID', // Palitan mo ito ng ID ng verified role mo
  welcomeChannelId: 'WELCOME_CHANNEL_ID' // Palitan mo ito ng ID ng welcome channel mo
};

// Database para i-track ang user shares (sa production app, gumamit ng proper database)
const userShares = new Map();

// Bot ready event
client.once(Events.ClientReady, () => {
  console.log(`Logged in as ${client.user.tag}`);
  console.log('Verification bot is ready!');
});

// Kapag may bagong miyembro na sumali sa server
client.on(Events.GuildMemberAdd, async (member) => {
  try {
    // Magpadala ng welcome message at instructions sa verification channel
    const verificationChannel = member.guild.channels.cache.get(config.verificationChannelId);
    
    if (verificationChannel) {
      const embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('Welcome sa Server!')
        .setDescription(`Welcome, ${member.user.username}! Para magkaroon ng full access sa server na ito, kailangan mong ibahagi ang invite link namin **${config.requiredShares} beses** sa iba.`)
        .addFields(
          { name: 'Mga Instructions', value: '1. Kopyahin ang server invite link sa ibaba\n2. Ibahagi ito sa mga kaibigan o sa ibang communities\n3. Magpadala ng screenshots ng iyong shares dito\n4. Kapag na-verify ka na, makakakuha ka na ng full access sa server!' },
          { name: 'Server Invite Link', value: config.serverInviteLink }
        )
        .setTimestamp();
      
      await verificationChannel.send({ content: `<@${member.id}>`, embeds: [embed] });
    }
    
    // I-initialize ang user sa tracking system
    userShares.set(member.id, 0);
    
  } catch (error) {
    console.error('Error sa pag-handle ng bagong miyembro:', error);
  }
});

// I-process ang mga messages sa verification channel
client.on(Events.MessageCreate, async (message) => {
  // I-ignore ang bot messages
  if (message.author.bot) return;
  
  // I-process lang ang mga messages sa verification channel
  if (message.channel.id !== config.verificationChannelId) return;
  
  // I-check kung may image/screenshot ang message
  const hasImage = message.attachments.size > 0 && 
    message.attachments.some(attachment => 
      attachment.contentType?.startsWith('image/'));
  
  // I-check kung ang message ay naglalaman ng server link o may image (screenshot)
  if (message.content.includes(config.serverInviteLink) || hasImage) {
    // Kunin ang current share count para sa user
    const userId = message.author.id;
    const currentShares = userShares.get(userId) || 0;
    const newShareCount = currentShares + 1;
    
    // I-update ang share count
    userShares.set(userId, newShareCount);
    
    if (newShareCount >= config.requiredShares) {
      // Natugunan na ng user ang requirement, bigyan siya ng access
      try {
        const member = message.guild.members.cache.get(userId);
        if (member) {
          // I-add ang verified role
          await member.roles.add(config.verifiedRoleId);
          
          // Magpadala ng success message
          const successEmbed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('Verification Complete!')
            .setDescription(`Congratulations ${message.author.username}! Matagumpay kang na-verify at mayroon ka na ngayong full access sa server.`)
            .setTimestamp();
          
          await message.reply({ embeds: [successEmbed] });
          
          // Magpadala ng welcome message sa welcome channel
          const welcomeChannel = message.guild.channels.cache.get(config.welcomeChannelId);
          if (welcomeChannel) {
            await welcomeChannel.send(`Welcome sa server, <@${userId}>! Salamat sa pagtulong sa pag-grow ng community namin.`);
          }
        }
      } catch (error) {
        console.error('Error sa pagbibigay ng access sa verified user:', error);
      }
    } else {
      // I-update ang user sa kanyang progress
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

// Admin commands para sa pag-manage ng verification (optional)
client.on(Events.MessageCreate, async (message) => {
  // I-process lang ang commands mula sa admins
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
        console.error('Error sa manual verification ng user:', error);
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
    await message.reply('Nareset na ang verification tracking.');
  }
});

// Log in sa Discord gamit ang client token
client.login(process.env.DISCORD_TOKEN);
