// server.js - Server principale per il clone di HaxBall

const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const compression = require('compression');
const helmet = require('helmet');
const morgan = require('morgan');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

// Import managers and services
const RoomManager = require('./managers/RoomManager');
const GeoLocationService = require('./services/GeoLocationService');
const CountryDetector = require('./services/CountryDetector');
const RegionManager = require('./services/RegionManager');
const QualificationPathway = require('./services/QualificationPathway');
const backupService = require('./services/BackupService');

// Import controllers
const authController = require('./controllers/authController');
const matchmakingController = require('./controllers/matchmakingController');
const rankingController = require('./controllers/rankingController');
const tournamentController = require('./controllers/tournamentController');
const eventController = require('./controllers/eventController');
const geoChampionshipController = require('./controllers/geoChampionshipController');
const multiStageController = require('./controllers/multiStageController');
const adminController = require('./controllers/adminController');

// Import routes
const apiRoutes = require('./routes/api');
const adminRoutes = require('./routes/adminRoutes');

// Import error handling
const { 
  errorHandler, 
  catchAsync, 
  createRateLimiter,
  socketErrorHandler,
  AuthenticationError 
} = require('./middleware/errorHandler');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: process.env.CLIENT_URL || '*',
    methods: ['GET', 'POST']
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/haxball-clone', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

// Initialize services
const geoLocationService = new GeoLocationService({
  apiKey: process.env.GEOLOCATION_API_KEY
});

const countryDetector = new CountryDetector({
  geoLocationService,
  defaultCountry: 'IT'
});

const regionManager = new RegionManager({
  geoLocationService
});

const qualificationPathway = new QualificationPathway({
  regionManager,
  tournamentManager: tournamentController
});

// Initialize room manager
const roomManager = new RoomManager(io);

// Schedule daily backups
const scheduleBackups = () => {
  // Run backup every day at 2 AM
  const backupInterval = 24 * 60 * 60 * 1000; // 24 hours
  const now = new Date();
  const nextBackup = new Date(now);
  nextBackup.setHours(2, 0, 0, 0);
  if (nextBackup < now) {
    nextBackup.setDate(nextBackup.getDate() + 1);
  }
  
  const timeUntilBackup = nextBackup - now;
  
  setTimeout(async () => {
    try {
      await backupService.createBackup();
      await backupService.cleanupOldBackups();
    } catch (error) {
      console.error('Scheduled backup failed:', error);
    }
    scheduleBackups(); // Schedule next backup
  }, timeUntilBackup);
};

// Start backup scheduling
scheduleBackups();

// Add backup endpoints
app.post('/api/admin/backup', async (req, res) => {
  try {
    const backupPath = await backupService.createBackup();
    res.json({ success: true, backupPath });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/admin/backups', async (req, res) => {
  try {
    const backups = await backupService.listBackups();
    res.json({ success: true, backups });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/admin/backup/restore/:backupName', async (req, res) => {
  try {
    const backupPath = path.join(backupService.backupDir, req.params.backupName);
    await backupService.restoreBackup(backupPath);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/admin/backup/:backupName', async (req, res) => {
  try {
    const backupPath = path.join(backupService.backupDir, req.params.backupName);
    await backupService.deleteBackup(backupPath);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'wss:', 'ws:']
    }
  }
}));

// Rate limiting
const apiLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

const authLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // limit each IP to 5 failed requests per hour
  message: 'Too many failed login attempts, please try again after an hour'
});

// General middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(compression());
app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, '../client')));

// Add services to request object
app.use((req, res, next) => {
  req.geoLocationService = geoLocationService;
  req.countryDetector = countryDetector;
  req.regionManager = regionManager;
  req.qualificationPathway = qualificationPathway;
  next();
});

// API routes with rate limiting
app.use('/api', apiLimiter, apiRoutes);
app.use('/api/auth', authLimiter, authController.router);
app.use('/api/admin', apiLimiter, adminRoutes);

// Socket.IO authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new AuthenticationError('Authentication required'));
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    socket.nickname = decoded.nickname;
    next();
  } catch (err) {
    next(new AuthenticationError('Invalid token'));
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`New client connected: ${socket.id}`);
  
  // Room events
  socket.on('createRoom', (data) => roomManager.createRoom(socket, data));
  socket.on('joinRoom', (data) => roomManager.joinRoom(socket, data));
  socket.on('leaveRoom', (roomId) => roomManager.leaveRoom(socket, roomId));
  socket.on('changeTeam', (data) => roomManager.changeTeam(socket, data));
  socket.on('startGame', (roomId) => roomManager.startGame(socket, roomId));
  
  // Game events
  socket.on('playerMove', (data) => {
    const room = roomManager.rooms.get(data.roomId);
    if (room?.gameInProgress) {
      socket.to(data.roomId).emit('playerMoved', {
        playerId: socket.userId,
        position: data.position,
        velocity: data.velocity
      });
    }
  });
  
  socket.on('ballKick', (data) => {
    const room = roomManager.rooms.get(data.roomId);
    if (room?.gameInProgress) {
      socket.to(data.roomId).emit('ballKicked', {
        playerId: socket.userId,
        ballData: data.ballData
      });
    }
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
    roomManager.handleDisconnect(socket);
  });
  
  // Error handling
  socket.on('error', (error) => {
    socketErrorHandler(socket, error);
  });
});

// Error handling middleware
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
