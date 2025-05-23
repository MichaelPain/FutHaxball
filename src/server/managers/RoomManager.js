// const { v4: uuidv4 } = require('uuid'); // uuid is now used within Room.js
const { socketErrorHandler } = require('../middleware/errorHandler');
const { Room } = require('../game/Room.js'); // Import the new Room class
const config = require('../config'); // Import the centralized config

class RoomManager {
  constructor(io) {
    this.io = io;
    this.rooms = new Map(); // Will store Room instances: Map<roomId, Room>
    this.userRooms = new Map(); // Maps user IDs to a Set of room IDs they are in

    // Use centralized settings
    this.settings = config.roomManagerSettings;

    this.startCleanupInterval();
  }

  startCleanupInterval() {
    setInterval(() => {
      this.cleanupInactiveRooms();
    }, 5 * 60 * 1000); // Check every 5 minutes. Consider making this interval configurable too.
  }

  cleanupInactiveRooms() {
    const now = Date.now();
    for (const [roomId, room] of this.rooms) {
      // Use the new key name for inactivityTimeoutMs
      if (now - room.lastActivity > this.settings.inactivityTimeoutMs) {
        console.log(`Room ${roomId} timed out due to inactivity.`);
        this.closeRoom(roomId, 'Room closed due to inactivity');
      }
    }
  }

  createRoom(socket, data) {
    try {
      const userId = socket.userId; // Assuming socket.userId is set by auth middleware
      const userNickname = socket.nickname; // Assuming socket.nickname is set

      if (!userId || !userNickname) {
        throw new Error('User ID or nickname not found on socket.');
      }
      
      if ((this.userRooms.get(userId)?.size || 0) >= this.settings.maxRoomsPerUser) {
        throw new Error('You have reached the maximum number of rooms you can create or join.');
      }

      // Pass relevant global defaults from this.settings (which is config.roomManagerSettings)
      // to the Room constructor if client data doesn't specify them.
      // Room.js's constructor should prioritize client data (data.*) then room manager defaults.
      const roomSpecificSettingsFromClient = {
        scoreLimit: data.scoreLimit,
        timeLimit: data.timeLimit,
        teamLock: data.teamLock,
        allowSpectators: data.allowSpectators,
        // These now come from global config by default if not in data, Room will handle defaults
        teamBalanceThreshold: data.teamBalanceThreshold || this.settings.teamBalanceThreshold, 
        gameStartDelay: data.gameStartDelay || this.settings.gameStartDelayMs,
      };
      
      const newRoom = new Room(
        data.name,
        data.password || null,
        // Use maxPlayersPerRoom from centralized settings
        Math.min(data.maxPlayers || this.settings.maxPlayersPerRoom, this.settings.maxPlayersPerRoom),
        data.type || 'standard',
        userId,
        userNickname,
        socket, // Pass the host's socket to the Room constructor
        roomSpecificSettingsFromClient, // Pass the composed settings
        this.io // Pass the main io instance to the Room
      );

      this.rooms.set(newRoom.id, newRoom);

      if (!this.userRooms.has(userId)) {
        this.userRooms.set(userId, new Set());
      }
      this.userRooms.get(userId).add(newRoom.id);
      
      // Room constructor handles socket.join(newRoom.id) and emitting 'room_joined' or similar
      // socket.emit('roomCreated', newRoom.getRoomInfo(true)); // Room constructor should emit this or 'room_joined'
      
      console.log(`RoomManager: Room ${newRoom.name} (ID: ${newRoom.id}) created by ${userNickname}.`);
      this.broadcastRoomList();
      
      return newRoom.getRoomInfo(true); // Or just newRoom.id
    } catch (error) {
      socketErrorHandler(socket, error);
      return null; // Indicate failure
    }
  }

  joinRoom(socket, data) {
    try {
      const { roomId, password } = data;
      const userId = socket.userId;
      const userNickname = socket.nickname;
      const room = this.rooms.get(roomId);

      if (!room) {
        throw new Error('Room not found');
      }
      if (room.players.has(userId)) {
         // Player is already in the room, Room.addPlayer handles rejoining/socket update
         console.log(`Player ${userNickname} attempting to rejoin room ${roomId}.`);
      } else if ((this.userRooms.get(userId)?.size || 0) >= this.settings.maxRoomsPerUser) {
        throw new Error('You have reached the maximum number of rooms you can join.');
      }

      if (room.password && room.password !== password) {
        throw new Error('Invalid password');
      }
      
      // Delegate to Room instance
      const joined = room.addPlayer(socket, userId, userNickname);

      if (joined) {
        if (!this.userRooms.has(userId)) {
          this.userRooms.set(userId, new Set());
        }
        this.userRooms.get(userId).add(roomId);
        // room.addPlayer should handle emitting 'playerJoined' and sending 'roomJoined' to the player
        console.log(`RoomManager: Player ${userNickname} successfully joined room ${room.name}.`);
        // this.broadcastRoomList(); // Room's broadcastPlayerList might be sufficient if it changes player count
      } else {
        // addPlayer should have emitted an error to the client
        console.warn(`RoomManager: Player ${userNickname} failed to join room ${room.name}.`);
      }
      return joined ? room.getRoomInfo() : null;
    } catch (error) {
      socketErrorHandler(socket, error);
      return null;
    }
  }

  leaveRoom(socket, roomId) {
    try {
      const userId = socket.userId;
      const userNickname = socket.nickname; // For logging
      const room = this.rooms.get(roomId);

      if (!room) {
        console.warn(`RoomManager: Attempt to leave non-existent room ${roomId} by ${userNickname}.`);
        return;
      }
      
      const result = room.removePlayer(userId); // This will handle socket.leave and broadcasts

      if (result) {
        this.userRooms.get(userId)?.delete(roomId);
        if (this.userRooms.get(userId)?.size === 0) {
          this.userRooms.delete(userId);
        }
        console.log(`RoomManager: Player ${userNickname} left room ${roomId}.`);

        if (result === 'empty' || (userId === room.host && room.players.size === 0) ) { 
          // Room handles host change if players remain. If it becomes empty, close it.
          console.log(`RoomManager: Room ${roomId} is now empty or host left and empty, closing.`);
          this.closeRoom(roomId, userId === room.host ? 'Host left and room became empty' : 'Room is empty');
        } else if (userId === room.host) {
            // Host left, but players remain. Room.removePlayer should have assigned a new host.
            console.log(`RoomManager: Host ${userNickname} left room ${roomId}. New host assigned by Room instance.`);
            this.broadcastRoomList(); // Update if host change affects listing
        } else {
            // Player left, room still active
             this.broadcastRoomList(); // Update player count
        }
      } else {
         console.warn(`RoomManager: Player ${userNickname} failed to be removed from room ${roomId} (perhaps not in it).`);
      }
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
      if (!room.players.has(userId)) {
        throw new Error('Player not found in this room.');
      }
      
      // Delegate to Room instance. The Room's method will handle logic and broadcasting.
      // Room's changePlayerTeam uses its own settings for teamLock, balance, etc.
      const changed = room.changePlayerTeam(userId, team);
      if (changed) {
        console.log(`RoomManager: Player ${socket.nickname} changed team to ${team} in room ${roomId}.`);
      } else {
        // Error should have been emitted by Room.changePlayerTeam to the socket
         console.warn(`RoomManager: Player ${socket.nickname} failed to change team in room ${roomId}.`);
      }
    } catch (error) {
      // Room.changePlayerTeam should emit errors to the socket directly.
      // This catch is for unexpected RoomManager errors.
      socketErrorHandler(socket, error);
    }
  }

  updateRoomSettings(socket, data) {
    try {
        const { roomId, settings } = data;
        const userId = socket.userId;
        const room = this.rooms.get(roomId);

        if (!room) {
            throw new Error('Room not found');
        }
        if (room.host !== userId) {
            throw new Error('Only the host can update room settings.');
        }

        const success = room.updateSettings(settings);
        if (success) {
            console.log(`RoomManager: Settings updated for room ${roomId} by host ${socket.nickname}.`);
            // Room.updateSettings broadcasts the changes.
        } else {
            throw new Error('Failed to update room settings.');
        }
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
      if (room.host !== userId) {
        throw new Error('Only the host can start the game.');
      }
      
      // Delegate to Room instance. Room.startGame will handle logic and broadcasts.
      const started = room.startGame();
      if (started) {
          console.log(`RoomManager: Game start initiated for room ${roomId} by host ${socket.nickname}.`);
          this.broadcastRoomList(); // Update gameInProgress status
      } else {
          // Error/reason should have been broadcast by room.startGame()
          console.warn(`RoomManager: Game start failed for room ${roomId}.`);
      }
    } catch (error) {
      // Room.startGame should emit errors to the socket/room directly.
      socketErrorHandler(socket, error);
    }
  }

  // endGame might be called by RoomManager (e.g. admin action) or by the Room itself (e.g. game timer ends)
  endGame(roomId, reason) {
    const room = this.rooms.get(roomId);
    if (!room) {
        console.warn(`RoomManager: Attempt to end game in non-existent room ${roomId}.`);
        return;
    }
    
    const ended = room.endGame(reason);
    if (ended) {
        console.log(`RoomManager: Game ended in room ${roomId}. Reason: ${reason}`);
        this.broadcastRoomList(); // Update gameInProgress status
    } else {
        // console.warn(`RoomManager: Call to endGame for room ${roomId} did nothing (game might not have been in progress).`);
    }
  }

  closeRoom(roomId, reason) {
    const room = this.rooms.get(roomId);
    if (!room) {
      console.warn(`RoomManager: Attempt to close non-existent room ${roomId}.`);
      return;
    }

    console.log(`RoomManager: Closing room ${roomId}. Reason: ${reason}`);
    // Notify all players in the room and make them leave the socket.io room
    room.destroy(reason); 

    // Remove user associations for this room
    room.players.forEach(player => {
        if (this.userRooms.has(player.id)) {
            this.userRooms.get(player.id).delete(roomId);
            if (this.userRooms.get(player.id).size === 0) {
                this.userRooms.delete(player.id);
            }
        }
    });
    
    this.rooms.delete(roomId);
    this.broadcastRoomList();
    console.log(`RoomManager: Room ${roomId} closed and removed.`);
  }

  // isTeamBalanced is now a concern of the Room class.

  getRoomInfo(roomId) { // Primarily for external requests for a single room's details
    const room = this.rooms.get(roomId);
    if (!room) {
      // Optional: throw new Error('Room not found');
      return null;
    }
    return room.getRoomInfo(true); // Pass true if sensitive info can be included for certain contexts
  }

  listRooms() { // For broadcasting the list of available rooms
    return Array.from(this.rooms.values()).map(room => {
        // Use a summary from Room instance or construct here
        const basicInfo = room.getRoomInfo(); // This gets general info
        return {
            id: basicInfo.id,
            name: basicInfo.name,
            players: basicInfo.playerCount,
            maxPlayers: basicInfo.maxPlayers,
            type: basicInfo.type,
            hasPassword: basicInfo.hasPassword,
            gameInProgress: basicInfo.gameInProgress,
            // Potentially add hostNickname here if needed for the list
            // hostNickname: basicInfo.hostNickname 
        };
    });
  }
  
  broadcastRoomList() {
    this.io.emit('roomList', this.listRooms());
  }

  handleDisconnect(socket) {
    const userId = socket.userId;
    const userNickname = socket.nickname; // For logging
    const roomIdsUserIsIn = this.userRooms.get(userId);

    if (roomIdsUserIsIn) {
      // Create a copy of the set to iterate over, as leaveRoom can modify it
      const roomIdsToLeave = new Set(roomIdsUserIsIn); 
      console.log(`RoomManager: Player ${userNickname} (ID: ${userId}) disconnected. Leaving rooms: ${Array.from(roomIdsToLeave).join(', ')}`);
      for (const roomId of roomIdsToLeave) {
        this.leaveRoom(socket, roomId); // leaveRoom handles cleanup and broadcasts
      }
    } else {
        // console.log(`RoomManager: Player ${userNickname} (ID: ${userId}) disconnected, was not in any tracked rooms.`);
    }
  }
}

module.exports = RoomManager;