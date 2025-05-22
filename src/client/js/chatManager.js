// chatManager.js - Gestisce la chat all'interno delle stanze di gioco

export class ChatManager {
    constructor(networkManager, uiManager, authManager) {
        this.networkManager = networkManager;
        this.uiManager = uiManager;
        this.authManager = authManager;
        
        // Stato della chat
        this.messages = [];
        this.isTyping = false;
        this.typingTimeout = null;
        this.unreadMessages = 0;
        this.isChatVisible = true;
        
        // Binding dei metodi
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Ascolta gli eventi dal networkManager
        this.networkManager.on('chatMessageReceived', (messageData) => this.handleChatMessageReceived(messageData));
        this.networkManager.on('playerTyping', (typingData) => this.handlePlayerTyping(typingData));
        
        // Ascolta gli eventi di gioco
        document.addEventListener('gameStarted', () => this.handleGameStarted());
        document.addEventListener('gameEnded', () => this.handleGameEnded());
        
        // Ascolta gli eventi dell'interfaccia utente
        document.addEventListener('DOMContentLoaded', () => {
            // Configura gli elementi della chat
            this.setupChatElements();
        });
    }
    
    // Configurazione degli elementi della chat
    setupChatElements() {
        // Ottieni gli elementi della chat
        const chatInput = document.getElementById('chat-input');
        const chatSendButton = document.getElementById('chat-send-button');
        const chatToggleButton = document.getElementById('chat-toggle-button');
        
        // Configura l'input della chat
        if (chatInput) {
            chatInput.addEventListener('keydown', (event) => {
                // Invia il messaggio quando si preme Invio
                if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    this.sendMessage(chatInput.value);
                    chatInput.value = '';
                }
                
                // Notifica che l'utente sta scrivendo
                if (!this.isTyping) {
                    this.isTyping = true;
                    this.notifyTyping(true);
                    
                    // Resetta lo stato di digitazione dopo un po'
                    clearTimeout(this.typingTimeout);
                    this.typingTimeout = setTimeout(() => {
                        this.isTyping = false;
                        this.notifyTyping(false);
                    }, 3000);
                }
            });
        }
        
        // Configura il pulsante di invio
        if (chatSendButton) {
            chatSendButton.addEventListener('click', () => {
                if (chatInput) {
                    this.sendMessage(chatInput.value);
                    chatInput.value = '';
                }
            });
        }
        
        // Configura il pulsante di toggle
        if (chatToggleButton) {
            chatToggleButton.addEventListener('click', () => {
                this.toggleChatVisibility();
            });
        }
    }
    
    // Gestione degli eventi ricevuti dal networkManager
    handleChatMessageReceived(messageData) {
        console.log("Messaggio ricevuto:", messageData);
        
        // Aggiungi il messaggio alla lista
        this.messages.push(messageData);
        
        // Limita il numero di messaggi memorizzati
        if (this.messages.length > 100) {
            this.messages.shift();
        }
        
        // Aggiorna l'UI della chat
        this.updateChatUI();
        
        // Incrementa il contatore dei messaggi non letti se la chat non è visibile
        if (!this.isChatVisible) {
            this.unreadMessages++;
            this.updateUnreadBadge();
        }
        
        // Riproduci un suono di notifica
        this.playMessageSound(messageData.type);
    }
    
    handlePlayerTyping(typingData) {
        console.log("Giocatore sta scrivendo:", typingData);
        
        // Aggiorna l'UI per mostrare che il giocatore sta scrivendo
        this.updateTypingIndicator(typingData.nickname, typingData.isTyping);
    }
    
    // Gestione degli eventi di gioco
    handleGameStarted() {
        console.log("Partita iniziata, reset della chat");
        
        // Pulisci la chat all'inizio di una nuova partita
        this.messages = [];
        this.unreadMessages = 0;
        
        // Aggiorna l'UI della chat
        this.updateChatUI();
        this.updateUnreadBadge();
        
        // Aggiungi un messaggio di sistema
        this.addSystemMessage("La partita è iniziata! Buona fortuna a tutti!");
    }
    
    handleGameEnded() {
        console.log("Partita terminata");
        
        // Aggiungi un messaggio di sistema
        this.addSystemMessage("La partita è terminata. Grazie per aver giocato!");
    }
    
    // Metodi per la gestione della chat
    sendMessage(text) {
        if (!text || text.trim() === '') return;
        
        console.log("Invio messaggio:", text);
        
        // Verifica se l'utente è autenticato
        const nickname = this.authManager.isLoggedIn() 
            ? this.authManager.getUser().nickname 
            : 'Ospite' + Math.floor(Math.random() * 1000);
        
        // Crea i dati del messaggio
        const messageData = {
            id: 'msg_' + Math.random().toString(36).substr(2, 9),
            sender: nickname,
            text: text.trim(),
            timestamp: Date.now(),
            type: 'user'
        };
        
        // Aggiungi il messaggio alla lista
        this.messages.push(messageData);
        
        // Aggiorna l'UI della chat
        this.updateChatUI();
        
        // Invia il messaggio tramite il networkManager
        this.networkManager.sendChatMessage(messageData);
        
        // Resetta lo stato di digitazione
        this.isTyping = false;
        clearTimeout(this.typingTimeout);
        this.notifyTyping(false);
    }
    
    addSystemMessage(text) {
        // Crea i dati del messaggio di sistema
        const messageData = {
            id: 'sys_' + Math.random().toString(36).substr(2, 9),
            sender: 'Sistema',
            text: text,
            timestamp: Date.now(),
            type: 'system'
        };
        
        // Aggiungi il messaggio alla lista
        this.messages.push(messageData);
        
        // Aggiorna l'UI della chat
        this.updateChatUI();
    }
    
    notifyTyping(isTyping) {
        // Verifica se l'utente è autenticato
        const nickname = this.authManager.isLoggedIn() 
            ? this.authManager.getUser().nickname 
            : 'Ospite' + Math.floor(Math.random() * 1000);
        
        // Invia la notifica tramite il networkManager
        this.networkManager.sendTypingNotification({
            nickname: nickname,
            isTyping: isTyping
        });
    }
    
    toggleChatVisibility() {
        // Cambia lo stato di visibilità della chat
        this.isChatVisible = !this.isChatVisible;
        
        // Aggiorna l'UI
        const chatContainer = document.getElementById('chat-container');
        if (chatContainer) {
            chatContainer.classList.toggle('hidden', !this.isChatVisible);
        }
        
        // Se la chat diventa visibile, resetta il contatore dei messaggi non letti
        if (this.isChatVisible) {
            this.unreadMessages = 0;
            this.updateUnreadBadge();
        }
    }
    
    // Metodi per l'aggiornamento dell'UI
    updateChatUI() {
        // Ottieni il container dei messaggi
        const messagesContainer = document.getElementById('chat-messages');
        if (!messagesContainer) return;
        
        // Pulisci il container
        messagesContainer.innerHTML = '';
        
        // Aggiungi ogni messaggio al container
        this.messages.forEach(message => {
            const messageElement = document.createElement('div');
            messageElement.className = `chat-message ${message.type}-message`;
            
            // Formatta l'orario
            const date = new Date(message.timestamp);
            const timeString = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
            
            // Crea il contenuto del messaggio
            messageElement.innerHTML = `
                <span class="message-time">[${timeString}]</span>
                <span class="message-sender">${message.sender}:</span>
                <span class="message-text">${this.formatMessageText(message.text)}</span>
            `;
            
            // Aggiungi il messaggio al container
            messagesContainer.appendChild(messageElement);
        });
        
        // Scorri alla fine dei messaggi
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    updateTypingIndicator(nickname, isTyping) {
        // Ottieni l'indicatore di digitazione
        const typingIndicator = document.getElementById('typing-indicator');
        if (!typingIndicator) return;
        
        if (isTyping) {
            // Mostra l'indicatore
            typingIndicator.textContent = `${nickname} sta scrivendo...`;
            typingIndicator.style.display = 'block';
        } else {
            // Nascondi l'indicatore
            typingIndicator.style.display = 'none';
        }
    }
    
    updateUnreadBadge() {
        // Ottieni il badge dei messaggi non letti
        const unreadBadge = document.getElementById('chat-unread-badge');
        if (!unreadBadge) return;
        
        if (this.unreadMessages > 0) {
            // Mostra il badge con il numero di messaggi non letti
            unreadBadge.textContent = this.unreadMessages > 99 ? '99+' : this.unreadMessages;
            unreadBadge.style.display = 'block';
        } else {
            // Nascondi il badge
            unreadBadge.style.display = 'none';
        }
    }
    
    // Metodi di supporto
    formatMessageText(text) {
        // Sostituisci gli URL con link cliccabili
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        return text.replace(urlRegex, url => `<a href="${url}" target="_blank">${url}</a>`);
    }
    
    playMessageSound(type) {
        // Riproduci un suono in base al tipo di messaggio
        try {
            let soundFile;
            
            switch (type) {
                case 'system':
                    soundFile = '/assets/sounds/system-message.mp3';
                    break;
                case 'team':
                    soundFile = '/assets/sounds/team-message.mp3';
                    break;
                case 'private':
                    soundFile = '/assets/sounds/private-message.mp3';
                    break;
                default:
                    soundFile = '/assets/sounds/message.mp3';
            }
            
            const audio = new Audio(soundFile);
            audio.volume = 0.5;
            audio.play();
        } catch (error) {
            console.error("Errore nella riproduzione del suono:", error);
        }
    }
    
    // Metodi per test e debug
    simulateIncomingMessage(sender, text, type = 'user') {
        // Simula un messaggio in arrivo
        this.handleChatMessageReceived({
            id: 'sim_' + Math.random().toString(36).substr(2, 9),
            sender: sender,
            text: text,
            timestamp: Date.now(),
            type: type
        });
    }
    
    getChatState() {
        // Restituisce lo stato corrente della chat
        return {
            messages: this.messages.length,
            isTyping: this.isTyping,
            unreadMessages: this.unreadMessages,
            isChatVisible: this.isChatVisible
        };
    }
}
