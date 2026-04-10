const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const PORT = process.env.PORT || 5000;

// Set up server for Socket.io
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Root endpoint
app.get('/', (req, res) => {
  res.send('FreedomSpeech API Backend with WebSockets is actively running!');
});

// Basic health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'FreedomSpeech backend with WebSockets is running' });
});

// Real-time WebSocket handlers
io.on('connection', (socket) => {
  console.log(`🔌 New client connected: ${socket.id}`);

  // Join a specific community/room
  socket.on('join_room', (groupId) => {
    socket.join(groupId);
    console.log(`👤 Client ${socket.id} joined room: ${groupId}`);
  });

  // Global group updates (for sidebar)
  socket.on('group_update', () => {
    socket.broadcast.emit('groups_changed');
  });

  // Specific room updates
  socket.on('new_post', (groupId) => {
    // Ping all users in this specific group to refetch posts
    socket.to(groupId).emit('refresh_posts');
  });

  socket.on('new_reaction', (groupId) => {
    socket.to(groupId).emit('refresh_posts');
  });

  socket.on('disconnect', () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Socket.IO + Express Server running on port ${PORT}`);
});
