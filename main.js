const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// --- Socket.IO Client Setup ---
const socket = io(); 
let peerConnections = {}; 
let isGameHost = false; 
let currentRoomId = null; 
let localPlayerNickname = `P(${socket.id.substring(0,4)})`; 
let localUserId = null; // To be set after socket authentication

// --- Ranked Match State ---
let currentMatchId = null;
let currentOpponentInfo = null; 
let currentGameSettings = null; 
let isRankedMatchActive = false; 

// --- 2v2 Ranked Match State ---
let currentTeammates = [];
let currentOpponents = [];
let currentMatchHostSocketId = null;
let myTeamInMatch = null; 

// --- Party State ---
let currentParty = null; 
let amPartyLeader = false;

// --- Ready Check State ---
let inReadyCheckForMatchId = null;
let readyCheckTimerInterval = null;
let readyCheckUITimeout = null; 


socket.on('connect', () => {
    console.log('Connected to signaling server! My socket ID:', socket.id);
    displayMessage(`[System] Connected to server. My ID: ${socket.id}`);
    // Example: Simulate JWT auth after connect for testing ranked features
    // const mockJwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsImlhdCI6MTYxMjM0NTY3OH0.someSignature"; // Replace with actual JWT logic
    // socket.emit('authenticate_socket', { token: mockJwt /* localStorage.getItem('jwtToken') */ });
});

socket.on('socket_auth_success', (data) => {
    localUserId = data.userId;
    localPlayerNickname = data.nickname || `User(${data.userId})`;
    player1.nickname = localPlayerNickname; // Update game object
    console.log(`Socket authenticated for userId ${localUserId}, nickname: ${localPlayerNickname}`);
    displayMessage(`[System] Socket authenticated. Welcome, ${localPlayerNickname}!`);
});
socket.on('socket_auth_failed', (data) => {
    console.error('Socket authentication failed:', data.message);
    displayMessage(`[System] Socket auth failed: ${data.message}. Some features may be unavailable.`);
});


socket.on('disconnect', () => {
    console.log('Disconnected from signaling server.');
    displayMessage('[System] Disconnected from server.');
    Object.values(peerConnections).forEach(peer => peer.destroy());
    peerConnections = {};
    isGameHost = false; 
    currentRoomId = null;
    currentParty = null; 
    amPartyLeader = false;
    resetLocalGameState(); 
});

socket.on('peer_not_found', (data) => { /* ... */ });
socket.on('status', (data) => { /* ... */ });

// --- Room Hosting & Joining Logic ---
function confirmRoomHosting(roomId) { /* ... */ }
socket.on('room_confirmed_as_host', (data) => { /* ... */ });
function requestToJoinRoom(roomId, password = null) { /* ... */ }
socket.on('join_room_failed', (data) => { /* ... */ });
socket.on('join_request_sent_to_host', (data) => { /* ... */ });
socket.on('officially_joined_room', (data) => { /* ... */ });
socket.on('player_requesting_to_join', (data) => { /* ... */ });

// --- Ranked Matchmaking Client Logic ---
function joinRankedQueue(gameMode) {
    if (!localUserId) {
        displayMessage('[System] Please authenticate to join ranked queue.');
        console.error('Cannot join ranked queue: localUserId not set. Authenticate socket first.');
        return;
    }
    if (currentMatchId || inReadyCheckForMatchId || (currentParty && currentParty.gameModeGoal)) {
        displayMessage('[System] Cannot join queue while in a match, ready check, or party is already queuing/in match.');
        return;
    }
    console.log(`Attempting to join ranked queue for ${gameMode}`);
    socket.emit('join_ranked_queue', { gameMode });
    // UI Placeholder: Update queueStatusDisplay
    const queueStatusDiv = document.getElementById('queueStatusDisplay');
    if(queueStatusDiv) queueStatusDiv.innerHTML = `Joining ${gameMode} queue...`;
    displayMessage(`[System] Joining ${gameMode} ranked queue...`);
}

function leaveRankedQueue(gameMode) {
    if (!localUserId) {
        displayMessage('[System] Not authenticated.'); return;
    }
    console.log(`Attempting to leave ranked queue for ${gameMode}`);
    socket.emit('leave_ranked_queue', { gameMode });
    // UI Placeholder: Update queueStatusDisplay
    const queueStatusDiv = document.getElementById('queueStatusDisplay');
    if(queueStatusDiv) queueStatusDiv.innerHTML = `Leaving ${gameMode} queue...`;
    displayMessage(`[System] Leaving ${gameMode} ranked queue...`);
}

socket.on('joined_queue_successfully', (data) => { 
    console.log('Successfully joined ranked queue:', data.gameMode, 'Queue size:', data.queueSize);
    displayMessage(`[System] Joined ${data.gameMode} ranked queue (Size: ${data.queueSize}). Waiting for match...`);
    // UI Placeholder: Update queueStatusDisplay and show "Leave Queue" button
    const queueStatusDiv = document.getElementById('queueStatusDisplay');
    if(queueStatusDiv) queueStatusDiv.innerHTML = `In ${data.gameMode} queue (Size: ${data.queueSize}). Waiting... <button onclick="leaveRankedQueue('${data.gameMode}')">Leave Queue</button>`;
});
socket.on('left_queue_successfully', (data) => { 
    console.log('Successfully left ranked queue:', data.gameMode);
    displayMessage(`[System] Left ${data.gameMode} ranked queue.`);
    // UI Placeholder: Update queueStatusDisplay and remove "Leave Queue" button
    const queueStatusDiv = document.getElementById('queueStatusDisplay');
    if(queueStatusDiv) queueStatusDiv.innerHTML = `Left ${data.gameMode} queue.`;
});
socket.on('queue_error', (data) => { 
    console.error('Queue error:', data.message);
    displayMessage(`[System] Queue error: ${data.message}`);
    const queueStatusDiv = document.getElementById('queueStatusDisplay');
    if(queueStatusDiv) queueStatusDiv.innerHTML = `Queue error: ${data.message}`;
});

socket.on('ranked_match_found', (data) => { /* ... (Updated in Turn 99) ... */ });
socket.on('perform_ready_check', (data) => { /* ... (Updated in Turn 99) ... */ });
socket.on('initiate_ranked_p2p_setup', (data) => { /* ... (Updated in Turn 99) ... */ });
socket.on('match_aborted_ready_check', (data) => { /* ... (Updated in Turn 99) ... */ });
socket.on('ranked_game_is_starting', (data) => { /* ... (Updated in Turn 101) ... */ });
socket.on('ranked_match_concluded', (data) => { /* ... (Updated in Turn 77) ... */ });
socket.on('match_result_error', (data) => { /* ... (Updated in Turn 77) ... */ });

// --- Party System Client Logic ---
function createParty() { /* ... (Updated in Turn 95) ... */ 
    if (!localUserId) { displayMessage('[System] Authenticate to create party.'); return; }
    console.log("Attempting to create party...");
    socket.emit('create_party');
}
function leaveParty() { /* ... (Updated in Turn 95) ... */ 
    if (!localUserId) { displayMessage('[System] Authenticate to leave party.'); return; }
    if (currentParty) { console.log("Attempting to leave party:", currentParty.id); socket.emit('leave_party'); } 
    else { displayMessage("[System] You are not in a party."); }
}
socket.on('party_update', (partyData) => { /* ... (Updated in Turn 95, ensure UI update) ... */ 
    currentParty = partyData;
    const partyInfoDiv = document.getElementById('partyInfoArea'); // Assumed HTML element
    if (partyData) {
        amPartyLeader = (socket.id === partyData.leaderSocketId);
        const membersDisplay = partyData.members.map(m => `${m.nickname || m.socketId.substring(0,6)}${m.socketId === partyData.leaderSocketId ? ' (L)' : ''}`).join(', ');
        const partyStatusMsg = `[Party ${currentParty.id}] Members: ${membersDisplay}. Leader: ${amPartyLeader ? 'You!' : (currentParty.members.find(m=>m.socketId === partyData.leaderSocketId)?.nickname || 'N/A')}. ${partyData.gameModeGoal ? `Queued for: ${partyData.gameModeGoal}` : ''}`;
        displayMessage(partyStatusMsg);
        if(partyInfoDiv) partyInfoDiv.innerHTML = partyStatusMsg;
    } else {
        amPartyLeader = false;
        displayMessage('[Party] You are not in a party or it was disbanded.');
        if(partyInfoDiv) partyInfoDiv.innerHTML = "Not in a party.";
    }
});
socket.on('party_error', (data) => { /* ... (Updated in Turn 95) ... */ 
    console.error('Party Error:', data.message);
    displayMessage(`[Party System Error] ${data.message}`);
});

function partyJoinRankedQueue(gameMode) { /* ... (Updated in Turn 95, ensure UI call) ... */ 
    if (!currentParty || !amPartyLeader) {
        displayMessage('[Party] Only the party leader can join ranked queues.'); return;
    }
    if (!gameMode || !/^[1-3]v[1-3]$/.test(gameMode)) { // Adjusted regex for 1v1, 2v2, 3v3
        displayMessage('[Party] Invalid game mode format (e.g., "1v1", "2v2").'); return;
    }
    const requiredSize = parseInt(gameMode[0], 10) * 2; // Total players for the match
    const partySize = currentParty.members.length; // Client side has members array
    
    if (partySize > requiredSize / 2) { // Party cannot be larger than one team
         displayMessage(`[Party] Your party (${partySize} members) is too large for ${gameMode} (max ${requiredSize/2} per team).`); return;
    }
    // Server will handle if party is too small and needs fill-ins, or if exact size is required.

    socket.emit('party_join_ranked_queue', { partyId: currentParty.id, gameMode: gameMode });
    displayMessage(`[Party] Joining ${gameMode} ranked queue as a party...`);
    // UI Placeholder
    const queueStatusDiv = document.getElementById('queueStatusDisplay');
    if(queueStatusDiv) queueStatusDiv.innerHTML = `Party joining ${gameMode} queue...`;
}
socket.on('party_join_queue_success', (data) => { /* ... (Updated in Turn 95) ... */ 
    console.log('Party successfully joined ranked queue:', data.gameMode);
    displayMessage(`[Party] Successfully joined ${data.gameMode} queue.`);
    const queueStatusDiv = document.getElementById('queueStatusDisplay');
    if(queueStatusDiv) queueStatusDiv.innerHTML = `Party in ${data.gameMode} queue. Waiting...`;
});
socket.on('party_join_queue_failed', (data) => { /* ... (Updated in Turn 95) ... */ 
    console.error('Party failed to join queue:', data.message);
    displayMessage(`[Party] Failed to join queue: ${data.message}`);
    const queueStatusDiv = document.getElementById('queueStatusDisplay');
    if(queueStatusDiv) queueStatusDiv.innerHTML = `Party queue failed: ${data.message}`;
});


// --- Leaderboard Client Logic ---
async function fetchAndDisplayLeaderboard(gameMode) {
    const displayArea = document.getElementById('leaderboardDisplayArea');
    if (!displayArea) {
        console.error("Leaderboard display area not found.");
        displayMessage("[System] Leaderboard display area missing in HTML.");
        return;
    }
    displayArea.innerHTML = 'Loading leaderboard...'; // Placeholder
    try {
        const response = await fetch(`/api/leaderboard/${gameMode}`);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }
        const leaderboardData = await response.json();
        
        displayArea.innerHTML = ''; // Clear previous
        if (leaderboardData.length === 0) {
            displayArea.innerHTML = `<p>No rankings available for ${gameMode} yet.</p>`;
            return;
        }

        const table = document.createElement('table');
        table.innerHTML = `<thead><tr><th>Rank</th><th>Nickname</th><th>MMR</th><th>Wins</th><th>Losses</th></tr></thead>`;
        const tbody = document.createElement('tbody');
        leaderboardData.forEach(player => {
            const row = tbody.insertRow();
            row.insertCell().textContent = player.rank;
            row.insertCell().textContent = player.nickname;
            row.insertCell().textContent = player.mmr;
            row.insertCell().textContent = player.wins;
            row.insertCell().textContent = player.losses;
        });
        table.appendChild(tbody);
        displayArea.appendChild(table);
        displayMessage(`[System] Leaderboard for ${gameMode} loaded.`);

    } catch (error) {
        console.error('Failed to fetch leaderboard:', error);
        displayArea.innerHTML = `<p>Failed to load leaderboard: ${error.message}</p>`;
        displayMessage(`[System] Error loading leaderboard: ${error.message}`);
    }
}
// Example UI hookup (assuming HTML elements exist)
// document.getElementById('viewLeaderboardBtn').onclick = () => { 
//     const mode = document.getElementById('leaderboardGameMode').value; 
//     fetchAndDisplayLeaderboard(mode); 
// };


// --- Profile Stats Client Logic (Placeholder) ---
async function fetchAndDisplayProfileStats() {
    const profileDisplayArea = document.getElementById('profileStatsDisplayArea'); // Assume this div exists
    if (!profileDisplayArea) {
        console.error("Profile stats display area not found.");
        displayMessage("[System] Profile display area missing.");
        return;
    }
    const token = localStorage.getItem('jwtToken'); // Assume token is stored after login
    if (!token) {
        profileDisplayArea.innerHTML = "<p>Please log in to view profile stats.</p>";
        displayMessage("[System] You need to be logged in to see profile stats.");
        return;
    }

    profileDisplayArea.innerHTML = "Loading profile stats...";
    try {
        const response = await fetch('/api/users/profile/stats', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `HTTP error! Status: ${response.status}`);
        }
        const stats = await response.json();
        profileDisplayArea.innerHTML = `
            <h3>My Profile</h3>
            <p>Nickname: ${stats.nickname}</p>
            <p>Email: ${stats.email}</p>
            <p>Joined: ${new Date(stats.registration_date).toLocaleDateString()}</p>
            <h4>Game Stats (Overall - Placeholder)</h4>
            <p>${stats.game_stats.message}</p> 
        `;
         displayMessage("[System] Profile stats loaded.");
    } catch (error) {
        console.error("Failed to fetch profile stats:", error);
        profileDisplayArea.innerHTML = `<p>Failed to load profile: ${error.message}</p>`;
        displayMessage(`[System] Error loading profile: ${error.message}`);
    }
}


// --- P2P Connection Setup & Signal Handling ---
socket.on('signal_from_peer', (data) => { /* ... */ });
function setupPeerConnectionEvents(peer, targetSocketId) { /* ... */ }

// --- Disconnect/Leave Handlers from Server ---
socket.on('partner_left', (data) => { /* ... */ });
socket.on('host_left_room', (data) => { /* ... */ });
socket.on('player_left_room', (data) => { /* ... */ });


// --- Chat, Game Objects, Input, Collision, Drawing ---
const chatMessages = document.getElementById('chat-messages'); /* ... */
const chatInput = document.getElementById('chat-input'); /* ... */
const PLAYER_SPEED = 3; /* ... */
const BALL_INITIAL_VX = 0; const BALL_INITIAL_VY = 0; /* ... */
const BALL_SPEED_AFTER_KICK = 5; const BALL_FRICTION = 0.995; /* ... */
const GOAL_MOUTH_HEIGHT = 150; const wallThickness = 10; /* ... */
let scoreRed = 0; let scoreBlue = 0; /* ... */

class Ball { constructor(x,y,r,c){this.x=x;this.y=y;this.radius=r;this.color=c;this.vx=BALL_INITIAL_VX;this.vy=BALL_INITIAL_VY; this.initialX = x; this.initialY = y;} draw(ctx){ctx.beginPath();ctx.arc(this.x,this.y,this.radius,0,Math.PI*2);ctx.fillStyle=this.color;ctx.fill();ctx.closePath();} getSpeed(){return Math.sqrt(this.vx*this.vx+this.vy*this.vy);} resetPosition(){this.x = this.initialX; this.y = this.initialY; this.vx = 0; this.vy = 0;}}
class Player { constructor(x,y,r,c,n){this.x=x;this.y=y;this.radius=r;this.color=c;this.nickname=n;this.vx=0;this.vy=0;this.initialX=x;this.initialY=y;} draw(ctx){ctx.beginPath();ctx.arc(this.x,this.y,this.radius,0,Math.PI*2);ctx.fillStyle=this.color;ctx.fill();ctx.closePath();ctx.fillStyle='black';ctx.font='12px Arial';ctx.textAlign='center';ctx.fillText(this.nickname,this.x,this.y+this.radius+15);} resetPosition(){this.x=this.initialX;this.y=this.initialY;this.vx=0;this.vy=0;}}
class Goal { constructor(x,y,w,h,c,isLeft){this.x=x;this.y=y;this.width=w;this.height=h;this.color=c;this.isLeftGoal=isLeft;} draw(ctx){ctx.fillStyle=this.color;if(this.isLeftGoal){ctx.fillRect(this.x-this.width,this.y,this.width,this.height);}else{ctx.fillRect(this.x,this.y,this.width,this.height);}}}
class Wall { constructor(x,y,w,h,c){this.x=x;this.y=y;this.width=w;this.height=h;this.color=c;} draw(ctx){ctx.fillStyle=this.color;ctx.fillRect(this.x,this.y,this.width,this.height);}}

const gameBall = new Ball(canvas.width/2,canvas.height/2,10,'white');
const player1 = new Player(200,canvas.height/2,15,'red', localPlayerNickname); 
const player2 = new Player(canvas.width-200,canvas.height/2,15,'blue','P2 (Peer)');
const players = [player1,player2]; 
const redGoal=new Goal(wallThickness,canvas.height/2-GOAL_MOUTH_HEIGHT/2,5,GOAL_MOUTH_HEIGHT,'rgba(255,100,100,0.3)',true);
const blueGoal=new Goal(canvas.width-wallThickness,canvas.height/2-GOAL_MOUTH_HEIGHT/2,5,GOAL_MOUTH_HEIGHT,'rgba(100,100,255,0.3)',false);
const gameArea={minX:wallThickness,maxX:canvas.width-wallThickness,minY:wallThickness,maxY:canvas.height-wallThickness};
const walls=[new Wall(0,0,canvas.width,wallThickness,'gray'),new Wall(0,canvas.height-wallThickness,canvas.width,wallThickness,'gray'),new Wall(0,wallThickness,wallThickness,redGoal.y-wallThickness,'gray'),new Wall(0,redGoal.y+redGoal.height,wallThickness,canvas.height-wallThickness-(redGoal.y+redGoal.height),'gray'),new Wall(canvas.width-wallThickness,wallThickness,wallThickness,blueGoal.y-wallThickness,'gray'),new Wall(canvas.width-wallThickness,blueGoal.y+blueGoal.height,wallThickness,canvas.height-wallThickness-(blueGoal.y+blueGoal.height),'gray')];
function drawWalls(ctx,wallArray){wallArray.forEach(wall=>wall.draw(ctx));}

const keysPressed = {ArrowUp:false,ArrowDown:false,ArrowLeft:false,ArrowRight:false,w:false,a:false,s:false,d:false};
document.addEventListener('keydown',(e)=>{if(document.activeElement===chatInput)return;if(e.key in keysPressed){keysPressed[e.key]=true;e.preventDefault();}updatePlayer1Velocity();});
document.addEventListener('keyup',(e)=>{if(document.activeElement===chatInput)return;if(e.key in keysPressed){keysPressed[e.key]=false;e.preventDefault();}updatePlayer1Velocity();});
function updatePlayer1Velocity(){player1.vx=0;player1.vy=0;if(keysPressed.ArrowLeft||keysPressed.a)player1.vx=-PLAYER_SPEED;if(keysPressed.ArrowRight||keysPressed.d)player1.vx=PLAYER_SPEED;if((keysPressed.ArrowLeft||keysPressed.a)&&(keysPressed.ArrowRight||keysPressed.d))player1.vx=0;if(keysPressed.ArrowUp||keysPressed.w)player1.vy=-PLAYER_SPEED;if(keysPressed.ArrowDown||keysPressed.s)player1.vy=PLAYER_SPEED;if((keysPressed.ArrowUp||keysPressed.w)&&(keysPressed.ArrowDown||keysPressed.s))player1.vy=0;}

function displayMessage(messageString){const p=document.createElement('p');p.innerHTML=messageString;chatMessages.prepend(p);chatMessages.scrollTop=0;} // Changed to innerHTML for button
chatInput.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();const msg=chatInput.value.trim();if(msg){const nickname=player1.nickname;displayMessage(`[Me] ${nickname}: ${msg}`);Object.values(peerConnections).forEach(peer => {if(peer.connected) peer.send(JSON.stringify({type:'chat',content:msg,senderNickname:nickname}));});chatInput.value='';}}});

function resetLocalGameState() { /* ... */ }
function resetAfterGoal(isTriggeredLocallyByHost) { /* ... */ }
function checkGoal(){ /* ... */ }
function handlePlayerWallCollision(player){ /* ... */ }
function handlePlayerPlayerCollision(p1,p2){ /* ... */ }
function handleBallWallCollision(ball){ /* ... */ }
function handleBallPlayerCollision(ball,player){ /* ... */ }
function gameLoop() { /* ... */ }

// Initial setup
resetLocalGameState(); 
displayMessage("[System]: Welcome! UI interactions via console commands or hypothetical buttons.");
// Example: To test, assuming HTML elements exist with IDs 'leaderboardGameMode', 'viewLeaderboardBtn', etc.
// And functions like createParty, leaveParty, joinRankedQueue('1v1'), partyJoinRankedQueue('2v2'), fetchAndDisplayProfileStats() are callable from console.
gameLoop();
