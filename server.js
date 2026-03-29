const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static('.'));

// Game rooms
const rooms = new Map();

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Create a new room
    socket.on('createRoom', () => {
        const roomId = uuidv4().substring(0, 6).toUpperCase();
        rooms.set(roomId, {
            players: [socket.id],
            board: Array(9).fill(null),
            currentPlayer: 'X',
            gameOver: false,
            winner: null,
            scores: { X: 0, O: 0 }
        });
        socket.join(roomId);
        socket.emit('roomCreated', roomId);
        console.log(`Room ${roomId} created by ${socket.id}`);
    });

    // Join a room
    socket.on('joinRoom', (roomId) => {
        const room = rooms.get(roomId);
        if (!room) {
            socket.emit('error', 'Room not found');
            return;
        }
        if (room.players.length >= 2) {
            socket.emit('error', 'Room is full');
            return;
        }
        room.players.push(socket.id);
        socket.join(roomId);
        socket.emit('roomJoined', roomId);
        io.to(roomId).emit('gameStart', room);
        console.log(`${socket.id} joined room ${roomId}`);
    });

    // Make a move
    socket.on('makeMove', (data) => {
        const { roomId, index } = data;
        const room = rooms.get(roomId);
        if (!room || room.gameOver || room.board[index] !== null) return;

        const playerIndex = room.players.indexOf(socket.id);
        const playerSymbol = playerIndex === 0 ? 'X' : 'O';

        if (room.currentPlayer !== playerSymbol) return;

        room.board[index] = playerSymbol;
        const winner = checkWinner(room.board);
        if (winner) {
            room.gameOver = true;
            room.winner = winner;
            room.scores[winner]++;
        } else if (room.board.every(cell => cell !== null)) {
            room.gameOver = true;
        } else {
            room.currentPlayer = room.currentPlayer === 'X' ? 'O' : 'X';
        }

        io.to(roomId).emit('updateGame', room);
    });

    // Restart game
    socket.on('restartGame', (roomId) => {
        const room = rooms.get(roomId);
        if (!room) return;
        room.board = Array(9).fill(null);
        room.currentPlayer = 'X';
        room.gameOver = false;
        room.winner = null;
        io.to(roomId).emit('updateGame', room);
    });

    // Reset scores
    socket.on('resetScores', (roomId) => {
        const room = rooms.get(roomId);
        if (!room) return;
        room.scores = { X: 0, O: 0 };
        io.to(roomId).emit('updateGame', room);
    });

    // Disconnect
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        // Remove from rooms
        for (const [roomId, room] of rooms) {
            const index = room.players.indexOf(socket.id);
            if (index !== -1) {
                room.players.splice(index, 1);
                if (room.players.length === 0) {
                    rooms.delete(roomId);
                } else {
                    io.to(roomId).emit('playerDisconnected');
                }
                break;
            }
        }
    });
});

function checkWinner(board) {
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

server.listen(PORT, '0.0.0.0' , () => {
    console.log(`Server running on port ${PORT}`);
});