const chai = require('chai');
const sinon = require('sinon');
const { expect } = chai;
const { Room } = require('../src/server/game/Room.js'); // Adjust path as necessary
const { v4: uuidv4 } = require('uuid'); // For mocking, if Room uses it directly for ID

// Mock dependencies
let mockIo;
let mockHostSocket;
let mockPlayerSocket;

describe('Room Class', function() {
    this.timeout(5000); // General timeout for tests
    let room;
    let sandbox;

    const hostId = 'hostUserId';
    const hostNickname = 'HostUser';
    const defaultRoomName = 'Test Room';
    const defaultPassword = null;
    const defaultMaxPlayers = 6;
    const defaultType = 'standard';
    const defaultRoomSettings = {
        scoreLimit: 5,
        timeLimit: 3 * 60 * 1000,
        teamLock: false,
        allowSpectators: true,
        teamBalanceThreshold: 1,
        gameStartDelay: 3000,
    };

    beforeEach(() => {
        sandbox = sinon.createSandbox();

        // Mock Socket.IO server instance
        mockIo = {
            to: sandbox.stub().returnsThis(), // Allows chaining like io.to(roomId).emit(...)
            emit: sandbox.spy(),
        };

        // Mock host socket
        mockHostSocket = {
            id: 'hostSocketId',
            join: sandbox.spy(),
            leave: sandbox.spy(),
            emit: sandbox.spy(),
            // Potentially add request.user for host identification if Room uses it
            request: { user: { id: hostId, nickname: hostNickname } } 
        };
        
        // Default player socket mock
        mockPlayerSocket = {
            id: 'playerSocketId1',
            join: sandbox.spy(),
            leave: sandbox.spy(),
            emit: sandbox.spy(),
            request: { user: { id: 'player1', nickname: 'Player1' } }
        };

        // Create a new room instance before each test
        room = new Room(
            defaultRoomName,
            defaultPassword,
            defaultMaxPlayers,
            defaultType,
            hostId,
            hostNickname,
            mockHostSocket, // Pass the host's socket
            defaultRoomSettings,
            mockIo
        );
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe('Constructor & Initialization', () => {
        it('should create a room with correct default properties', () => {
            expect(room.id).to.be.a('string');
            expect(room.name).to.equal(defaultRoomName);
            expect(room.password).to.equal(defaultPassword);
            expect(room.maxPlayers).to.equal(defaultMaxPlayers);
            expect(room.type).to.equal(defaultType);
            expect(room.host).to.equal(hostId);
            expect(room.io).to.equal(mockIo);
            expect(room.settings).to.deep.equal(defaultRoomSettings);
            expect(room.gameInProgress).to.be.false;
            expect(room.players).to.be.instanceOf(Map);
            expect(room.redTeam).to.be.instanceOf(Set);
            expect(room.blueTeam).to.be.instanceOf(Set);
            expect(room.spectators).to.be.instanceOf(Set);
        });

        it('should add the host to the players map and assign them correctly', () => {
            expect(room.players.size).to.equal(1);
            const hostPlayer = room.players.get(hostId);
            expect(hostPlayer).to.exist;
            expect(hostPlayer.id).to.equal(hostId);
            expect(hostPlayer.nickname).to.equal(hostNickname);
            expect(hostPlayer.isHost).to.be.true;
            expect(hostPlayer.socket).to.equal(mockHostSocket);
            // Default assignment logic in Room constructor might place host in a team or spectators
            // Based on current Room.js, host is added and then assignPlayerToDefaultTeam is called.
            // If MAX_TEAM_SIZE is 3, host would go to 'red' if it's the first team.
            expect(['red', 'blue', 'spectator']).to.include(hostPlayer.team);
            if (hostPlayer.team === 'red') expect(room.redTeam.has(hostId)).to.be.true;
            else if (hostPlayer.team === 'blue') expect(room.blueTeam.has(hostId)).to.be.true;
            else expect(room.spectators.has(hostId)).to.be.true;

            expect(mockHostSocket.join.calledOnceWith(room.id)).to.be.true;
        });
        
        it('should broadcast player list upon host joining (construction)', () => {
            // The broadcasts happen inside addPlayer, which is called by constructor for the host
            expect(mockIo.to.calledWith(room.id)).to.be.true; // or more specific if multiple calls
            // Check for player_list_updated specifically
            const playerListUpdateCall = mockIo.emit.getCalls().find(call => call.args[0] === 'player_list_updated');
            expect(playerListUpdateCall).to.not.be.undefined;
        });
    });

    describe('addPlayer(socket, userId, nickname)', () => {
        const newPlayerId = 'player2';
        const newPlayerNickname = 'PlayerTwo';
        let newPlayerSocket;

        beforeEach(() => {
            newPlayerSocket = { 
                id: 'playerSocketId2', 
                join: sandbox.spy(), 
                leave: sandbox.spy(), 
                emit: sandbox.spy(),
                request: { user: { id: newPlayerId, nickname: newPlayerNickname } }
            };
        });

        it('should add a new player successfully', () => {
            const result = room.addPlayer(newPlayerSocket, newPlayerId, newPlayerNickname);
            expect(result).to.be.true;
            expect(room.players.size).to.equal(2); // Host + new player
            const addedPlayer = room.players.get(newPlayerId);
            expect(addedPlayer).to.exist;
            expect(addedPlayer.nickname).to.equal(newPlayerNickname);
            expect(addedPlayer.isHost).to.be.false;
            expect(newPlayerSocket.join.calledOnceWith(room.id)).to.be.true;
            expect(newPlayerSocket.emit.calledWith('room_joined', room.getRoomInfo())).to.be.true;

            // Check broadcasts (player_joined, player_list_updated)
            const playerJoinedCall = mockIo.emit.getCalls().find(call => call.args[0] === 'player_joined');
            expect(playerJoinedCall).to.not.be.undefined;
            expect(playerJoinedCall.args[1]).to.equal(newPlayerNickname);
            
            const playerListUpdateCall = mockIo.emit.getCalls().find(call => call.args[0] === 'player_list_updated');
            expect(playerListUpdateCall).to.not.be.undefined;
        });

        it('should assign player to a default team (e.g. blue if red has host)', () => {
            room.addPlayer(newPlayerSocket, newPlayerId, newPlayerNickname);
            const addedPlayer = room.players.get(newPlayerId);
            expect(['red', 'blue', 'spectator']).to.include(addedPlayer.team);
            // More specific checks depend on MAX_TEAM_SIZE and exact balancing in assignPlayerToDefaultTeam
        });

        it('should reject adding a player if the room is full', () => {
            room.maxPlayers = 1; // Host is already 1 player
            const result = room.addPlayer(newPlayerSocket, newPlayerId, newPlayerNickname);
            expect(result).to.be.false;
            expect(room.players.size).to.equal(1); // Should not have added
            expect(newPlayerSocket.emit.calledWith('room_join_error', { message: 'Room is full.' })).to.be.true;
        });

        it('should update socket and re-emit room_joined if player with existing ID joins (reconnects)', () => {
            // First, add the player
            room.addPlayer(newPlayerSocket, newPlayerId, newPlayerNickname);
            const originalSocket = newPlayerSocket;
            
            // Now, simulate rejoining with a new socket object but same ID
            const newerPlayerSocket = { 
                id: 'playerSocketId3', // Different socket ID
                join: sandbox.spy(), 
                leave: sandbox.spy(), 
                emit: sandbox.spy(),
                request: { user: { id: newPlayerId, nickname: newPlayerNickname } }
            };
            mockIo.emit.resetHistory(); // Reset history for broadcast checks
            
            const result = room.addPlayer(newerPlayerSocket, newPlayerId, newPlayerNickname);
            expect(result).to.be.true;
            expect(room.players.size).to.equal(2); // Still 2 players (host + this one)
            const reconnectedPlayer = room.players.get(newPlayerId);
            expect(reconnectedPlayer.socket).to.equal(newerPlayerSocket); // Socket updated
            expect(newerPlayerSocket.join.calledOnceWith(room.id)).to.be.true;
            expect(newerPlayerSocket.emit.calledWith('room_joined', room.getRoomInfo())).to.be.true;
            
            // Check that player_list_updated is broadcast again
            const playerListUpdateCall = mockIo.emit.getCalls().find(call => call.args[0] === 'player_list_updated');
            expect(playerListUpdateCall).to.not.be.undefined;
        });
    });

    describe('removePlayer(userId)', () => {
        const p1Id = 'player1';
        const p1Nickname = 'PlayerOne';
        let p1Socket;

        beforeEach(() => {
            p1Socket = { 
                id: 'p1Socket', 
                join: sandbox.spy(), 
                leave: sandbox.spy(), 
                emit: sandbox.spy(),
                request: { user: { id: p1Id, nickname: p1Nickname } }
            };
            room.addPlayer(p1Socket, p1Id, p1Nickname); // Host + p1
            mockIo.emit.resetHistory(); // Clear construction/addPlayer broadcasts
        });

        it('should remove an existing player', () => {
            const result = room.removePlayer(p1Id);
            expect(result).to.be.true;
            expect(room.players.has(p1Id)).to.be.false;
            expect(room.redTeam.has(p1Id)).to.be.false;
            expect(room.blueTeam.has(p1Id)).to.be.false;
            expect(room.spectators.has(p1Id)).to.be.false;
            expect(p1Socket.leave.calledOnceWith(room.id)).to.be.true;

            const playerLeftCall = mockIo.emit.getCalls().find(call => call.args[0] === 'player_left');
            expect(playerLeftCall).to.not.be.undefined;
            expect(playerLeftCall.args[1]).to.equal(p1Nickname);
            
            const playerListUpdateCall = mockIo.emit.getCalls().find(call => call.args[0] === 'player_list_updated');
            expect(playerListUpdateCall).to.not.be.undefined;
        });

        it('should reassign host if the host leaves and other players remain', () => {
            expect(room.host).to.equal(hostId); // Initial host
            room.removePlayer(hostId); // Host leaves
            expect(room.players.size).to.equal(1); // p1 remains
            expect(room.host).to.equal(p1Id); // p1 should be the new host
            const newHostPlayer = room.players.get(p1Id);
            expect(newHostPlayer.isHost).to.be.true;

            const hostChangedCall = mockIo.emit.getCalls().find(call => call.args[0] === 'host_changed');
            expect(hostChangedCall).to.not.be.undefined;
            expect(hostChangedCall.args[1]).to.deep.equal({ newHostId: p1Id, newHostNickname: p1Nickname });
        });

        it('should return "empty" if the last player leaves', () => {
            room.removePlayer(p1Id);    // p1 leaves
            const result = room.removePlayer(hostId); // Host leaves (last player)
            expect(result).to.equal('empty');
            expect(room.players.size).to.equal(0);
            expect(room.host).to.be.null; // No host
             const roomEmptyCall = mockIo.emit.getCalls().find(call => call.args[0] === 'room_empty');
            expect(roomEmptyCall).to.not.be.undefined;
            expect(roomEmptyCall.args[1]).to.equal(room.id);
        });

        it('should do nothing if trying to remove a non-existent player', () => {
            const result = room.removePlayer('nonExistentPlayerId');
            expect(result).to.be.false;
            expect(room.players.size).to.equal(2); // Unchanged
            expect(mockIo.emit.calledWith('player_left')).to.be.false;
        });
    });
    
    describe('changePlayerTeam(userId, newTeam)', () => {
        const p1Id = 'player1';
        let p1Socket;
        let p1;

        beforeEach(() => {
            p1Socket = { id: 'p1s', emit: sandbox.spy(), request: { user: { id: p1Id, nickname: 'P1' } } };
            room.addPlayer(p1Socket, p1Id, 'P1');
            p1 = room.players.get(p1Id);
            // Manually assign host to red, p1 to blue for predictable testing
            room.redTeam.add(hostId); room.players.get(hostId).team = 'red';
            room.blueTeam.add(p1Id); p1.team = 'blue';
            room.spectators.delete(hostId); room.spectators.delete(p1Id);
            mockIo.emit.resetHistory();
        });

        it('should allow player to change from blue to red', () => {
            const result = room.changePlayerTeam(p1Id, 'red');
            expect(result).to.be.true;
            expect(p1.team).to.equal('red');
            expect(room.redTeam.has(p1Id)).to.be.true;
            expect(room.blueTeam.has(p1Id)).to.be.false;
            expect(mockIo.emit.getCalls().some(call => call.args[0] === 'player_team_changed' && call.args[1].userId === p1Id && call.args[1].newTeam === 'red')).to.be.true;
        });

        it('should allow player to change to spectator', () => {
            const result = room.changePlayerTeam(p1Id, 'spectator');
            expect(result).to.be.true;
            expect(p1.team).to.equal('spectator');
            expect(room.spectators.has(p1Id)).to.be.true;
            expect(room.blueTeam.has(p1Id)).to.be.false;
        });
        
        it('should prevent team change if teamLock is active and game in progress (simplified test - assumes gameInProgress check in method)', () => {
            room.settings.teamLock = true;
            room.gameInProgress = true; // Manually set for this test
            const result = room.changePlayerTeam(p1Id, 'red');
            expect(result).to.be.false;
            expect(p1.team).to.equal('blue'); // Should remain in blue
            expect(p1Socket.emit.calledWith('team_change_error', { message: 'Teams are locked.' })).to.be.true;
            room.gameInProgress = false; // Reset for other tests
        });

        it('should prevent team change if new team is full (MAX_TEAM_SIZE is 3, host is red)', () => {
            // Add two more to red team (p2, p3), making red full (host, p2, p3)
            const p2Socket = { id: 'p2s', emit: sandbox.spy(), request: { user: { id: 'p2', nickname: 'P2' } } };
            const p3Socket = { id: 'p3s', emit: sandbox.spy(), request: { user: { id: 'p3', nickname: 'P3' } } };
            room.addPlayer(p2Socket, 'p2', 'P2'); room.changePlayerTeam('p2', 'red');
            room.addPlayer(p3Socket, 'p3', 'P3'); room.changePlayerTeam('p3', 'red');
            mockIo.emit.resetHistory(); // clear add/change broadcasts

            const result = room.changePlayerTeam(p1Id, 'red'); // p1 (blue) tries to join full red team
            expect(result).to.be.false;
            expect(p1.team).to.equal('blue');
            expect(p1Socket.emit.calledWith('team_change_error', { message: 'Red team is full.' })).to.be.true;
        });
        
        it('should prevent team change if it violates teamBalanceThreshold', () => {
            // Host on Red (1), P1 on Blue (1). Max diff is 1.
            // Add p2, p3 to Blue. Blue = 3, Red = 1. Diff is 2.
            const p2Socket = { id: 'p2s', emit: sandbox.spy(), request: { user: { id: 'p2', nickname: 'P2' } } };
            const p3Socket = { id: 'p3s', emit: sandbox.spy(), request: { user: { id: 'p3', nickname: 'P3' } } };
            room.addPlayer(p2Socket, 'p2', 'P2'); room.changePlayerTeam('p2', 'blue'); // Blue: p1,p2. Red: host
            room.addPlayer(p3Socket, 'p3', 'P3'); room.changePlayerTeam('p3', 'blue'); // Blue: p1,p2,p3. Red: host
            
            // Now, Red has 1 (host), Blue has 3 (p1, p2, p3).
            // If a 4th player (p4) tries to join Blue, it should be denied.
            const p4Socket = { id: 'p4s', emit: sandbox.spy(), request: { user: { id: 'p4', nickname: 'P4' } } };
            room.addPlayer(p4Socket, 'p4', 'P4'); // p4 initially spectator or balanced
            room.changePlayerTeam('p4', 'spectator'); // Move to spectator first
            mockIo.emit.resetHistory();

            const result = room.changePlayerTeam('p4', 'blue');
            expect(result).to.be.false;
            const p4 = room.players.get('p4');
            expect(p4.team).to.equal('spectator'); // Should not have changed
            expect(p4Socket.emit.calledWith('team_change_error', { message: 'Blue team would become too unbalanced.' })).to.be.true;
        });
    });

    describe('startGame()', () => {
        let p1Socket;
        beforeEach(() => {
            sandbox.useFakeTimers();
            p1Socket = { id: 'p1s', emit: sandbox.spy(), request: {user: {id: 'p1', nickname: 'P1'}}};
            room.addPlayer(p1Socket, 'p1', 'P1');
            // Ensure teams are not empty for a valid start
            room.changePlayerTeam(hostId, 'red');
            room.changePlayerTeam('p1', 'blue');
            mockIo.emit.resetHistory();
        });

        afterEach(() => {
            sandbox.restore(); // Restores fake timers too
        });

        it('should start the game if conditions are met', () => {
            const result = room.startGame();
            expect(result).to.be.true;
            expect(room.gameInProgress).to.be.true;
            expect(room.gameState.score.red).to.equal(0);
            expect(room.gameState.score.blue).to.equal(0);
            expect(mockIo.emit.calledWith('game_starting', { delay: room.settings.gameStartDelay })).to.be.true;
            
            sandbox.clock.tick(room.settings.gameStartDelay);
            expect(mockIo.emit.calledWith('game_started', room.getRoomInfo())).to.be.true;
        });

        it('should fail to start if one team is empty', () => {
            room.changePlayerTeam('p1', 'red'); // Both players on red team, blue is empty
            mockIo.emit.resetHistory();
            const result = room.startGame();
            expect(result).to.be.false;
            expect(room.gameInProgress).to.be.false;
            expect(mockIo.emit.calledWith('game_start_error', {message: "Not enough players on each team to start."})).to.be.true;
        });
        
        // To test "caller is not host", Room.startGame would need to know the caller.
        // Assuming RoomManager handles host check before calling room.startGame().
        // If Room.startGame itself checked host, that would be tested here.
    });

    describe('endGame()', () => {
        beforeEach(() => {
            // Start a game to test ending it
            room.addPlayer({ id: 'p1s', emit: sandbox.spy(), request: {user: {id: 'p1', nickname: 'P1'}}}, 'p1', 'P1');
            room.changePlayerTeam(hostId, 'red');
            room.changePlayerTeam('p1', 'blue');
            room.startGame();
            sandbox.clock.tick(room.settings.gameStartDelay); // Ensure game is started
            mockIo.emit.resetHistory();
        });
        
         afterEach(() => {
            sandbox.restore(); // For fake timers if any are used implicitly by startGame
        });

        it('should end an ongoing game', () => {
            const reason = 'Test end';
            const result = room.endGame(reason);
            expect(result).to.be.true;
            expect(room.gameInProgress).to.be.false;
            expect(mockIo.emit.calledWith('game_ended', { reason, finalGameState: room.gameState })).to.be.true;
        });

        it('should do nothing if no game is in progress', () => {
            room.gameInProgress = false; // Manually set to not in progress
            mockIo.emit.resetHistory();
            const result = room.endGame('Test end');
            expect(result).to.be.false;
            expect(mockIo.emit.calledWith('game_ended')).to.be.false;
        });
    });
    
    describe('updateSettings()', () => {
        it('should update room settings and broadcast changes', () => {
            const newSettings = { scoreLimit: 10, timeLimit: 5 * 60 * 1000 };
            const result = room.updateSettings(newSettings);
            expect(result).to.be.true;
            expect(room.settings.scoreLimit).to.equal(10);
            expect(room.settings.timeLimit).to.equal(5 * 60 * 1000);
            // Check other settings remain unchanged
            expect(room.settings.teamLock).to.equal(defaultRoomSettings.teamLock);
            expect(mockIo.emit.calledWith('room_settings_updated', room.settings)).to.be.true;
        });
    });
});
