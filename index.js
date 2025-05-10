// Discord Verification Bot - Kailangan ibahagi ng users ang server link ng 3 beses
// Gumagamit ng Discord.js v14
const { Client, GatewayIntentBits, PermissionFlagsBits, Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');
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
  verificationChannelId: '1370259139153887252', // Palitan mo ito ng ID ng verification channel mo
  verifiedRoleId: '1370259899350782024', // Palitan mo ito ng ID ng verified role mo
  welcomeChannelId: '1370265673455898706', // Palitan mo ito ng ID ng welcome channel mo
  telegramLink: 'https://t.me/VlPcontentbot?startapp=Product' // Ang Telegram link mo
};

// Database file path
const DB_PATH = path.join(__dirname, 'user_shares.json');

// Load database or create if not exists
let userShares = {};
try {
  if (fs.existsSync(DB_PATH)) {
    const data = fs.readFileSync(DB_PATH, 'utf8');
    userShares = JSON.parse(data);
    console.log('Database loaded successfully');
  } else {
    // Create empty database file
    fs.writeFileSync(DB_PATH, JSON.stringify({}), 'utf8');
    console.log('New database file created');
  }
} catch (error) {
  console.error('Error loading database:', error);
}

// Function to save database
function saveDatabase() {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(userShares, null, 2), 'utf8');
  } catch (error) {
    console.error('Error saving database:', error);
  }
}

// Bot ready event
client.once(Events.ClientReady, () => {
  console.log(`Logged in as ${client.user.tag}`);
  console.log('Verification bot is ready!');
});

// Send VIP product message via DM instead of public reply
client.on(Events.MessageCreate, async (message) => {
  // Skip bot messages, verification channel messages, and DMs
  if (message.author.bot) return;
  if (message.channel.id === config.verificationChannelId) return;
  if (message.channel.type === 1) return; // Skip if already in DM to prevent loops
  
  try {
    // Create embed for DM
    const dmEmbed = new EmbedBuilder()
      .setColor(0xFF0099)
      .setTitle('𝐕𝐈𝐏 𝐏𝐑𝐎𝐃𝐔𝐂𝐓 𝐀𝐕𝐀𝐈𝐋𝐀𝐁𝐋𝐄!')
      .setDescription(`Hello ${message.author.username}! AVAIL KANA BABY 𝐕𝐈𝐏 𝐏𝐑𝐎𝐃𝐔𝐂𝐓!`)
      .setTimestamp();
    
    // Create VIP button for DM
    const dmRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setLabel('GET VIP ACCESS NOW')
          .setStyle(ButtonStyle.Success)
          .setURL(config.telegramLink)
      );
    
    // Send DM to user with embed and button
    await message.author.send({ 
      embeds: [dmEmbed],
      components: [dmRow]
    });
    
    // Store in database that we sent this user a DM to avoid spamming
    // We'll track the last time we sent a DM to this user
    userShares[`dm_${message.author.id}`] = Date.now();
    saveDatabase();
    
  } catch (error) {
    console.error('Error sending DM to user:', error);
    // Some users have DMs closed, we'll just ignore the error
  }
});

// Kapag may bagong miyembro na sumali sa server
client.on(Events.GuildMemberAdd, async (member) => {
  try {
    // Short message sa verification channel
    const verificationChannel = member.guild.channels.cache.get(config.verificationChannelId);
    
    if (verificationChannel) {
      await verificationChannel.send(`Welcome <@${member.id}>! Please check your DMs for verification instructions.`);
    }
    
    // Send detailed welcome and instructions via DM
    const embed = new EmbedBuilder()
      .setColor(0x0099FF)
      .setTitle('Welcome sa Server!')
      .setDescription(`Welcome, ${member.user.username}! Para magkaroon ng full access sa server na ito, kailangan mong ibahagi ang invite link namin **${config.requiredShares} beses** sa iba.`)
      .addFields(
        { name: 'Mga Instructions', value: '1. Kopyahin ang server invite link sa ibaba\n2. Ibahagi ito sa mga kaibigan o sa ibang communities\n3. Magpadala ng screenshots ng iyong shares sa verification channel\n4. Kapag na-verify ka na, makakakuha ka na ng full access sa server!' },
        { name: 'Server Invite Link', value: config.serverInviteLink },
        { name: 'VIP Product', value: `AVAIL KANA BABY 𝐕𝐈𝐏 𝐏𝐑𝐎𝐃𝐔𝐂𝐓 : 👉 ${config.telegramLink}` }
      )
      .setTimestamp();
    
    // Create buttons
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setLabel('Copy Invite Link')
          .setStyle(ButtonStyle.Primary)
          .setCustomId('copy_invite'),
        new ButtonBuilder()
          .setLabel('VIP Product')
          .setStyle(ButtonStyle.Success)
          .setURL(config.telegramLink)
      );
    
    try {
      await member.send({ 
        embeds: [embed],
        components: [row] 
      });
    } catch (error) {
      console.error('Error sending DM to new member:', error);
      // If DM fails, send full message in verification channel
      if (verificationChannel) {
        await verificationChannel.send({ 
          content: `<@${member.id}>`, 
          embeds: [embed],
          components: [row] 
        });
      }
    }
    
    // I-initialize ang user sa tracking system
    userShares[member.id] = 0;
    saveDatabase();
    
  } catch (error) {
    console.error('Error sa pag-handle ng bagong miyembro:', error);
  }
});

// Handle button interactions
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isButton()) return;
  
  if (interaction.customId === 'copy_invite') {
    await interaction.reply({
      content: `${config.serverInviteLink}`,
      ephemeral: true
    });
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
    const currentShares = userShares[userId] || 0;
    const newShareCount = currentShares + 1;
    
    // I-update ang share count
    userShares[userId] = newShareCount;
    
    // Send a DM to the user with VIP promotion
    try {
      // Create embed for DM
      const shareEmbed = new EmbedBuilder()
        .setColor(0xFF0099)
        .setTitle('Verification Progress')
        .setDescription(`Salamat ${message.author.username}! Naibahagi mo na ang aming server link ${newShareCount}/${config.requiredShares} beses.`)
        .addFields(
          { name: 'Natitira', value: `Ibahagi mo pa ng ${config.requiredShares - newShareCount} beses para ma-verify.` },
          { name: '𝐕𝐈𝐏 𝐏𝐑𝐎𝐃𝐔𝐂𝐓', value: `AVAIL KANA BABY 𝐕𝐈𝐏 𝐏𝐑𝐎𝐃𝐔𝐂𝐓 : 👉 ${config.telegramLink}` }
        )
        .setTimestamp();
      
      // Create buttons for DM
      const dmRow = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setLabel('Copy Invite Link')
            .setStyle(ButtonStyle.Primary)
            .setCustomId('copy_invite'),
          new ButtonBuilder()
            .setLabel('GET VIP ACCESS NOW')
            .setStyle(ButtonStyle.Success)
            .setURL(config.telegramLink)
        );
      
      await message.author.send({ 
        embeds: [shareEmbed],
        components: [dmRow]
      });
    } catch (error) {
      console.error('Error sending share verification DM:', error);
      // Some users have DMs closed, we'll just continue
    }
    
    saveDatabase();
    
    if (newShareCount >= config.requiredShares) {
      // Natugunan na ng user ang requirement, bigyan siya ng access
      try {
        const member = message.guild.members.cache.get(userId);
        if (member) {
          // I-add ang verified role
          await member.roles.add(config.verifiedRoleId);
          
                      // Magpadala ng success message sa DM
          const successEmbed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('Verification Complete!')
            .setDescription(`Congratulations ${message.author.username}! Matagumpay kang na-verify at mayroon ka na ngayong full access sa server.`)
            .addFields(
              { name: 'VIP Product', value: `AVAIL KANA BABY 𝐕𝐈𝐏 𝐏𝐑𝐎𝐃𝐔𝐂𝐓 : 👉 ${config.telegramLink}` }
            )
            .setTimestamp();
          
          // Create VIP button
          const row = new ActionRowBuilder()
            .addComponents(
              new ButtonBuilder()
                .setLabel('GET VIP ACCESS NOW')
                .setStyle(ButtonStyle.Success)
                .setURL(config.telegramLink)
            );
          
          // Send a brief confirmation in the channel
          await message.reply("✅ Verification complete! Check your DM for VIP access.");
          
          // Send detailed message via DM
          try {
            await message.author.send({ 
              embeds: [successEmbed],
              components: [row]
            });
          } catch (error) {
            console.error('Error sending success verification DM:', error);
            // If DM fails, send in channel instead
            await message.reply({ 
              embeds: [successEmbed],
              components: [row]
            });
          }
          
          // Magpadala ng welcome message sa welcome channel
          const welcomeChannel = message.guild.channels.cache.get(config.welcomeChannelId);
          if (welcomeChannel) {
            const welcomeEmbed = new EmbedBuilder()
              .setColor(0x00FF00)
              .setTitle('New Verified Member!')
              .setDescription(`Welcome sa server, <@${userId}>! Salamat sa pagtulong sa pag-grow ng community namin.`)
              .addFields(
                { name: 'VIP Product', value: `AVAIL KANA BABY 𝐕𝐈𝐏 𝐏𝐑𝐎𝐃𝐔𝐂𝐓 : 👉 ${config.telegramLink}` }
              );
            
            const welcomeRow = new ActionRowBuilder()
              .addComponents(
                new ButtonBuilder()
                  .setLabel('GET VIP ACCESS NOW')
                  .setStyle(ButtonStyle.Success)
                  .setURL(config.telegramLink)
              );
            
            await welcomeChannel.send({ 
              content: `<@${userId}>`,
              embeds: [welcomeEmbed],
              components: [welcomeRow]
            });
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
          { name: 'Natitira', value: `Ibahagi mo pa ng ${config.requiredShares - newShareCount} beses para ma-verify.` },
          { name: 'VIP Product', value: `AVAIL KANA BABY 𝐕𝐈𝐏 𝐏𝐑𝐎𝐃𝐔𝐂𝐓 : 👉 ${config.telegramLink}` }
        )
        .setTimestamp();
      
      // Create progress buttons
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setLabel('Copy Invite Link')
            .setStyle(ButtonStyle.Primary)
            .setCustomId('copy_invite'),
          new ButtonBuilder()
            .setLabel('GET VIP ACCESS')
            .setStyle(ButtonStyle.Success)
            .setURL(config.telegramLink)
        );
      
      // Send a brief confirmation in the channel
      await message.reply(`✅ Progress updated! (${newShareCount}/${config.requiredShares}) Check your DM for more details.`);
      
      // We already sent a DM in the earlier code block, so no need to send another one here
    }
  }
});

// Admin commands para sa pag-manage ng verification
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
          
          const adminVerifyEmbed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('Manual Verification')
            .setDescription(`Manually verified ang user: ${mentionedUser.username}`)
            .setTimestamp();
          
          await message.reply({ embeds: [adminVerifyEmbed] });
        }
      } catch (error) {
        console.error('Error sa manual verification ng user:', error);
      }
    }
  }
  
  if (message.content === '!verification-status') {
    let statusEmbed = new EmbedBuilder()
      .setColor(0x0099FF)
      .setTitle('Verification Status')
      .setTimestamp();
    
    let statusText = '';
    for (const [userId, shareCount] of Object.entries(userShares)) {
      try {
        const user = await client.users.fetch(userId).catch(() => null);
        if (user) {
          statusText += `${user.username}: ${shareCount}/${config.requiredShares} shares\n`;
        }
      } catch {
        // Skip user if can't fetch
      }
    }
    
    statusEmbed.setDescription(statusText || 'No verification data available.');
    await message.reply({ embeds: [statusEmbed] });
  }
  
  if (message.content === '!verification-reset') {
    userShares = {};
    saveDatabase();
    
    const resetEmbed = new EmbedBuilder()
      .setColor(0xFF0000)
      .setTitle('Verification Reset')
      .setDescription('Nareset na ang verification tracking.')
      .setTimestamp();
    
    await message.reply({ embeds: [resetEmbed] });
  }
});

// Add error handling for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Continue running the bot
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Continue running the bot
});

// Log in sa Discord gamit ang client token
client.login(process.env.DISCORD_TOKEN);
