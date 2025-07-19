require('dotenv').config();
console.log("TOKEN carregado:", process.env.TOKEN ? "[OK]" : "[MISSING]");

const { Client, GatewayIntentBits, Partials } = require('discord.js');
const {
    handleUnoCommand,
    handlePlayCommand,
    handleDrawCommand,
    handleSkipCommand,
    handleMinigameCommand,
    handleMinigameAnswer,
    handleRankCommand
} = require('./commands');

// Inicializa o cliente do Discord
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ],
    partials: [Partials.Channel]
});

client.once('ready', () => {
    console.log(`Bot logged in as ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const content = message.content.trim();
    const [command, ...args] = content.split(/\s+/);

    switch (command.toLowerCase()) {
        case '/uno': return handleUnoCommand(message, args);
        case '/jogar': return handlePlayCommand(message, args);
        case '/comprar': return handleDrawCommand(message, args);
        case '/pular': return handleSkipCommand(message);
        case '/minijogo': return handleMinigameCommand(message, args);
        case '/rank': return handleRankCommand(message);
        default:
            if (await handleMinigameAnswer(message)) return;
            break;
    }
});

// Faz login com o token do .env
client.login(process.env.TOKEN)
    .then(() => console.log("Conectando ao Discord..."))
    .catch(err => {
        console.error("Falha ao fazer login:", err);
        process.exit(1);
    });
