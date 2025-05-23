// src/server/game/Room.js
import { v4 as uuidv4 } from 'uuid';

const DEFAULT_TEAM_BALANCE_THRESHOLD = 1;
const DEFAULT_GAME_START_DELAY = 5000; // 5 seconds
const MAX_TEAM_SIZE = 3; // Example, should be configurable

export class Room {
    constructor(name, password, maxPlayers, type, hostId, hostNickname, hostSocket, roomSettings, ioInstance) {
        this.id = uuidv4();
        this.name = name;
        this.password = password; // null if no password
        this.maxPlayers = maxPlayers || 6;
        this.type = type || 'standard'; // e.g., 'standard', 'ranked'
        this.host = hostId;
        this.io = ioInstance; // Socket.IO server instance

        this.players = new Map(); // Map<userId, {id, nickname, isHost, team, socket, joinedAt}>
        this.redTeam = new Set(); // Set<userId>
        this.blueTeam = new Set(); // Set<userId>
        this.spectators = new Set(); // Set<userId>

        this.gameInProgress = false;
        this.gameState = {
            score: { red: 0, blue: 0 },
            timeRemaining: null, // or some initial value based on settings
            ballPosition: { x: 0, y: 0 }, // Example
            // other game-specific state
        };
        this.lastActivity = Date.now();
        this.settings = {
            scoreLimit: roomSettings?.scoreLimit || 5,
            timeLimit: roomSettings?.timeLimit || (3 * 60 * 1000), // 3 minutes in ms
            teamLock: roomSettings?.teamLock || false, // Players can't switch teams if true
            allowSpectators: roomSettings?.allowSpectators !== undefined ? roomSettings.allowSpectators : true,
            teamBalanceThreshold: roomSettings?.teamBalanceThreshold || DEFAULT_TEAM_BALANCE_THRESHOLD,
            gameStartDelay: roomSettings?.gameStartDelay || DEFAULT_GAME_START_DELAY,
            // ... other settings
        };

        // Add the host player
        if (hostId && hostSocket) {
            this.addPlayer(hostSocket, hostId, hostNickname, true);
        }
        console.log(`Room created: ${this.name} (ID: ${this.id}) by host ${hostNickname} (${hostId})`);
    }

    updateActivity() {
        this.lastActivity = Date.now();
    }

    addPlayer(socket, userId, nickname, isHost = false) {
        if (this.players.size >= this.maxPlayers) {
            socket.emit('room_join_error', { message: 'Room is full.' });
            return false;
        }
        if (this.players.has(userId)) {
            // Player is already in the room, maybe update socket or re-assign team
            const existingPlayer = this.players.get(userId);
            existingPlayer.socket = socket; // Update socket
            socket.join(this.id); // Ensure they are in the socket room
            socket.emit('room_joined', this.getRoomInfo());
            this.broadcastPlayerList();
            console.log(`Player ${nickname} (${userId}) reconnected to room ${this.id}`);
            return true;
        }

        const player = {
            id: userId,
            nickname,
            isHost,
            team: null, // Assign team later or by default
            socket,
            joinedAt: Date.now(),
        };
        this.players.set(userId, player);
        socket.join(this.id); // Join the socket.io room for this room's broadcasts

        // Assign to a team or spectators
        this.assignPlayerToDefaultTeam(userId);

        this.updateActivity();
        socket.emit('room_joined', this.getRoomInfo());
        this.broadcast('player_joined', player.nickname); // Or more detailed info
        this.broadcastPlayerList();
        console.log(`Player ${nickname} (${userId}) joined room ${this.id}`);
        return true;
    }

    removePlayer(userId) {
        const player = this.players.get(userId);
        if (!player) return false;

        // Leave the socket.io room
        if (player.socket) {
            player.socket.leave(this.id);
        }

        // Remove from teams/spectators
        this.redTeam.delete(userId);
        this.blueTeam.delete(userId);
        this.spectators.delete(userId);
        this.players.delete(userId);

        this.updateActivity();
        this.broadcast('player_left', player.nickname); // Or more detailed info
        this.broadcastPlayerList();
        console.log(`Player ${player.nickname} (${userId}) left room ${this.id}`);

        if (this.players.size === 0) {
            // Room is empty, should be handled by RoomManager for cleanup
            this.io.emit('room_empty', this.id); // Notify RoomManager or handle directly
            return 'empty'; // Signal to RoomManager
        }

        if (userId === this.host) {
            this.assignNewHost();
        }
        return true;
    }
    
    assignPlayerToDefaultTeam(userId) {
        const player = this.players.get(userId);
        if (!player) return;

        if (!this.settings.allowSpectators && (this.redTeam.size >= MAX_TEAM_SIZE && this.blueTeam.size >= MAX_TEAM_SIZE)) {
             // If spectators are not allowed and teams are full, something is wrong or player can't join.
             // For now, this logic is simplified. Ideally, check before adding player.
             console.warn(`Cannot assign ${player.nickname} to any team: teams full and spectators not allowed.`);
             // Potentially remove player if they can't be assigned.
             this.removePlayer(userId);
             player.socket.emit('room_join_error', {message: "Teams are full and spectators are not allowed."});
             return;
        }

        if (this.settings.allowSpectators && (this.redTeam.size >= MAX_TEAM_SIZE && this.blueTeam.size >= MAX_TEAM_SIZE)) {
            this.spectators.add(userId);
            player.team = 'spectator';
        } else if (this.redTeam.size <= this.blueTeam.size && this.redTeam.size < MAX_TEAM_SIZE) {
            this.redTeam.add(userId);
            player.team = 'red';
        } else if (this.blueTeam.size < MAX_TEAM_SIZE) {
            this.blueTeam.add(userId);
            player.team = 'blue';
        } else if (this.settings.allowSpectators) { // Fallback to spectators if teams are full
            this.spectators.add(userId);
            player.team = 'spectator';
        } else {
            // Should not happen if maxPlayers is respected and MAX_TEAM_SIZE relates to maxPlayers
            console.error("Could not assign player to any team and spectators not allowed or also full.");
            // This case might require kicking the player or more complex logic
            this.removePlayer(userId);
            player.socket.emit('room_join_error', {message: "Failed to assign to a team."});
        }
    }


    assignNewHost() {
        if (this.players.size > 0) {
            // Assign to the player who joined earliest, or some other logic
            const newHostPlayer = this.players.values().next().value; // Simplistic: first player in map
            if (newHostPlayer) {
                this.host = newHostPlayer.id;
                newHostPlayer.isHost = true;
                this.players.set(newHostPlayer.id, newHostPlayer); // Update player object
                this.broadcast('host_changed', { newHostId: this.host, newHostNickname: newHostPlayer.nickname });
                console.log(`Host changed to ${newHostPlayer.nickname} in room ${this.id}`);
            }
        } else {
            this.host = null; // No one to be host
            console.log(`Room ${this.id} has no players left to assign host.`);
        }
    }

    changePlayerTeam(userId, newTeam) {
        const player = this.players.get(userId);
        if (!player) return false;
        if (this.settings.teamLock && this.gameInProgress) { // Or just teamLock always
            player.socket.emit('team_change_error', { message: 'Teams are locked.' });
            return false;
        }

        const oldTeam = player.team;
        if (oldTeam === newTeam) return true; // No change

        // Check team balance and size constraints
        if (newTeam === 'red' && this.redTeam.size >= MAX_TEAM_SIZE) {
            player.socket.emit('team_change_error', { message: 'Red team is full.' });
            return false;
        }
        if (newTeam === 'blue' && this.blueTeam.size >= MAX_TEAM_SIZE) {
            player.socket.emit('team_change_error', { message: 'Blue team is full.' });
            return false;
        }
        
        // Simple balance: prevent stacking if difference is too large
        // More complex balancing would use this.settings.teamBalanceThreshold
        if (newTeam === 'red' && (this.redTeam.size + 1 > this.blueTeam.size + this.settings.teamBalanceThreshold)) {
             player.socket.emit('team_change_error', { message: 'Red team would become too unbalanced.' });
            return false;
        }
        if (newTeam === 'blue' && (this.blueTeam.size + 1 > this.redTeam.size + this.settings.teamBalanceThreshold)) {
            player.socket.emit('team_change_error', { message: 'Blue team would become too unbalanced.' });
            return false;
        }


        // Remove from old team
        if (oldTeam === 'red') this.redTeam.delete(userId);
        else if (oldTeam === 'blue') this.blueTeam.delete(userId);
        else if (oldTeam === 'spectator') this.spectators.delete(userId);

        // Add to new team
        player.team = newTeam;
        if (newTeam === 'red') this.redTeam.add(userId);
        else if (newTeam === 'blue') this.blueTeam.add(userId);
        else if (newTeam === 'spectator') {
            if (!this.settings.allowSpectators) {
                player.socket.emit('team_change_error', { message: 'Spectators are not allowed in this room.' });
                // Revert to old team or assign to a default team if possible
                player.team = oldTeam; // simplistic revert
                if (oldTeam === 'red') this.redTeam.add(userId); else if (oldTeam === 'blue') this.blueTeam.add(userId);
                return false;
            }
            this.spectators.add(userId);
        }
        
        this.updateActivity();
        this.broadcastPlayerList();
        this.broadcast('player_team_changed', { userId, nickname: player.nickname, newTeam });
        console.log(`Player ${player.nickname} changed to team ${newTeam} in room ${this.id}`);
        return true;
    }

    setHost(newHostId) {
        const oldHost = this.players.get(this.host);
        const newHost = this.players.get(newHostId);

        if (!newHost) return false;

        if (oldHost) {
            oldHost.isHost = false;
        }
        newHost.isHost = true;
        this.host = newHostId;
        
        this.updateActivity();
        this.broadcast('host_changed', { newHostId: this.host, newHostNickname: newHost.nickname });
        this.broadcastPlayerList(); // Player list also contains host info
        return true;
    }

    startGame() {
        if (this.gameInProgress) {
            // Maybe emit an error to the host trying to start
            console.warn(`Room ${this.id}: Attempted to start game already in progress.`);
            return false;
        }
        // Check if teams are ready (e.g., enough players per team)
        if (this.redTeam.size === 0 || this.blueTeam.size === 0) {
            this.broadcast('game_start_error', {message: "Not enough players on each team to start."});
            console.log(`Room ${this.id}: Game start failed, not enough players.`);
            return false;
        }

        this.gameInProgress = true;
        this.gameState.score = { red: 0, blue: 0 }; // Reset score
        this.gameState.timeRemaining = this.settings.timeLimit;
        // ... other game state initializations

        this.updateActivity();
        this.broadcast('game_starting', { delay: this.settings.gameStartDelay });
        console.log(`Room ${this.id}: Game starting in ${this.settings.gameStartDelay}ms`);

        setTimeout(() => {
            if (!this.gameInProgress) return; // Game might have been cancelled during delay
            this.broadcast('game_started', this.getRoomInfo()); // Send full room info with game state
            console.log(`Room ${this.id}: Game started!`);
            // TODO: Start game timer, physics, etc.
        }, this.settings.gameStartDelay);
        return true;
    }

    endGame(reason = 'ended') {
        if (!this.gameInProgress) return false;
        this.gameInProgress = false;
        // TODO: Log final scores, update player stats, etc.
        
        this.updateActivity();
        this.broadcast('game_ended', { reason, finalGameState: this.gameState });
        console.log(`Room ${this.id}: Game ended. Reason: ${reason}`);
        // After game ends, players might be able to change teams if teamLock was on
        return true;
    }
    
    updateSettings(newSettings) {
        // Only allow host to update settings, RoomManager should verify this
        this.settings = { ...this.settings, ...newSettings };
        this.updateActivity();
        this.broadcast('room_settings_updated', this.settings);
        console.log(`Room ${this.id}: Settings updated.`);
        return true;
    }

    getPlayerInfo() {
        return Array.from(this.players.values()).map(p => ({
            id: p.id,
            nickname: p.nickname,
            isHost: p.id === this.host,
            team: p.team,
        }));
    }

    getRoomInfo(includeSensitive = false) {
        const roomInfo = {
            id: this.id,
            name: this.name,
            hasPassword: !!this.password, // Don't send the actual password
            maxPlayers: this.maxPlayers,
            type: this.type,
            hostId: this.host,
            hostNickname: this.players.get(this.host)?.nickname,
            players: this.getPlayerInfo(),
            redTeam: Array.from(this.redTeam),
            blueTeam: Array.from(this.blueTeam),
            spectators: Array.from(this.spectators),
            playerCount: this.players.size,
            gameInProgress: this.gameInProgress,
            gameState: this.gameState, // Might be too much for general info, consider trimming
            settings: this.settings,
            lastActivity: this.lastActivity,
        };
        if (includeSensitive) {
            // e.g., for host or internal use
            // roomInfo.password = this.password; // Example, be careful with this
        }
        return roomInfo;
    }
    
    broadcastPlayerList() {
        this.broadcast('player_list_updated', {
            players: this.getPlayerInfo(),
            redTeam: Array.from(this.redTeam),
            blueTeam: Array.from(this.blueTeam),
            spectators: Array.from(this.spectators),
            hostId: this.host,
        });
    }

    // Broadcast a message to all players in this room
    broadcast(event, data) {
        this.io.to(this.id).emit(event, data);
    }

    // Send a message to a specific player in this room
    unicast(targetSocket, event, data) {
        if (targetSocket && typeof targetSocket.emit === 'function') {
            targetSocket.emit(event, data);
        } else {
            console.warn(`Room ${this.id}: Attempted to unicast to invalid socket for event ${event}`);
        }
    }

    // To be called by RoomManager when the room is explicitly closed or deemed inactive
    destroy(reason = "Room closed") {
        this.broadcast('room_closed', { roomId: this.id, reason });
        this.players.forEach(player => {
            if (player.socket) {
                player.socket.leave(this.id);
            }
        });
        this.players.clear();
        this.redTeam.clear();
        this.blueTeam.clear();
        this.spectators.clear();
        console.log(`Room ${this.id} destroyed. Reason: ${reason}`);
    }
}
