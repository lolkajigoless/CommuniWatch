import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import { query } from './config/database.js';
import { authMiddleware } from './middleware/auth.js';
import { registerRoutes } from './routes/index.js';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/health', async (req, res) => {
  try {
    await query('SELECT 1');
    res.json({ ok: true, service: 'ComuniWatch API', db: 'connected' });
  } catch (error) {
    res.status(500).json({ ok: false, service: 'ComuniWatch API', db: 'disconnected', error: error.message });
  }
});

app.use('/api', registerRoutes(io));

app.use((req, res) => {
  res.status(404).json({ message: 'Rota não encontrada.' });
});

io.on('connection', (socket) => {
  console.log('Cliente conectado via Socket.IO', socket.id);

  socket.on('join-community', (communityId) => {
    socket.join(`community:${communityId}`);
  });

  socket.on('leave-community', (communityId) => {
    socket.leave(`community:${communityId}`);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`ComuniWatch API running on port ${PORT}`);
});
