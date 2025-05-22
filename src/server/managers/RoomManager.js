const { v4: uuidv4 } = require('uuid');
const { socketErrorHandler } = require('../middleware/errorHandler');

class RoomManager {
  constructor(io) {
    this.io = io;
    this.rooms = new Map();
    this.userRooms = new Map(); // Maps user IDs to room IDs
    
    // Room settings
    this.settings = {
      maxPlayersPerRoom: 10,
      maxRoomsPerUser: 1,
      inactivityTimeout: 30 * 60 * 1000, // 30 minutes
      gameStartDelay: 3000, // 3 seconds
      teamBalanceThreshold: 1 // Maximum difference in team sizes
    };
    
    // Start cleanup interval
    this.startCleanupInterval();
  }
  
  startCleanupInterval() {
    setInterval(() => {
      this.cleanupInactiveRooms();
    }, 5 * 60 * 1000); // Check every 5 minutes
  }
  
  cleanupInactiveRooms() {
    const now = Date.now();
    for (const [roomId, room] of this.rooms) {
      if (now - room.lastActivity > this.settings.inactivityTimeout) {
        this.closeRoom(roomId, 'Room closed due to inactivity');
      }
    }
  }
  
  createRoom(socket, data) {
    try {
      const userId = socket.userId;
      
      // Check if user already has a room
      if (this.userRooms.get(userId)?.size >= this.settings.maxRoomsPerUser) {
        throw new Error('You have reached the maximum number of rooms');
      }
      
      const roomId = uuidv4();
      const room = {
        id: roomId,
        name: data.name,
        password: data.password || null,
        maxPlayers: Math.min(data.maxPlayers || 10, this.settings.maxPlayersPerRoom),
        type: data.type || 'normal',
        host: userId,
        players: new Map(),
        redTeam: new Set(),
        blueTeam: new Set(),
        spectators: new Set([userId]),
        gameInProgress: false,
        gameState: null,
        lastActivity: Date.now(),
        settings: {
          scoreLimit: data.scoreLimit || 3,
          timeLimit: data.timeLimit || 5 * 60, // 5 minutes
          teamLock: data.teamLock || false,
          allowSpectators: data.allowSpectators ?? true
        }
      };
      
      // Add player to room
      room.players.set(userId, {
        id: userId,
        nickname: socket.nickname,
        isHost: true,
        team: 'spectator',
        socket: socket
      });
      
      // Store room
      this.rooms.set(roomId, room);
      
      // Map user to room
      if (!this.userRooms.has(userId)) {
        this.userRooms.set(userId, new Set());
      }
      this.userRooms.get(userId).add(roomId);
      
      // Join socket room
      socket.join(roomId);
      
      // Notify client
      socket.emit('roomCreated', this.getRoomInfo(room));
      
      // Update room list for all clients
      this.broadcastRoomList();
      
      return room;
    } catch (error) {
      socketErrorHandler(socket, error);
    }
  }
  
  joinRoom(socket, data) {
    try {
      const { roomId, password } = data;
      const userId = socket.userId;
      const room = this.rooms.get(roomId);
      
      if (!room) {
        throw new Error('Room not found');
      }
      
      if (room.players.size >= room.maxPlayers) {
        throw new Error('Room is full');
      }
      
      if (room.password && room.password !== password) {
        throw new Error('Invalid password');
      }
      
      // Add player to room
      room.players.set(userId, {
        id: userId,
        nickname: socket.nickname,
        isHost: false,
        team: 'spectator',
        socket: socket
      });
      
      room.spectators.add(userId);
      room.lastActivity = Date.now();
      
      // Map user to room
      if (!this.userRooms.has(userId)) {
        this.userRooms.set(userId, new Set());
      }
      this.userRooms.get(userId).add(roomId);
      
      // Join socket room
      socket.join(roomId);
      
      // Notify all clients in room
      this.io.to(roomId).emit('playerJoined', {
        roomId,
        player: {
          id: userId,
          nickname: socket.nickname,
          team: 'spectator'
        }
      });
      
      // Send room info to joining player
      socket.emit('roomJoined', this.getRoomInfo(room));
      
      return room;
    } catch (error) {
      socketErrorHandler(socket, error);
    }
  }
  
  leaveRoom(socket, roomId) {
    try {
      const userId = socket.userId;
      const room = this.rooms.get(roomId);
      
      if (!room) return;
      
      // Remove player from room
      room.players.delete(userId);
      room.redTeam.delete(userId);
      room.blueTeam.delete(userId);
      room.spectators.delete(userId);
      room.lastActivity = Date.now();
      
      // Remove room mapping for user
      this.userRooms.get(userId)?.delete(roomId);
      if (this.userRooms.get(userId)?.size === 0) {
        this.userRooms.delete(userId);
      }
      
      // Leave socket room
      socket.leave(roomId);
      
      // If room is empty or host left, close it
      if (room.players.size === 0 || userId === room.host) {
        this.closeRoom(roomId, userId === room.host ? 'Host left the room' : 'Room is empty');
      } else {
        // Notify remaining players
        this.io.to(roomId).emit('playerLeft', {
          roomId,
          playerId: userId
        });
        
        // If game was in progress, end it
        if (room.gameInProgress) {
          this.endGame(roomId, 'Player left during game');
        }
      }
      
      // Update room list
      this.broadcastRoomList();
    } catch (error) {
      socketErrorHandler(socket, error);
    }
  }
  
  changeTeam(socket, data) {
    try {
      const { roomId, team } = data;
      const userId = socket.userId;
      const room = this.rooms.get(roomId);
      
      if (!room) {
        throw new Error('Room not found');
      }
      
      const player = room.players.get(userId);
      if (!player) {
        throw new Error('Player not found in room');
      }
      
      if (room.gameInProgress && room.settings.teamLock) {
        throw new Error('Cannot change team during game');
      }
      
      // Remove from current team
      room.redTeam.delete(userId);
      room.blueTeam.delete(userId);
      room.spectators.delete(userId);
      
      // Add to new team
      switch (team) {
        case 'red':
          if (this.isTeamBalanced(room, 'red')) {
            room.redTeam.add(userId);
            player.team = 'red';
          } else {
            throw new Error('Teams would be unbalanced');
          }
          break;
        case 'blue':
          if (this.isTeamBalanced(room, 'blue')) {
            room.blueTeam.add(userId);
            player.team = 'blue';
          } else {
            throw new Error('Teams would be unbalanced');
          }
          break;
        case 'spectator':
          if (room.settings.allowSpectators) {
            room.spectators.add(userId);
            player.team = 'spectator';
          } else {
            throw new Error('Spectators not allowed');
          }
          break;
        default:
          throw new Error('Invalid team');
      }
      
      room.lastActivity = Date.now();
      
      // Notify all players in room
      this.io.to(roomId).emit('teamChanged', {
        roomId,
        playerId: userId,
        team
      });
    } catch (error) {
      socketErrorHandler(socket, error);
    }
  }
  
  startGame(socket, roomId) {
    try {
      const userId = socket.userId;
      const room = this.rooms.get(roomId);
      
      if (!room) {
        throw new Error('Room not found');
      }
      
      if (userId !== room.host) {
        throw new Error('Only host can start the game');
      }
      
      if (room.gameInProgress) {
        throw new Error('Game already in progress');
      }
      
      if (room.redTeam.size === 0 || room.blueTeam.size === 0) {
        throw new Error('Need players in both teams');
      }
      
      // Notify players of game starting
      this.io.to(roomId).emit('gameStarting', {
        roomId,
        countdown: this.settings.gameStartDelay / 1000
      });
      
      // Start game after delay
      setTimeout(() => {
        room.gameInProgress = true;
        room.gameState = {
          startTime: Date.now(),
          score: { red: 0, blue: 0 },
          ballPosition: { x: room.width / 2, y: room.height / 2 },
          playerPositions: new Map()
        };
        
        this.io.to(roomId).emit('gameStarted', {
          roomId,
          gameState: room.gameState
        });
      }, this.settings.gameStartDelay);
      
      room.lastActivity = Date.now();
    } catch (error) {
      socketErrorHandler(socket, error);
    }
  }
  
  endGame(roomId, reason) {
    const room = this.rooms.get(roomId);
    if (!room || !room.gameInProgress) return;
    
    room.gameInProgress = false;
    room.gameState = null;
    room.lastActivity = Date.now();
    
    this.io.to(roomId).emit('gameEnded', {
      roomId,
      reason,
      finalScore: room.gameState?.score
    });
  }
  
  closeRoom(roomId, reason) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    
    // Notify all players
    this.io.to(roomId).emit('roomClosed', {
      roomId,
      reason
    });
    
    // Remove all players from room
    for (const [userId, player] of room.players) {
      player.socket.leave(roomId);
      this.userRooms.get(userId)?.delete(roomId);
      if (this.userRooms.get(userId)?.size === 0) {
        this.userRooms.delete(userId);
      }
    }
    
    // Delete room
    this.rooms.delete(roomId);
    
    // Update room list
    this.broadcastRoomList();
  }
  
  isTeamBalanced(room, targetTeam) {
    const redSize = targetTeam === 'red' ? room.redTeam.size + 1 : room.redTeam.size;
    const blueSize = targetTeam === 'blue' ? room.blueTeam.size + 1 : room.blueTeam.size;
    return Math.abs(redSize - blueSize) <= this.settings.teamBalanceThreshold;
  }
  
  getRoomInfo(room) {
    return {
      id: room.id,
      name: room.name,
      host: room.host,
      maxPlayers: room.maxPlayers,
      type: room.type,
      hasPassword: !!room.password,
      players: Array.from(room.players.values()).map(player => ({
        id: player.id,
        nickname: player.nickname,
        team: player.team,
        isHost: player.isHost
      })),
      redTeam: Array.from(room.redTeam),
      blueTeam: Array.from(room.blueTeam),
      spectators: Array.from(room.spectators),
      gameInProgress: room.gameInProgress,
      settings: room.settings
    };
  }
  
  broadcastRoomList() {
    const roomList = Array.from(this.rooms.values()).map(room => ({
      id: room.id,
      name: room.name,
      players: room.players.size,
      maxPlayers: room.maxPlayers,
      type: room.type,
      hasPassword: !!room.password,
      gameInProgress: room.gameInProgress
    }));
    
    this.io.emit('roomList', roomList);
  }
  
  handleDisconnect(socket) {
    const userId = socket.userId;
    const userRooms = this.userRooms.get(userId);
    
    if (userRooms) {
      for (const roomId of userRooms) {
        this.leaveRoom(socket, roomId);
      }
    }
  }
}

module.exports = RoomManager; 