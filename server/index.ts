import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

import { config } from './config.js';
import { logger } from './logger.js';
import { initializeDb, closeDb } from './db/index.js';

// Routes
import projectRoutes from './routes/projects.js';
import segmentRoutes from './routes/segments.js';
import translationRoutes from './routes/translation.js';
import glossaryRoutes from './routes/glossaries.js';
import audioRoutes from './routes/audio.js';
import configRoutes from './routes/config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const server = createServer(app);

// Socket.io setup
const io = new SocketIOServer(server, {
  cors: {
    origin: config.NODE_ENV === 'development' ? 'http://localhost:5173' : false,
    methods: ['GET', 'POST'],
  },
});

// Make io available to routes
app.set('io', io);

// Trust proxy for rate limiting behind reverse proxy
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: config.NODE_ENV === 'production' ? undefined : false,
}));
app.use(cors({
  origin: config.NODE_ENV === 'development' ? 'http://localhost:5173' : false,
}));
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW,
  max: config.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
    });
  });
  next();
});

// API Routes
app.use('/api/projects', projectRoutes);
app.use('/api/segments', segmentRoutes);
app.use('/api/translation', translationRoutes);
app.use('/api/glossaries', glossaryRoutes);
app.use('/api/audio', audioRoutes);
app.use('/api/config', configRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Serve frontend in production
if (config.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist/client')));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, '../dist/client/index.html'));
  });
}

// Error handling middleware
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error({ error: err.message, stack: err.stack });
  res.status(500).json({
    error: config.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);

  socket.on('join:project', (projectId: string) => {
    socket.join(`project:${projectId}`);
    logger.debug(`Client ${socket.id} joined project:${projectId}`);
  });

  socket.on('leave:project', (projectId: string) => {
    socket.leave(`project:${projectId}`);
    logger.debug(`Client ${socket.id} left project:${projectId}`);
  });

  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

// Graceful shutdown
function shutdown() {
  logger.info('Shutting down gracefully...');
  server.close(() => {
    closeDb();
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start server
async function start() {
  try {
    // Initialize database
    initializeDb();

    // Start listening
    server.listen(config.PORT, () => {
      logger.info(`TranslatePro server running on http://localhost:${config.PORT}`);
      logger.info(`Environment: ${config.NODE_ENV}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();

export { app, server, io };
