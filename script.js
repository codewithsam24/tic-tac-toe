// script.js - Main JavaScript file for Tic Tac Toe

// Game state object
let gameState = {
    board: Array(9).fill(null), // 3x3 board, null means empty
    currentPlayer: 'X',
    scores: { X: 0, O: 0 },
    mode: null, // 'player' or 'ai' or 'online'
    difficulty: null, // 'easy', 'medium', 'hard'
    roomId: null,
    gameOver: false,
    winner: null,
    winningCells: null
};

// Global socket
let socket;

// Load game state from localStorage
function loadGameState() {
    const saved = localStorage.getItem('ticTacToeState');
    if (saved) {
        const parsed = JSON.parse(saved);
        gameState.scores = parsed.scores || { X: 0, O: 0 };
        gameState.mode = parsed.mode;
        gameState.difficulty = parsed.difficulty;
    }
}

// Save game state to localStorage
function saveGameState() {
    localStorage.setItem('ticTacToeState', JSON.stringify({
        scores: gameState.scores,
        mode: gameState.mode,
        difficulty: gameState.difficulty
    }));
}

// Initialize based on current page
document.addEventListener('DOMContentLoaded', function() {
    loadGameState();
    const currentPage = window.location.pathname.split('/').pop();

    if (currentPage === 'index.html' || currentPage === '') {
        initWelcomePage();
    } else if (currentPage === 'mode.html') {
        initModePage();
    } else if (currentPage === 'difficulty.html') {
        initDifficultyPage();
    } else if (currentPage === 'multiplayer.html') {
        initMultiplayerPage();
    } else if (currentPage === 'game.html') {
        initGamePage();
    }
});

// Welcome page initialization
function initWelcomePage() {
    const playBtn = document.getElementById('play-btn');
    if (playBtn) {
        playBtn.addEventListener('click', function() {
            window.location.href = 'mode.html';
        });
    }
}

// Mode selection page initialization
function initModePage() {
    const vsPlayerBtn = document.getElementById('vs-player-btn');
    const vsAiBtn = document.getElementById('vs-ai-btn');
    const onlineBtn = document.getElementById('online-btn');
    const backBtn = document.getElementById('back-btn');

    if (vsPlayerBtn) {
        vsPlayerBtn.addEventListener('click', function() {
            gameState.mode = 'player';
            saveGameState();
            window.location.href = 'game.html';
        });
    }

    if (vsAiBtn) {
        vsAiBtn.addEventListener('click', function() {
            window.location.href = 'difficulty.html';
        });
    }

    if (onlineBtn) {
        onlineBtn.addEventListener('click', function() {
            gameState.mode = 'online';
            saveGameState();
            window.location.href = 'multiplayer.html';
        });
    }

    if (backBtn) {
        backBtn.addEventListener('click', function() {
            window.location.href = 'index.html';
        });
    }
}

// Difficulty selection page initialization
function initDifficultyPage() {
    const easyBtn = document.getElementById('easy-btn');
    const mediumBtn = document.getElementById('medium-btn');
    const hardBtn = document.getElementById('hard-btn');
    const backBtn = document.getElementById('back-btn');

    const setDifficulty = (difficulty) => {
        gameState.mode = 'ai';
        gameState.difficulty = difficulty;
        saveGameState();
        window.location.href = 'game.html';
    };

    if (easyBtn) {
        easyBtn.addEventListener('click', () => setDifficulty('easy'));
    }

    if (mediumBtn) {
        mediumBtn.addEventListener('click', () => setDifficulty('medium'));
    }

    if (hardBtn) {
        hardBtn.addEventListener('click', () => setDifficulty('hard'));
    }

    if (backBtn) {
        backBtn.addEventListener('click', () => window.location.href = 'mode.html');
    }
}

// Multiplayer page initialization
function initMultiplayerPage() {
    socket = io();

    const createRoomBtn = document.getElementById('create-room-btn');
    const joinRoomBtn = document.getElementById('join-room-btn');
    const roomCodeInput = document.getElementById('room-code-input');
    const backBtn = document.getElementById('back-btn');
    const roomInfo = document.getElementById('room-info');

    socket.on('roomCreated', (roomId) => {
        gameState.roomId = roomId;
        roomInfo.textContent = `Room created: ${roomId}. Waiting for another player...`;
        // Wait for gameStart
    });

    socket.on('roomJoined', (roomId) => {
        gameState.roomId = roomId;
        roomInfo.textContent = `Joined room: ${roomId}. Game starting...`;
    });

    socket.on('gameStart', (room) => {
        // Update gameState with room data
        gameState.board = room.board;
        gameState.currentPlayer = room.currentPlayer;
        gameState.scores = room.scores;
        gameState.gameOver = room.gameOver;
        gameState.winner = room.winner;
        window.location.href = 'game.html';
    });

    socket.on('error', (message) => {
        roomInfo.textContent = `Error: ${message}`;
    });

    createRoomBtn.addEventListener('click', () => {
        socket.emit('createRoom');
    });

    joinRoomBtn.addEventListener('click', () => {
        const roomId = roomCodeInput.value.toUpperCase();
        if (roomId) {
            socket.emit('joinRoom', roomId);
        }
    });

    backBtn.addEventListener('click', () => {
        if (socket) socket.disconnect();
        window.location.href = 'mode.html';
    });
}

// Game page initialization
function initGamePage() {
    updateDisplay();
    const cells = document.querySelectorAll('.cell');
    cells.forEach(cell => {
        cell.addEventListener('click', handleCellClick);
    });

    document.getElementById('restart-btn').addEventListener('click', restartGame);
    document.getElementById('reset-btn').addEventListener('click', resetScores);
    document.getElementById('back-btn').addEventListener('click', () => {
        if (socket) socket.disconnect();
        window.location.href = 'mode.html';
    });

    if (gameState.mode === 'online') {
        if (!socket) socket = io();
        socket.emit('joinRoom', gameState.roomId); // Rejoin if needed

        socket.on('updateGame', (room) => {
            gameState.board = room.board;
            gameState.currentPlayer = room.currentPlayer;
            gameState.scores = room.scores;
            gameState.gameOver = room.gameOver;
            gameState.winner = room.winner;
            updateBoard();
            updateDisplay();
            if (gameState.winner) {
                highlightWinningCells();
                document.getElementById('message').textContent = `${gameState.winner} wins!`;
            } else if (gameState.gameOver) {
                document.getElementById('message').textContent = "It's a draw!";
            }
        });

        socket.on('playerDisconnected', () => {
            document.getElementById('message').textContent = 'Opponent disconnected. Game ended.';
            gameState.gameOver = true;
        });
    } else {
        resetGame();
    }
}

// Update display elements
function updateDisplay() {
    document.getElementById('mode-text').textContent = gameState.mode === 'player' ? 'Vs Player' : `Vs AI (${gameState.difficulty})`;
    document.getElementById('score-x').textContent = `X: ${gameState.scores.X}`;
    document.getElementById('score-o').textContent = `O: ${gameState.scores.O}`;
    document.getElementById('current-turn').textContent = gameState.currentPlayer;
    document.getElementById('message').textContent = '';
}

// Handle cell click
function handleCellClick(e) {
    if (gameState.gameOver) return;

    const index = parseInt(e.target.dataset.index);
    if (gameState.board[index] !== null) return;

    if (gameState.mode === 'online') {
        socket.emit('makeMove', { roomId: gameState.roomId, index });
    } else {
        makeMove(index);

        if (!gameState.gameOver && gameState.mode === 'ai' && gameState.currentPlayer === 'O') {
            setTimeout(aiMove, 500); // Delay for AI move
        }
    }
}

// Make a move
function makeMove(index) {
    gameState.board[index] = gameState.currentPlayer;
    updateBoard();
    playSound('move');

    const winner = checkWinner();
    if (winner) {
        gameState.gameOver = true;
        gameState.winner = winner;
        highlightWinningCells();
        gameState.scores[winner]++;
        updateDisplay();
        saveGameState();
        document.getElementById('message').textContent = `${winner} wins!`;
        playSound('win');
        return;
    }

    if (gameState.board.every(cell => cell !== null)) {
        gameState.gameOver = true;
        document.getElementById('message').textContent = "It's a draw!";
        playSound('draw');
        return;
    }

    switchTurn();
    updateDisplay();
}

// Update board display
function updateBoard() {
    const cells = document.querySelectorAll('.cell');
    cells.forEach((cell, index) => {
        cell.classList.remove('x', 'o', 'winning');
        if (gameState.board[index] === 'X') {
            cell.classList.add('x');
        } else if (gameState.board[index] === 'O') {
            cell.classList.add('o');
        }
    });
}

// Check for winner
function checkWinner() {
    const winPatterns = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
        [0, 4, 8], [2, 4, 6] // diagonals
    ];

    for (const pattern of winPatterns) {
        const [a, b, c] = pattern;
        if (gameState.board[a] && gameState.board[a] === gameState.board[b] && gameState.board[a] === gameState.board[c]) {
            gameState.winningCells = pattern;
            return gameState.board[a];
        }
    }
    return null;
}

// Highlight winning cells
function highlightWinningCells() {
    if (gameState.winningCells) {
        gameState.winningCells.forEach(index => {
            document.querySelector(`.cell[data-index="${index}"]`).classList.add('winning');
        });
    }
}

// Switch turn
function switchTurn() {
    gameState.currentPlayer = gameState.currentPlayer === 'X' ? 'O' : 'X';
}

// AI move
function aiMove() {
    if (gameState.gameOver) return;

    let move;
    if (gameState.difficulty === 'easy') {
        move = getRandomMove();
    } else if (gameState.difficulty === 'medium') {
        move = getBlockingMove() || getRandomMove();
    } else if (gameState.difficulty === 'hard') {
        move = getBestMove();
    }

    if (move !== undefined) {
        makeMove(move);
    }
}

// Get random empty cell
function getRandomMove() {
    const emptyCells = gameState.board.map((cell, index) => cell === null ? index : null).filter(index => index !== null);
    return emptyCells[Math.floor(Math.random() * emptyCells.length)];
}

// Get blocking move (medium AI)
function getBlockingMove() {
    // Check if AI can win
    for (let i = 0; i < 9; i++) {
        if (gameState.board[i] === null) {
            gameState.board[i] = 'O';
            if (checkWinner() === 'O') {
                gameState.board[i] = null;
                return i;
            }
            gameState.board[i] = null;
        }
    }
    // Check if need to block player
    for (let i = 0; i < 9; i++) {
        if (gameState.board[i] === null) {
            gameState.board[i] = 'X';
            if (checkWinner() === 'X') {
                gameState.board[i] = null;
                return i;
            }
            gameState.board[i] = null;
        }
    }
    return null;
}

// Get best move (hard AI) - simple minimax
function getBestMove() {
    let bestScore = -Infinity;
    let move;
    for (let i = 0; i < 9; i++) {
        if (gameState.board[i] === null) {
            gameState.board[i] = 'O';
            let score = minimax(gameState.board, 0, false);
            gameState.board[i] = null;
            if (score > bestScore) {
                bestScore = score;
                move = i;
            }
        }
    }
    return move;
}

function minimax(board, depth, isMaximizing) {
    const winner = checkWinnerForMinimax(board);
    if (winner === 'O') return 10 - depth;
    if (winner === 'X') return depth - 10;
    if (board.every(cell => cell !== null)) return 0;

    if (isMaximizing) {
        let bestScore = -Infinity;
        for (let i = 0; i < 9; i++) {
            if (board[i] === null) {
                board[i] = 'O';
                let score = minimax(board, depth + 1, false);
                board[i] = null;
                bestScore = Math.max(score, bestScore);
            }
        }
        return bestScore;
    } else {
        let bestScore = Infinity;
        for (let i = 0; i < 9; i++) {
            if (board[i] === null) {
                board[i] = 'X';
                let score = minimax(board, depth + 1, true);
                board[i] = null;
                bestScore = Math.min(score, bestScore);
            }
        }
        return bestScore;
    }
}

function checkWinnerForMinimax(board) {
    const winPatterns = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
    ];
    for (const pattern of winPatterns) {
        const [a, b, c] = pattern;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return board[a];
        }
    }
    return null;
}

// Restart game
function restartGame() {
    if (gameState.mode === 'online') {
        socket.emit('restartGame', gameState.roomId);
    } else {
        resetGame();
        updateDisplay();
    }
}

// Reset game state
function resetGame() {
    gameState.board = Array(9).fill(null);
    gameState.currentPlayer = 'X';
    gameState.gameOver = false;
    gameState.winner = null;
    gameState.winningCells = null;
    updateBoard();
}

// Reset scores
function resetScores() {
    if (gameState.mode === 'online') {
        socket.emit('resetScores', gameState.roomId);
    } else {
        gameState.scores = { X: 0, O: 0 };
        saveGameState();
        updateDisplay();
    }
}

// Play sound (optional)
function playSound(type) {
    // For now, just console log. Can add audio files later.
    console.log(`Playing ${type} sound`);
}