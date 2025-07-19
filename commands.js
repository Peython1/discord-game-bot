const { EmbedBuilder } = require('discord.js');
const { 
    triviaQuestions, 
    getUserData, 
    updateUserStats, 
    createUnoGame, 
    joinUnoGame, 
    startUnoGame, 
    formatCard, 
    formatHand, 
    canPlayCard, 
    unoGames, 
    activeMinigames, 
    userData 
} = require('./data');

// Comando: /uno
async function handleUnoCommand(message, args) {
    const channelId = message.channel.id;
    const userId = message.author.id;
    const game = unoGames.get(channelId);

    if (!args || args.length === 0) {
        // Criar jogo
        if (game) {
            return message.reply('❌ Já existe um jogo neste canal. Use `/uno entrar` ou `/uno iniciar`.');
        }
        createUnoGame(channelId, userId);
        const embed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('🎮 Novo Jogo de Uno!')
            .addFields(
                { name: '👍 Criador', value: message.author.username, inline: true },
                { name: '👥 Jogadores', value: '1/10', inline: true },
                { name: '🚀 Iniciar', value: '`/uno iniciar` (mínimo 2)', inline: true }
            );
        return message.reply({ embeds: [embed] });
    }

    const action = args[0].toLowerCase();
    if (action === 'entrar') {
        if (!game) return message.reply('❌ Nenhum jogo ativo. Use `/uno` para criar.');
        if (game.gameStarted) return message.reply('❌ Jogo já iniciado.');
        if (game.players.length >= 10) return message.reply('❌ Jogo lotado.');
        if (!joinUnoGame(channelId, userId)) {
            return message.reply('❌ Você já participa.');
        }
        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('✅ Novo Jogador')
            .setDescription(`${message.author.username} entrou!`)
            .addFields({ name: '👥 Jogadores', value: `${game.players.length}/10` });
        return message.reply({ embeds: [embed] });
    }
    if (action === 'iniciar') {
        if (!game) return message.reply('❌ Nenhum jogo ativo.');
        if (game.hostId !== userId) return message.reply('❌ Só o criador pode iniciar.');
        if (game.gameStarted) return message.reply('❌ Jogo já iniciado.');
        if (!startUnoGame(channelId)) {
            return message.reply('❌ Necessário pelo menos 2 jogadores.');
        }
        const top = game.discardPile.at(-1);
        const currentId = game.players[game.currentPlayer];
        const currentName = message.guild.members.cache.get(currentId)?.displayName || 'Jogador';
        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('🎯 Uno Iniciado')
            .addFields(
                { name: 'Topo', value: formatCard(top), inline: true },
                { name: 'Vez de', value: currentName, inline: true }
            );
        await message.channel.send({ embeds: [embed] });
        // Enviar mãos
        for (const pid of game.players) {
            try {
                const user = await message.client.users.fetch(pid);
                await user.send({ embeds: [ new EmbedBuilder()
                    .setTitle('🎴 Sua Mão')
                    .setDescription(formatHand(game.hands.get(pid)))
                ] });
            } catch {};
        }
        return;
    }
    return message.reply('❌ Uso: `/uno`, `/uno entrar`, `/uno iniciar`.');
}

// Comando: /jogar
async function handlePlayCommand(message, args) {
    const channelId = message.channel.id;
    const userId = message.author.id;
    const game = unoGames.get(channelId);
    if (!game?.gameStarted) return message.reply('❌ Nenhum jogo ativo.');
    if (game.players[game.currentPlayer] !== userId) return message.reply('❌ Não é sua vez.');
    const idx = parseInt(args?.[0]) - 1;
    const hand = game.hands.get(userId);
    if (isNaN(idx) || idx < 0 || idx >= hand.length) return message.reply('❌ Número inválido.');
    const card = hand[idx];
    const top = game.discardPile.at(-1);
    if (!canPlayCard(card, top, game.currentColor)) return message.reply('❌ Não pode jogar.');
    // Jogar
    hand.splice(idx, 1);
    game.discardPile.push(card);
    if (card.type !== 'wild') game.currentColor = card.color;
    // Atualizar turno/effects omitidos...
    const nextId = game.players[game.currentPlayer];
    const nextName = message.guild.members.cache.get(nextId)?.displayName || 'Jogador';
    await message.channel.send({ embeds: [ new EmbedBuilder()
        .setTitle('✅ Carta Jogada')
        .addFields(
            { name: 'Você', value: formatCard(card), inline: true },
            { name: 'Próximo', value: nextName, inline: true }
        )
    ] });
    try {
        const user = await message.client.users.fetch(userId);
        await user.send({ embeds: [ new EmbedBuilder()
            .setTitle('🎴 Sua Nova Mão')
            .setDescription(formatHand(hand))
        ] });
    } catch {};
}

// Comando: /comprar
async function handleDrawCommand(message) {
    const channelId = message.channel.id;
    const userId = message.author.id;
    const game = unoGames.get(channelId);
    if (!game?.gameStarted) return message.reply('❌ Nenhum jogo ativo.');
    if (game.players[game.currentPlayer] !== userId) return message.reply('❌ Não é sua vez.');
    if (!game.deck.length) return message.reply('❌ Baralho vazio.');
    const card = game.deck.pop();
    game.hands.get(userId).push(card);
    // Próximo
    game.currentPlayer = (game.currentPlayer + game.direction + game.players.length) % game.players.length;
    const nextName = message.guild.members.cache.get(game.players[game.currentPlayer])?.displayName || 'Jogador';
    await message.channel.send({ embeds: [ new EmbedBuilder()
        .setTitle('📥 Carta Comprada')
        .addFields(
            { name: 'Você', value: formatCard(card), inline: true },
            { name: 'Próximo', value: nextName, inline: true }
        )
    ] });
    try {
        const user = await message.client.users.fetch(userId);
        await user.send({ embeds: [ new EmbedBuilder()
            .setTitle('🎴 Sua Mão Atual')
            .setDescription(formatHand(game.hands.get(userId)))
        ] });
    } catch {};
}

// Comando: /pular
function handleSkipCommand(message) {
    return message.reply('❌ Use `/jogar <n>` ou `/comprar`.');
}

// Comando: /minijogo
function handleMinigameCommand(message) {
    // Lógica em data.js
}

// Respostas mini-jogo
async function handleMinigameAnswer(message) {
    // Lógica em data.js
    return false;
}

// Comando: /rank
function handleRankCommand(message) {
    const all = Array.from(userData.entries()).map(([id,d])=>({id,...d}));
    if (!all.length) return message.reply('❌ Sem dados.');
    const sorted = all.sort((a,b)=>b.totalPoints-a.totalPoints).slice(0,10);
    const desc = sorted.map((u,i)=>`${i+1}. <@${u.id}> — ${u.totalPoints} pts`).join('\n');
    return message.reply({ embeds: [ new EmbedBuilder().setTitle('🏆 Ranking').setDescription(desc) ] });
}

module.exports = {
    handleUnoCommand,
    handlePlayCommand,
    handleDrawCommand,
    handleSkipCommand,
    handleMinigameCommand,
    handleMinigameAnswer,
    handleRankCommand
};
