# Discord Verification Bot

Ang bot na ito ay ginawa para i-verify ang mga bagong miyembro sa pamamagitan ng pag-require sa kanila na ibahagi ang invite link ng server ng tatlong beses.

## Features

- Nag-retrack kung ilang beses ibinahagi ng bawat user ang server link
- Nagpapadala ng progress updates pagkatapos ng bawat verification
- May admin commands para sa manual verification at status checking
- Nag-aannounce ng newly verified members sa welcome channel

## Setup Instructions

### Mga Requirements
- Node.js 16.9.0 o mas bago
- Discord Bot Token

### Mga Hakbang sa Setup

1. I-clone ang repository:
```
git clone https://github.com/YOUR_USERNAME/discord-verification-bot.git
cd discord-verification-bot
```

2. I-install ang mga dependencies:
```
npm install
```

3. Gumawa ng `.env` file gamit ang template sa `.env.example`:
```
DISCORD_TOKEN=your_discord_bot_token_here
```

4. I-update ang configuration sa `index.js`:
```javascript
const config = {
  serverInviteLink: 'https://discord.gg/K5E9yRVr', // Palitan ng server link mo
  requiredShares: 3, // Ilang beses kailangang ibahagi
  verificationChannelId: 'VERIFICATION_CHANNEL_ID', // Palitan ng ID ng iyong verification channel
  verifiedRoleId: 'VERIFIED_ROLE_ID', // Palitan ng ID ng iyong verified role
  welcomeChannelId: 'WELCOME_CHANNEL_ID' // Palitan ng ID ng iyong welcome channel
};
```

5. Patakbuhin ang bot:
```
npm start
```

### Admin Commands

- `!verify @user` - Manual na pag-verify sa isang user
- `!verification-status` - Tingnan ang verification progress ng lahat ng users
- `!verification-reset` - I-reset ang lahat ng verification tracking

## Pag-deploy sa Railway

1. I-push ang repository sa GitHub
2. Gumawa ng account sa [Railway](https://railway.app/)
3. Gumawa ng bagong project at i-connect ang GitHub repository mo
4. I-set up ang environment variable:
   - Pangalan: `DISCORD_TOKEN`
   - Value: Ang bot token mo
5. Deploy!

## Paalala

- Ang bot ay gumagamit ng in-memory database (Map), na mare-reset kapag nag-restart ang bot
- Sa production environment, dapat gumamit ng proper database solution
