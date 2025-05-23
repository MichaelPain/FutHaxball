const express = require('express');
const db = require('./database.js'); 
const bcrypt = require('bcrypt'); 
const crypto = require('crypto'); 
const jwt = require('jsonwebtoken'); 
const { Server } = require("socket.io"); 
const { v4: uuidv4 } = require('uuid'); 

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'your-super-secret-jwt-key-change-this-in-production!'; 

// --- Matchmaking & Elo Parameters ---
const INITIAL_MMR_RANGE = 100; 
const MMR_RANGE_EXPANSION_RATE = 10; 
const MMR_RANGE_EXPANSION_INTERVAL = 5000; 
const MAX_MMR_RANGE = 500; 
const K_FACTOR = 32; 
const READY_CHECK_TIMEOUT_DURATION = 30000; 

app.use(express.json());

// --- Elo Calculation Helper ---
function calculateNewElo(playerRating, opponentRating, actualScore) { 
    const expectedScore = 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
    const newRating = playerRating + K_FACTOR * (actualScore - expectedScore);
    return Math.round(newRating);
}

function authenticateToken(req, res, next) { /* ... */ }

// --- HTTP Routes (condensed) ---
app.get('/test', (req, res) => res.json({ message: 'Server is running!' }));
app.post('/api/users/register', (req, res) => { /* ... */ });
app.get('/api/users/verify-email', (req, res) => { /* ... */ });
app.post('/api/users/request-password-reset', (req, res) => { /* ... */ });
app.post('/api/users/reset-password', (req, res) => { /* ... */ });
app.post('/api/users/login', (req, res) => { /* ... */ });
app.put('/api/users/profile/nickname', authenticateToken, (req, res) => { /* ... */ });
app.put('/api/users/profile/password', authenticateToken, (req, res) => { /* ... */ });
app.get('/api/users/profile/stats', authenticateToken, (req, res) => { /* ... */ });
app.post('/api/rooms', authenticateToken, async (req, res) => { /* ... */ });
app.get('/api/rooms', (req, res) => { /* ... */ });
app.get('/api/leaderboard/:gameMode', (req, res) => { /* ... (Updated in Turn 107) ... */ });


const httpServer = app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});

const io = new Server(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

let SESSIONS = {}; 
let rankedQueues = { '1v1': [], '2v2': [], '3v3': [] }; 
let matchPlayerReadiness = {}; 
let parties = {}; 
let nextPartyId = 1;

io.on('connection', (socket) => { 
    console.log('User connected via WebSocket:', socket.id);
    SESSIONS[socket.id] = { 
        id: socket.id, status: 'idle', userId: null, nickname: null,
        roomId: null, isRoomHost: false, peersInRoom: [], 
        currentGameModeInQueue: null, matchId: null, 
        currentPartyId: null, isPartyLeader: false, 
        socket: socket 
    };
    socket.on('authenticate_socket', (data) => { /* ... */ });
    socket.on('confirm_room_host', (data) => { /* ... */ });
    socket.on('request_to_join_room', (data) => { /* ... */ });
    socket.on('new_peer_connected_to_room', (data) => { /* ... */ });
    socket.on('join_ranked_queue', (data) => { /* ... */ });
    socket.on('leave_ranked_queue', (data) => { /* ... */ });
    socket.on('create_party', () => { /* ... */ });
    socket.on('leave_party', () => { /* ... */ });
    socket.on('party_join_ranked_queue', async (data) => { /* ... */ });
    socket.on('player_is_ready_for_match', (data) => { /* ... (Updated in Turn 99) ... */ });
    
    socket.on('report_ranked_match_result', (data) => {
        const { matchId, scoreRed, scoreBlue } = data;
        const session = SESSIONS[socket.id];

        if (!session || !session.userId) return socket.emit('match_result_error', { message: 'Authentication required.' });
        const reportingUserId = session.userId;

        db.get("SELECT * FROM ranked_matches WHERE match_id = ?", [matchId], (err, match) => {
            if (err) return socket.emit('match_result_error', { message: 'Error finding match.' });
            if (!match) return socket.emit('match_result_error', { message: 'Match not found.' });
            if (match.status !== 'active') return socket.emit('match_result_error', { message: `Match not active (current: ${match.status}).` });
            if (match.server_or_host_id !== reportingUserId) return socket.emit('match_result_error', { message: 'Only host can report score.' });

            let gameSettings = {}; try { gameSettings = JSON.parse(match.game_settings || '{}'); } catch (e) { console.error("Error parsing game_settings", e); }
            const scoreLimit = gameSettings.scoreLimit || 3;

            if (typeof scoreRed !== 'number' || typeof scoreBlue !== 'number' || scoreRed < 0 || scoreBlue < 0) 
                return socket.emit('match_result_error', { message: 'Invalid scores (non-negative numbers required).' });
            const winnerScore = Math.max(scoreRed, scoreBlue); const loserScore = Math.min(scoreRed, scoreBlue);
            if (winnerScore < scoreLimit) 
                return socket.emit('match_result_error', { message: `Match not concluded. Score limit ${scoreLimit} not reached.` });
            if (winnerScore === scoreLimit && loserScore >= scoreLimit) 
                return socket.emit('match_result_error', { message: 'Invalid score (loser score too high).' });

            const endTime = new Date().toISOString();
            db.run("UPDATE ranked_matches SET score_team_red = ?, score_team_blue = ?, status = 'completed', end_time = ? WHERE match_id = ?",
                   [scoreRed, scoreBlue, endTime, matchId], function(updateErr) {
                if (updateErr) return socket.emit('match_result_error', { message: 'Failed to record score.' });
                console.log(`Match ${matchId} score recorded: R ${scoreRed} - B ${scoreBlue}`);
                
                db.all("SELECT user_id, team, mmr_before_match FROM match_participants WHERE match_id = ?", [matchId], (participantsErr, participants) => {
                    if (participantsErr || !participants || participants.length === 0) {
                         return console.error("Error fetching participants or none found for MMR update:", participantsErr ? participantsErr.message : "No participants");
                    }
                    
                    const gameMode = match.game_mode;
                    let playerMmrUpdates = {}; // Store { userId: { yourMmrChange, yourNewMmr } }

                    if (gameMode === '1v1') {
                        if (participants.length !== 2) return console.error("1v1 MMR: Incorrect participant count.");
                        const playerRedData = participants.find(p => p.team === 'red');
                        const playerBlueData = participants.find(p => p.team === 'blue');
                        if (!playerRedData || !playerBlueData) return console.error("1v1 MMR: Could not find red/blue players.");

                        const actualScoreRed = (scoreRed > scoreBlue) ? 1 : (scoreRed < scoreBlue ? 0 : 0.5);
                        const actualScoreBlue = (scoreBlue > scoreRed) ? 1 : (scoreBlue < scoreRed ? 0 : 0.5);

                        const newMmrRed = calculateNewElo(playerRedData.mmr_before_match, playerBlueData.mmr_before_match, actualScoreRed);
                        const newMmrBlue = calculateNewElo(playerBlueData.mmr_before_match, playerRedData.mmr_before_match, actualScoreBlue);
                        const mmrChangeRed = newMmrRed - playerRedData.mmr_before_match;
                        const mmrChangeBlue = newMmrBlue - playerBlueData.mmr_before_match;

                        playerMmrUpdates[playerRedData.user_id] = { yourMmrChange: mmrChangeRed, yourNewMmr: newMmrRed };
                        playerMmrUpdates[playerBlueData.user_id] = { yourMmrChange: mmrChangeBlue, yourNewMmr: newMmrBlue };

                    } else if (['2v2', '3v3'].includes(gameMode)) { // Generic team modes
                        const teamRedPlayers = participants.filter(p => p.team === 'red');
                        const teamBluePlayers = participants.filter(p => p.team === 'blue');
                        const expectedTeamSize = parseInt(gameMode[0]);

                        if (teamRedPlayers.length !== expectedTeamSize || teamBluePlayers.length !== expectedTeamSize) {
                            console.error(`MMR Calc: Incorrect player count for ${gameMode} match ${matchId}.`); return;
                        }

                        let sumMmrRed = 0; teamRedPlayers.forEach(p => sumMmrRed += p.mmr_before_match);
                        const avgMmrRed = sumMmrRed / teamRedPlayers.length;
                        let sumMmrBlue = 0; teamBluePlayers.forEach(p => sumMmrBlue += p.mmr_before_match);
                        const avgMmrBlue = sumMmrBlue / teamBluePlayers.length;

                        const actualScoreForTeamRed = (scoreRed > scoreBlue) ? 1 : ((scoreBlue > scoreRed) ? 0 : 0.5);
                        const actualScoreForTeamBlue = (scoreBlue > scoreRed) ? 1 : ((scoreRed > scoreBlue) ? 0 : 0.5);

                        const expectedScoreForTeamRed = 1 / (1 + Math.pow(10, (avgMmrBlue - avgMmrRed) / 400));
                        const totalMmrChangeForTeamRed = K_FACTOR * (actualScoreForTeamRed - expectedScoreForTeamRed);
                        const totalMmrChangeForTeamBlue = K_FACTOR * (actualScoreForTeamBlue - (1 - expectedScoreForTeamRed));

                        teamRedPlayers.forEach(player => {
                            const individualMmrChange = Math.round(totalMmrChangeForTeamRed); // Simplified: team change applied to each player
                            const newIndividualMmr = player.mmr_before_match + individualMmrChange;
                            playerMmrUpdates[player.user_id] = { yourMmrChange: individualMmrChange, yourNewMmr: newIndividualMmr };
                        });
                        teamBluePlayers.forEach(player => {
                            const individualMmrChange = Math.round(totalMmrChangeForTeamBlue);
                            const newIndividualMmr = player.mmr_before_match + individualMmrChange;
                            playerMmrUpdates[player.user_id] = { yourMmrChange: individualMmrChange, yourNewMmr: newIndividualMmr };
                        });
                    } else {
                        return console.error("MMR calculation for game mode " + gameMode + " not implemented.");
                    }
                    
                    db.serialize(() => {
                        participants.forEach(p => {
                            const update = playerMmrUpdates[p.user_id];
                            if (update) {
                                db.run("UPDATE match_participants SET mmr_after_match = ?, mmr_change = ? WHERE match_id = ? AND user_id = ?", 
                                       [update.yourNewMmr, update.yourMmrChange, matchId, p.user_id]);
                                
                                const winLossSql = ( (p.team === 'red' && actualScoreRedTeam === 1) || (p.team === 'blue' && actualScoreBlueTeam === 1) )
                                    ? "UPDATE player_mmr SET mmr = ?, wins = wins + 1, last_played_date = ? WHERE user_id = ? AND game_mode = ?"
                                    : ( (p.team === 'red' && actualScoreRedTeam === 0) || (p.team === 'blue' && actualScoreBlueTeam === 0) )
                                        ? "UPDATE player_mmr SET mmr = ?, losses = losses + 1, last_played_date = ? WHERE user_id = ? AND game_mode = ?"
                                        : "UPDATE player_mmr SET mmr = ?, last_played_date = ? WHERE user_id = ? AND game_mode = ?"; // Draw case
                                
                                if (actualScoreRedTeam !== 0.5 || actualScoreBlueTeam !== 0.5) { // If not a draw
                                    db.run(winLossSql, [update.yourNewMmr, new Date().toISOString(), p.user_id, gameMode]);
                                } else { // Handle draw for MMR update without win/loss count change
                                    db.run("UPDATE player_mmr SET mmr = ?, last_played_date = ? WHERE user_id = ? AND game_mode = ?", [update.yourNewMmr, new Date().toISOString(), p.user_id, gameMode]);
                                }
                            }
                        });
                    });

                    participants.forEach(p => {
                        const participantSession = Object.values(SESSIONS).find(s => s.userId === p.user_id && s.matchId === matchId);
                        if (participantSession && participantSession.socket) {
                            const update = playerMmrUpdates[p.user_id] || { yourMmrChange: 0, yourNewMmr: p.mmr_before_match };
                            participantSession.socket.emit('ranked_match_concluded', { 
                                matchId, scoreRed, scoreBlue, message: "Match concluded. MMR updated.",
                                yourMmrChange: update.yourMmrChange, yourNewMmr: update.yourNewMmr, yourTeam: p.team
                            });
                            participantSession.status = 'idle'; participantSession.matchId = null; participantSession.rankedMatchP2PReady = false;
                        }
                    });
                });
            });
        });
    });

    socket.on('signal', (data) => { /* ... */ });
    socket.on('disconnect', () => { /* ... */ });
});

function tryMatchmake(gameMode) { /* ... */ }
function setupRanked1v1Match(player1Data, player2Data, gameMode) { /* ... */ }
function setupRanked2v2Match(hostPlayer, teamRed, teamBlue, gameMode, isPartyMatch) { /* ... */ }
function handleReadyCheckTimeout(matchId, reason = "Not all players were ready in time.") { /* ... */ }
