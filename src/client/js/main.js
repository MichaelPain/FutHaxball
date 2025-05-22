// main.js - File principale per l'inizializzazione e la gestione del gioco

// Importa i moduli necessari
import { AuthManager } from './authManager.js';
import { NetworkManager } from './networkManager.js';
import { RoomManager } from './roomManager.js';
import { UIManager } from './uiManager.js';
import { LeaderboardManager } from './ui/leaderboard.js';
import { InputHandler } from './inputHandler.js';
import { GameManager } from './gameManager.js';
import { GamePhysics } from './gamePhysics.js';
import { RoomListUI } from './roomListUI.js';
import { RoomUI } from './roomUI.js';
import { FieldRenderer } from './fieldRenderer.js';
import { EventsManager } from './ui/events.js';
import { SettingsManager } from './ui/settings.js';
import { ProfileManager } from './ui/profile.js';
import { RankedMatchmaking } from './rankedMatchmaking.js';
import { GameSetupMenu } from './gameSetupMenu.js';
import { CreateRoomScreen } from './createRoomScreen.js';
import { RankedMatchmakingScreen } from './rankedMatchmakingScreen.js';
import { PlayerController } from './playerController.js';
import { GameRules } from './gameRules.js';

// Variabili globali
let authManager;
let networkManager;
let roomManager;
let uiManager;
let roomListUI;
let roomUI;
let gameManager;
let gameField;
let currentRoom;
let inputHandler;
let gamePhysics;
let eventsManager;
let settingsManager;
let profileManager;
let rankedMatchmaking;
let gameSetupMenu;
let createRoomScreen;
let rankedMatchmakingScreen;
let playerController;
let gameRules;
let userSettings = {
    graphics: {
        quality: 'high',
        particleEffects: true,
        dynamicShadows: true
    },
    audio: {
        soundEffects: true,
        volume: 80
    },
    gameplay: {
        showNicknames: true,
        autoReplays: true,
        possessionIndicator: true
    }
};
let currentMatch = null;
let isRoomHost = false;

// Funzione principale
document.addEventListener('DOMContentLoaded', () => {
    // Inizializza i gestori principali
    initManagers();
    
    // Mostra la schermata di caricamento
    uiManager.showScreen('loading-screen');
    
    // Utilizziamo Promise.all per attendere che tutti i componenti siano inizializzati
    Promise.all([
        new Promise(resolve => {
            // Verifica che networkManager sia connesso
            if (networkManager.connected) {
                resolve();
            } else {
                networkManager.on('connected', () => resolve());
            }
        }),
        // Aggiungi altre promesse per altri componenti se necessario
    ])
    .then(() => {
        console.log("Tutti i componenti sono stati inizializzati con successo");
        // Ora che tutti i componenti sono inizializzati, procedi
        if (authManager.isLoggedIn()) {
            // Mostra il menu principale
            uiManager.showScreen('main-menu-screen');
            
            // Inizializza il menu principale
            initMainMenu();
        } else {
            // Mostra la schermata di autenticazione
            uiManager.showScreen('auth-screen');
            
            // Inizializza la schermata di autenticazione
            initAuthScreen();
        }
    })
    .catch(error => {
        console.error('Errore durante l\'inizializzazione:', error);
        // Mostra un messaggio di errore all'utente
        uiManager.showNotification('Si è verificato un errore durante il caricamento. Ricarica la pagina.', 'error');
    });
});

// Inizializza tutti i gestori necessari
function initManagers() {
    // Inizializza prima il gestore dell'interfaccia utente
    uiManager = new UIManager();
    uiManager.init();
    
    // Inizializza il gestore dell'autenticazione passando uiManager
    authManager = new AuthManager(uiManager);
    
    // Inizializza il gestore della rete
    networkManager = new NetworkManager();
    
    // Inizializza il gestore del gioco
    gameManager = new GameManager(networkManager, uiManager);
    gameManager.init();
    
    // Inizializza la fisica del gioco
    gamePhysics = new GamePhysics();
    
    // Inizializza le regole del gioco
    gameRules = new GameRules(gameManager);
    
    // Inizializza il controller del giocatore
    playerController = new PlayerController(gameManager);
    
    // Inizializza il gestore delle stanze con il gameManager
    roomManager = new RoomManager(networkManager, uiManager, authManager, gameManager);
    
    // Inizializza il gestore degli input con il gameManager
    inputHandler = new InputHandler(gameManager);
    inputHandler.init();
    
    // Inizializza i componenti UI avanzati
    eventsManager = new EventsManager(authManager, uiManager);
    settingsManager = new SettingsManager(userSettings, uiManager);
    profileManager = new ProfileManager(uiManager, authManager, networkManager);
    
    // Inizializza il gestore delle classifiche
    const leaderboardManager = new LeaderboardManager(uiManager, authManager);
    
    // Inizializza il gestore del matchmaking ranked
    rankedMatchmaking = new RankedMatchmaking(networkManager, uiManager, authManager, gameManager);
    
    // Inizializza il menu di configurazione del gioco
    gameSetupMenu = new GameSetupMenu();
    
    // Inizializza le nuove classi per la creazione stanza e il matchmaking ranked
    createRoomScreen = new CreateRoomScreen(uiManager, roomManager);
    rankedMatchmakingScreen = new RankedMatchmakingScreen(uiManager, rankedMatchmaking);
    
    // Configura gli event listener globali
    setupGlobalEventListeners();
    
    // Inizializza le funzioni globali per l'accesso ai componenti UI
    window.initLeaderboard = () => {
        leaderboardManager.initUI();
    };
    
    window.initSettings = () => {
        settingsManager.initUI();
    };
    
    window.initProfileScreen = () => {
        profileManager.initUI();
    };
    
    window.initEventsScreen = () => {
        eventsManager.init();
    };
    
    window.initRankedMatchmaking = () => {
        rankedMatchmakingScreen.init();
    };
    
    window.initCreateRoomScreen = () => {
        createRoomScreen.init();
    };
    
    // Inizializza la gestione delle stanze
    window.initRoomsScreen = () => {
        // Configura il pulsante "Crea Stanza" nella schermata delle stanze
        const createRoomBtn = document.querySelector('.create-room-btn');
        if (createRoomBtn) {
            // Rimuovi eventuali listener precedenti
            const newBtn = createRoomBtn.cloneNode(true);
            createRoomBtn.parentNode.replaceChild(newBtn, createRoomBtn);
            
            // Aggiungi il nuovo listener
            newBtn.addEventListener('click', () => {
                uiManager.showScreen('create-room-screen');
            });
        }
        
        // Carica le stanze disponibili
        roomManager.fetchRooms();
    };
}

// Configura gli event listener globali
function setupGlobalEventListeners() {
    // Event listener per la creazione di una stanza
    document.addEventListener('createRoom', (event) => {
        const roomId = roomManager.createRoom(event.detail);
        
        // Verifica che la stanza sia stata creata correttamente
        if (roomId) {
            // Mostra una notifica
            uiManager.showNotification('Stanza creata con successo!', 'success');
            
            // Non reindirizzare qui, lasciamo che sia roomManager.handleRoomJoined() a farlo
            // per evitare conflitti di navigazione
        } else {
            uiManager.showNotification('Errore nella creazione della stanza', 'error');
        }
    });
    
    // Event listener per entrare in una stanza
    document.addEventListener('joinRoom', (event) => {
        roomManager.joinRoom(event.detail.roomId, event.detail.password);
    });
    
    // Event listener per uscire da una stanza
    document.addEventListener('leaveRoom', () => {
        roomManager.leaveRoom();
    });
    
    // Event listener per cambiare squadra
    document.addEventListener('changeTeam', (event) => {
        roomManager.changeTeam(event.detail.team);
    });
    
    // Event listener per avviare una partita
    document.addEventListener('startGame', () => {
        roomManager.startGame();
    });
    
    // Event listener per fermare una partita
    document.addEventListener('stopGame', () => {
        roomManager.stopGame();
    });
    
    // Event listener per inviare un messaggio in chat
    document.addEventListener('sendChatMessage', (event) => {
        networkManager.sendChatMessage(roomManager.currentRoom?.id, event.detail.message);
    });
    
    // Event listener per le opzioni del menu principale
    document.addEventListener('menuOptionSelected', (event) => {
        handleMenuOption(event.detail.action);
    });
    
    // Event listener per il goal
    document.addEventListener('goalScored', (event) => {
        gameRules.handleGoal(event.detail.team, event.detail.scorerId);
    });
    
    // Event listener per la fine della partita
    document.addEventListener('gameEnded', (event) => {
        gameManager.endGame();
    });
}

// Inizializza la schermata di autenticazione
function initAuthScreen() {
    const authTabs = document.querySelectorAll('.auth-tab');
    const authForms = document.querySelectorAll('.auth-form');
    
    // Gestisci i tab di autenticazione
    authTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.getAttribute('data-tab');
            
            // Rimuovi la classe active da tutti i tab
            authTabs.forEach(t => t.classList.remove('active'));
            
            // Aggiungi la classe active al tab corrente
            tab.classList.add('active');
            
            // Nascondi tutti i form
            authForms.forEach(form => form.style.display = 'none');
            
            // Mostra il form corrispondente
            document.getElementById(`${tabName}-form`).style.display = 'block';
        });
    });
    
    // Gestisci il link per il recupero password
    const forgotPasswordLink = document.getElementById('forgot-password');
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', () => {
            // Nascondi tutti i form
            authForms.forEach(form => form.style.display = 'none');
            
            // Mostra il form di recupero password
            document.getElementById('forgot-form').style.display = 'block';
        });
    }
    
    // Gestisci il link per tornare al login
    const backToLoginLink = document.getElementById('back-to-login');
    if (backToLoginLink) {
        backToLoginLink.addEventListener('click', () => {
            // Nascondi tutti i form
            authForms.forEach(form => form.style.display = 'none');
            
            // Mostra il form di login
            document.getElementById('login-form').style.display = 'block';
            
            // Attiva il tab di login
            authTabs.forEach(t => t.classList.remove('active'));
            document.querySelector('[data-tab="login"]').classList.add('active');
        });
    }
    
    // Gestisci il form di login
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        const loginButton = document.getElementById('login-button');
        
        loginButton.addEventListener('click', () => {
            // Ottieni i dati dal form
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            const rememberMe = document.getElementById('remember-me').checked;
            
            // Validazione dei campi
            let isValid = true;
            
            if (!email) {
                document.getElementById('login-email-error').textContent = 'Inserisci la tua email';
                isValid = false;
            } else {
                document.getElementById('login-email-error').textContent = '';
            }
            
            if (!password) {
                document.getElementById('login-password-error').textContent = 'Inserisci la tua password';
                isValid = false;
            } else {
                document.getElementById('login-password-error').textContent = '';
            }
            
            if (isValid) {
                // Mostra un messaggio di caricamento
                document.getElementById('login-button').textContent = 'Accesso in corso...';
                
                // Effettua il login
                authManager.login(email, password, rememberMe)
                    .then(() => {
                        // Login riuscito
                        uiManager.showNotification('Login effettuato con successo', 'success');
                        
                        // Reindirizza al menu principale
                        uiManager.showScreen('main-menu-screen');
                        
                        // Inizializza il menu principale
                        initMainMenu();
                    })
                    .catch(error => {
                        // Login fallito
                        document.getElementById('login-error').textContent = error.message || 'Credenziali non valide';
                        document.getElementById('login-button').textContent = 'Accedi';
                    });
            }
        });
    }
    
    // Gestisci il form di registrazione
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        const registerButton = document.getElementById('register-button');
        
        registerButton.addEventListener('click', () => {
            // Ottieni i dati dal form
            const nickname = document.getElementById('register-nickname').value;
            const email = document.getElementById('register-email').value;
            const password = document.getElementById('register-password').value;
            const confirmPassword = document.getElementById('register-confirm-password').value;
            
            // Validazione dei campi
            let isValid = true;
            
            if (!nickname) {
                document.getElementById('register-nickname-error').textContent = 'Inserisci un nickname';
                isValid = false;
            } else {
                document.getElementById('register-nickname-error').textContent = '';
            }
            
            if (!email) {
                document.getElementById('register-email-error').textContent = 'Inserisci la tua email';
                isValid = false;
            } else {
                document.getElementById('register-email-error').textContent = '';
            }
            
            if (!password) {
                document.getElementById('register-password-error').textContent = 'Inserisci una password';
                isValid = false;
            } else {
                document.getElementById('register-password-error').textContent = '';
            }
            
            if (password !== confirmPassword) {
                document.getElementById('register-confirm-password-error').textContent = 'Le password non coincidono';
                isValid = false;
            } else {
                document.getElementById('register-confirm-password-error').textContent = '';
            }
            
            if (isValid) {
                // Mostra un messaggio di caricamento
                document.getElementById('register-button').textContent = 'Registrazione in corso...';
                
                // Effettua la registrazione
                authManager.register(nickname, email, password)
                    .then(() => {
                        // Registrazione riuscita
                        uiManager.showNotification('Registrazione effettuata con successo', 'success');
                        
                        // Reindirizza al menu principale
                        uiManager.showScreen('main-menu-screen');
                        
                        // Inizializza il menu principale
                        initMainMenu();
                    })
                    .catch(error => {
                        // Registrazione fallita
                        document.getElementById('register-error').textContent = error.message || 'Errore durante la registrazione';
                        document.getElementById('register-button').textContent = 'Registrati';
                    });
            }
        });
    }
    
    // Gestisci il form di recupero password
    const forgotForm = document.getElementById('forgot-form');
    if (forgotForm) {
        const forgotButton = document.getElementById('forgot-button');
        
        forgotButton.addEventListener('click', () => {
            // Ottieni i dati dal form
            const email = document.getElementById('forgot-email').value;
            
            // Validazione dei campi
            let isValid = true;
            
            if (!email) {
                document.getElementById('forgot-email-error').textContent = 'Inserisci la tua email';
                isValid = false;
            } else {
                document.getElementById('forgot-email-error').textContent = '';
            }
            
            if (isValid) {
                // Mostra un messaggio di caricamento
                document.getElementById('forgot-button').textContent = 'Invio in corso...';
                
                // Effettua il recupero password
                authManager.forgotPassword(email)
                    .then(() => {
                        // Recupero password riuscito
                        uiManager.showNotification('Email di recupero inviata con successo', 'success');
                        
                        // Torna al form di login
                        document.getElementById('forgot-form').style.display = 'none';
                        document.getElementById('login-form').style.display = 'block';
                        
                        // Attiva il tab di login
                        authTabs.forEach(t => t.classList.remove('active'));
                        document.querySelector('[data-tab="login"]').classList.add('active');
                        
                        // Resetta il form
                        document.getElementById('forgot-button').textContent = 'Invia';
                    })
                    .catch(error => {
                        // Recupero password fallito
                        document.getElementById('forgot-error').textContent = error.message || 'Errore durante l\'invio dell\'email';
                        document.getElementById('forgot-button').textContent = 'Invia';
                    });
            }
        });
    }
}

// Inizializza il menu principale
function initMainMenu() {
    const menuOptions = document.querySelectorAll('.menu-option');
    
    // Gestisci le opzioni del menu
    menuOptions.forEach(option => {
        option.addEventListener('click', () => {
            const action = option.getAttribute('data-action');
            
            // Emetti un evento di selezione opzione
            const event = new CustomEvent('menuOptionSelected', {
                detail: { action }
            });
            document.dispatchEvent(event);
        });
    });
}

// Gestisci le opzioni del menu principale
function handleMenuOption(action) {
    switch (action) {
        case 'play':
            // Mostra la schermata di gioco
            uiManager.showScreen('play-screen');
            break;
        case 'rooms':
            // Mostra la schermata delle stanze
            uiManager.showScreen('rooms-screen');
            break;
        case 'ranked':
            // Mostra la schermata del matchmaking ranked
            uiManager.showScreen('ranked-matchmaking-screen');
            break;
        case 'profile':
            // Mostra la schermata del profilo
            uiManager.showScreen('profile-screen');
            break;
        case 'leaderboard':
            // Mostra la schermata delle classifiche
            uiManager.showScreen('leaderboard-screen');
            break;
        case 'events':
            // Mostra la schermata degli eventi
            uiManager.showScreen('events-screen');
            break;
        case 'settings':
            // Mostra la schermata delle impostazioni
            uiManager.showScreen('settings-screen');
            break;
        case 'logout':
            // Effettua il logout
            authManager.logout()
                .then(() => {
                    // Logout riuscito
                    uiManager.showNotification('Logout effettuato con successo', 'success');
                    
                    // Reindirizza alla schermata di autenticazione
                    uiManager.showScreen('auth-screen');
                    
                    // Inizializza la schermata di autenticazione
                    initAuthScreen();
                })
                .catch(error => {
                    // Logout fallito
                    uiManager.showNotification('Errore durante il logout', 'error');
                });
            break;
        default:
            console.warn(`Azione sconosciuta: ${action}`);
    }
}

// Screen management functions
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.style.display = 'none';
    });
    const screen = document.getElementById(screenId);
    if (screen) {
        screen.style.display = 'block';
    }
}

function hideScreen(screenId) {
    const screen = document.getElementById(screenId);
    if (screen) {
        screen.style.display = 'none';
    }
}

// Error handling function
function showError(message) {
    const errorContainer = document.getElementById('error-container');
    if (errorContainer) {
        errorContainer.textContent = message;
        errorContainer.style.display = 'block';
        setTimeout(() => {
            errorContainer.style.display = 'none';
        }, 3000);
    } else {
        console.error(message);
    }
}

// Set up all event listeners
function setupEventListeners() {
    // Match acceptance screen handlers
    const acceptMatchBtn = document.getElementById('accept-match-btn');
    const declineMatchBtn = document.getElementById('decline-match-btn');
    
    if (acceptMatchBtn) {
        acceptMatchBtn.addEventListener('click', () => {
            if (currentMatch) {
                networkManager.acceptMatch(currentMatch.id);
                hideScreen('match-accept-screen');
            }
        });
    }
    
    if (declineMatchBtn) {
        declineMatchBtn.addEventListener('click', () => {
            if (currentMatch) {
                networkManager.declineMatch(currentMatch.id);
                hideScreen('match-accept-screen');
            }
        });
    }

    // Room screen handlers
    const leaveRoomBtn = document.getElementById('leave-room');
    const startGameBtn = document.getElementById('start-game');
    const sendMessageBtn = document.getElementById('send-message');
    
    if (leaveRoomBtn) {
        leaveRoomBtn.addEventListener('click', () => {
            networkManager.leaveRoom();
            hideScreen('room-screen');
            showScreen('main-menu-screen');
        });
    }
    
    if (startGameBtn) {
        startGameBtn.addEventListener('click', () => {
            if (isRoomHost) {
                networkManager.startGame();
            }
        });
    }
    
    if (sendMessageBtn) {
        sendMessageBtn.addEventListener('click', () => {
            const message = document.getElementById('chat-input')?.value.trim();
            if (message) {
                networkManager.sendChatMessage(message);
                document.getElementById('chat-input').value = '';
            }
        });
    }

    // Play screen handlers
    document.querySelectorAll('.play-option').forEach(option => {
        option.addEventListener('click', () => {
            const mode = option.dataset.mode;
            switch (mode) {
                case 'quick':
                    networkManager.joinQuickGame();
                    break;
                case 'ranked':
                    showScreen('ranked-matchmaking-screen');
                    break;
                case 'custom':
                    showScreen('rooms-screen');
                    break;
            }
        });
    });

    // Team selection handlers
    document.querySelectorAll('.team-join-btn').forEach(button => {
        button.addEventListener('click', () => {
            const team = button.dataset.team;
            networkManager.joinTeam(team);
        });
    });

    // Room settings handlers
    const timeLimitSelect = document.getElementById('time-limit');
    const scoreLimitSelect = document.getElementById('score-limit');
    const fieldTypeSelect = document.getElementById('field-type');

    if (timeLimitSelect) {
        timeLimitSelect.addEventListener('change', (e) => {
            networkManager.updateRoomSettings({ timeLimit: parseInt(e.target.value) });
        });
    }

    if (scoreLimitSelect) {
        scoreLimitSelect.addEventListener('change', (e) => {
            networkManager.updateRoomSettings({ scoreLimit: parseInt(e.target.value) });
        });
    }

    if (fieldTypeSelect) {
        fieldTypeSelect.addEventListener('change', (e) => {
            networkManager.updateRoomSettings({ fieldType: e.target.value });
        });
    }
}

// Function to update room player count
function updateRoomPlayerCount(count, max) {
    const playerCountElement = document.getElementById('room-players');
    if (playerCountElement) {
        playerCountElement.textContent = `${count}/${max}`;
    }
}

// Function to update team players
function updateTeamPlayers(team, players) {
    const teamElement = document.getElementById(`${team}-team-players`);
    if (teamElement) {
        teamElement.innerHTML = '';
        players.forEach(player => {
            const playerElement = document.createElement('div');
            playerElement.className = 'player';
            playerElement.textContent = player.name;
            teamElement.appendChild(playerElement);
        });
    }
}

// Function to update room settings
function updateRoomSettings(settings) {
    const timeLimitSelect = document.getElementById('time-limit');
    const scoreLimitSelect = document.getElementById('score-limit');
    const fieldTypeSelect = document.getElementById('field-type');

    if (timeLimitSelect) timeLimitSelect.value = settings.timeLimit;
    if (scoreLimitSelect) scoreLimitSelect.value = settings.scoreLimit;
    if (fieldTypeSelect) fieldTypeSelect.value = settings.fieldType;
}
