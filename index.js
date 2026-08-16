require('dotenv').config();
const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages
    ] 
});

client.commands = new Collection();
const commandsArray = [];

// Load Commands
const commandsPath = path.join(__dirname, 'commands');
if (!fs.existsSync(commandsPath)) fs.mkdirSync(commandsPath);

const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        commandsArray.push(command.data.toJSON());
    }
}

// Load Events
const eventsPath = path.join(__dirname, 'events');
if (!fs.existsSync(eventsPath)) fs.mkdirSync(eventsPath);

const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
    } else {
        client.on(event.name, (...args) => event.execute(...args, client));
    }
}

client.once('ready', async () => {
    console.log(`Bot giriş yaptı: ${client.user.tag}`);
    
    // Register Slash Commands
    if (process.env.BOT_TOKEN && process.env.CLIENT_ID && process.env.GUILD_ID) {
        const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);
        try {
            console.log('Slash komutları (/) yükleniyor...');
            await rest.put(
                Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
                { body: commandsArray },
            );
            console.log('Slash komutları başarıyla yüklendi.');
        } catch (error) {
            console.error('Komutlar yüklenirken hata oluştu:', error);
        }
    } else {
        console.log('Uyarı: .env dosyasında BOT_TOKEN, CLIENT_ID veya GUILD_ID eksik. Slash komutları yüklenemedi.');
    }
});

if (process.env.BOT_TOKEN && process.env.BOT_TOKEN !== 'YOUR_BOT_TOKEN_HERE') {
    client.login(process.env.BOT_TOKEN);
} else {
    console.log('Lütfen .env dosyasını yapılandırın ve BOT_TOKEN girin.');
}
