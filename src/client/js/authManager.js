// authManager.js - Gestisce l'autenticazione e la gestione degli utenti

export class AuthManager {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.token = null;
        this.user = null;
        this.loginAttempts = {};
        this.maxLoginAttempts = 5;
        this.lockoutDuration = 15 * 60 * 1000; // 15 minuti in millisecondi
        
        // Controlla se c'è un token salvato
        this.checkSavedToken();
    }
    
    checkSavedToken() {
        // Controlla se c'è un token salvato nel localStorage
        const savedToken = localStorage.getItem('authToken');
        if (savedToken) {
            this.token = savedToken;
            this.validateToken();
        }
    }
    
    validateToken() {
        // Per la versione di sviluppo, simuliamo la validazione del token
        // In produzione, questa funzione dovrebbe fare una richiesta al server
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                if (this.token) {
                    // Simula un utente autenticato
                    this.user = {
                        id: 'user123',
                        nickname: 'Giocatore' + Math.floor(Math.random() * 1000),
                        email: 'user@example.com',
                        country: 'IT',
                        registrationDate: new Date().toISOString()
                    };
                    
                    if (this.uiManager) {
                        this.uiManager.showNotification('Bentornato, ' + this.user.nickname, 'success');
                    }
                    
                    resolve(this.user);
                } else {
                    reject(new Error('Token non valido'));
                }
            }, 500);
        });
    }
    
    validatePassword(password) {
        const minLength = 8;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
        
        const errors = [];
        if (password.length < minLength) errors.push(`La password deve essere lunga almeno ${minLength} caratteri`);
        if (!hasUpperCase) errors.push('La password deve contenere almeno una lettera maiuscola');
        if (!hasLowerCase) errors.push('La password deve contenere almeno una lettera minuscola');
        if (!hasNumbers) errors.push('La password deve contenere almeno un numero');
        if (!hasSpecialChar) errors.push('La password deve contenere almeno un carattere speciale');
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }

    validateEmail(email) {
        const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
        return emailRegex.test(email);
    }

    isUserLocked(email) {
        const attempts = this.loginAttempts[email];
        if (!attempts) return false;
        
        const isLocked = attempts.count >= this.maxLoginAttempts && 
                        (Date.now() - attempts.lastAttempt) < this.lockoutDuration;
        
        if (!isLocked && attempts.count >= this.maxLoginAttempts) {
            // Reset attempts if lockout period has passed
            delete this.loginAttempts[email];
        }
        
        return isLocked;
    }

    recordLoginAttempt(email, success) {
        if (!this.loginAttempts[email]) {
            this.loginAttempts[email] = { count: 0, lastAttempt: Date.now() };
        }
        
        if (!success) {
            this.loginAttempts[email].count++;
            this.loginAttempts[email].lastAttempt = Date.now();
        } else {
            delete this.loginAttempts[email]; // Reset on successful login
        }
    }

    login(email, password, rememberMe = false) {
        return new Promise((resolve, reject) => {
            // Validazione input
            if (!email || !password) {
                reject(new Error('Email e password sono richieste'));
                return;
            }

            if (!this.validateEmail(email)) {
                reject(new Error('Formato email non valido'));
                return;
            }

            // Controlla il lockout
            if (this.isUserLocked(email)) {
                const remainingTime = Math.ceil((this.lockoutDuration - 
                    (Date.now() - this.loginAttempts[email].lastAttempt)) / 60000);
                reject(new Error(`Account temporaneamente bloccato. Riprova tra ${remainingTime} minuti`));
                return;
            }

            // Per la versione di sviluppo, simuliamo il login
            setTimeout(() => {
                // Simula la validazione delle credenziali
                const success = email && password;
                this.recordLoginAttempt(email, success);

                if (success) {
                    // Genera un token JWT-like
                    const tokenPayload = {
                        uid: 'user123',
                        email: email,
                        exp: Date.now() + (24 * 60 * 60 * 1000) // 24 ore
                    };
                    this.token = 'JWT_' + btoa(JSON.stringify(tokenPayload));
                    
                    this.user = {
                        id: 'user123',
                        nickname: 'Giocatore' + Math.floor(Math.random() * 1000),
                        email: email,
                        country: 'IT',
                        registrationDate: new Date().toISOString()
                    };
                    
                    if (rememberMe) {
                        // Salva il token in modo più sicuro
                        try {
                            localStorage.setItem('authToken', this.token);
                            localStorage.setItem('tokenExpiry', tokenPayload.exp.toString());
                        } catch (e) {
                            console.error('Errore nel salvataggio del token:', e);
                        }
                    }
                    
                    if (this.uiManager) {
                        this.uiManager.showNotification('Login effettuato con successo', 'success');
                    }
                    
                    resolve(this.user);
                } else {
                    const attempts = this.loginAttempts[email]?.count || 0;
                    const remaining = this.maxLoginAttempts - attempts;
                    reject(new Error(`Credenziali non valide. Tentativi rimanenti: ${remaining}`));
                }
            }, 1000);
        });
    }
    
    loginAsGuest() {
        // Per la versione di sviluppo, simuliamo il login come ospite
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                // Genera un token fittizio
                this.token = 'guest_token_' + Math.random().toString(36).substr(2);
                
                // Simula un utente ospite
                this.user = {
                    id: 'guest_' + Math.random().toString(36).substr(2),
                    nickname: 'Ospite' + Math.floor(Math.random() * 1000),
                    isGuest: true
                };
                
                // Mostra una notifica di successo
                if (this.uiManager) {
                    this.uiManager.showNotification('Accesso come ospite effettuato', 'success');
                }
                
                resolve(this.user);
            }, 500);
        });
    }
    
    register(nickname, email, password) {
        return new Promise((resolve, reject) => {
            // Validazione input
            if (!nickname || !email || !password) {
                reject(new Error('Tutti i campi sono obbligatori'));
                return;
            }

            if (!this.validateEmail(email)) {
                reject(new Error('Formato email non valido'));
                return;
            }

            const passwordValidation = this.validatePassword(password);
            if (!passwordValidation.isValid) {
                reject(new Error(passwordValidation.errors.join('\n')));
                return;
            }

            // Per la versione di sviluppo, simuliamo la registrazione
            setTimeout(() => {
                resolve({
                    success: true,
                    message: 'Registrazione completata! Controlla la tua email per verificare l\'account.'
                });
            }, 1500);
        });
    }
    
    logout() {
        // Rimuovi il token e i dati utente
        this.token = null;
        this.user = null;
        localStorage.removeItem('authToken');
        
        // Mostra una notifica di successo
        if (this.uiManager) {
            this.uiManager.showNotification('Logout effettuato con successo', 'success');
        }
        
        return Promise.resolve();
    }
    
    requestPasswordReset(email) {
        // Per la versione di sviluppo, simuliamo la richiesta di reset password
        // In produzione, questa funzione dovrebbe fare una richiesta al server
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                // Simula la validazione dell'email
                if (email) {
                    // Simula una richiesta riuscita
                    resolve({
                        success: true,
                        message: 'Istruzioni per il reset della password inviate alla tua email'
                    });
                } else {
                    reject(new Error('Email non valida'));
                }
            }, 1000);
        });
    }
    
    updateProfile(userData) {
        // Verifica che l'utente sia autenticato
        if (!this.token) {
            return Promise.reject(new Error('Devi effettuare il login per aggiornare il profilo'));
        }
        
        // Per la versione di sviluppo, simuliamo l'aggiornamento del profilo
        // In produzione, questa funzione dovrebbe fare una richiesta al server
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                // Aggiorna i dati utente
                this.user = { ...this.user, ...userData };
                
                // Mostra una notifica di successo
                if (this.uiManager) {
                    this.uiManager.showNotification('Profilo aggiornato con successo', 'success');
                }
                
                resolve({ user: this.user });
            }, 1000);
        });
    }
    
    changePassword(currentPassword, newPassword) {
        // Verifica che l'utente sia autenticato
        if (!this.token) {
            return Promise.reject(new Error('Devi effettuare il login per cambiare la password'));
        }
        
        // Per la versione di sviluppo, simuliamo il cambio password
        // In produzione, questa funzione dovrebbe fare una richiesta al server
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                // Simula la validazione della password corrente
                if (currentPassword && newPassword) {
                    // Simula un cambio password riuscito
                    resolve({
                        success: true,
                        message: 'Password cambiata con successo'
                    });
                } else {
                    reject(new Error('Password non valide'));
                }
            }, 1000);
        });
    }
    
    // Getter per verificare lo stato di autenticazione
    isLoggedIn() {
        // Verifica che il token esista e sia valido
        return this.token !== null && this.user !== null;
    }
    
    getUser() {
        return this.user;
    }
    
    getToken() {
        return this.token;
    }
}
