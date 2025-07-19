// Sistema de dados simples em memória
const userData = new Map();
const unoGames = new Map();
const activeMinigames = new Map();

// Cartas do Uno
const colors = ['🔴', '🟡', '🟢', '🔵'];
const numbers = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
const specialCards = ['Pular', 'Inverter', '+2'];
const wildCards = ['Coringa', '+4'];

// Criar baralho completo
function createDeck() {
    const deck = [];
    
    // Cartas numeradas e especiais coloridas
    colors.forEach(color => {
        // Carta 0 (apenas uma de cada cor)
        deck.push({ color, value: '0', type: 'number' });
        
        // Cartas 1-9 (duas de cada)
        for (let i = 1; i <= 9; i++) {
            deck.push({ color, value: i.toString(), type: 'number' });
            deck.push({ color, value: i.toString(), type: 'number' });
        }
        
        // Cartas especiais (duas de cada)
        specialCards.forEach(special => {
            deck.push({ color, value: special, type: 'special' });
            deck.push({ color, value: special, type: 'special' });
        });
    });
    
    // Cartas coringa (4 de cada)
    wildCards.forEach(wild => {
        for (let i = 0; i < 4; i++) {
            deck.push({ color: '⚫', value: wild, type: 'wild' });
        }
    });
    
    return shuffleDeck(deck);
}

// Embaralhar baralho
function shuffleDeck(deck) {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Perguntas para mini-jogos
const triviaQuestions = [
    {
        question: "Qual é a capital do Brasil?",
        options: ["A) São Paulo", "B) Rio de Janeiro", "C) Brasília", "D) Salvador"],
        correct: "C"
    },
    {
        question: "Quantos planetas existem no sistema solar?",
        options: ["A) 7", "B) 8", "C) 9", "D) 10"],
        correct: "B"
    },
    {
        question: "Qual é o maior oceano do mundo?",
        options: ["A) Atlântico", "B) Índico", "C) Ártico", "D) Pacífico"],
        correct: "D"
    },
    {
        question: "Em que ano o homem pisou na Lua pela primeira vez?",
        options: ["A) 1967", "B) 1969", "C) 1971", "D) 1973"],
        correct: "B"
    },
    {
        question: "Qual é o elemento químico representado pela letra 'O'?",
        options: ["A) Ouro", "B) Oxigênio", "C) Ósmio", "D) Ozônio"],
        correct: "B"
    }
];

// Funções para gerenciar dados do usuário
function getUserData(userId) {
    if (!userData.has(userId)) {
        userData.set(userId, {
            unoWins: 0,
            unoLosses: 0,
            minigameScore: 0,
            gamesPlayed: 0,
            totalPoints: 0
        });
    }
    return userData.get(userId);
}

function updateUserStats(userId, gameType, won = false, points = 0) {
    const user = getUserData(userId);
    user.gamesPlayed++;
    user.totalPoints += points;
    
    if (gameType === 'uno') {
        if (won) {
            user.unoWins++;
            user.totalPoints += 50; // Bônus por vitória no Uno
        } else {
            user.unoLosses++;
        }
    } else if (gameType === 'minigame') {
        user.minigameScore += points;
    }
    
    userData.set(userId, user);
}

// Funções do Uno
function createUnoGame(channelId, hostId) {
    const deck = createDeck();
    const topCard = deck.pop();
    
    const game = {
        channelId,
        hostId,
        players: [hostId],
        deck,
        discardPile: [topCard],
        currentPlayer: 0,
        direction: 1, // 1 = horário, -1 = anti-horário
        currentColor: topCard.color,
        hands: new Map(),
        gameStarted: false,
        drawCount: 0 // Para cartas +2 e +4
    };
    
    unoGames.set(channelId, game);
    return game;
}

function joinUnoGame(channelId, playerId) {
    const game = unoGames.get(channelId);
    if (!game || game.gameStarted) return false;
    
    if (!game.players.includes(playerId)) {
        game.players.push(playerId);
        return true;
    }
    return false;
}

function startUnoGame(channelId) {
    const game = unoGames.get(channelId);
    if (!game || game.players.length < 2) return false;
    
    // Distribuir 7 cartas para cada jogador
    game.players.forEach(playerId => {
        const hand = [];
        for (let i = 0; i < 7; i++) {
            if (game.deck.length > 0) {
                hand.push(game.deck.pop());
            }
        }
        game.hands.set(playerId, hand);
    });
    
    game.gameStarted = true;
    return true;
}

function formatCard(card) {
    if (card.type === 'wild') {
        return `${card.color} ${card.value}`;
    }
    return `${card.color} ${card.value}`;
}

function formatHand(hand) {
    return hand.map((card, index) => `${index + 1}. ${formatCard(card)}`).join('\n');
}

function canPlayCard(card, topCard, currentColor) {
    if (card.type === 'wild') return true;
    if (card.color === currentColor) return true;
    if (card.value === topCard.value && card.type === topCard.type) return true;
    return false;
}

module.exports = {
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
    createDeck,
    shuffleDeck
};

