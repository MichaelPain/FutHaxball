/**
 * Sistema di gestione dell'autenticazione per l'interfaccia utente
 */
import i18n from '../utils/i18n.js';
import eventManager from '../utils/eventManager.js'; // Corrected path

class AuthUI {
  constructor(authManager, screenManager) {
    this.authManager = authManager;
    this.screenManager = screenManager;
    this.currentForm = 'login';
    this.loginAttempts = 0;
    this.maxLoginAttempts = 5;
    this.lockoutTime = 15 * 60 * 1000; // 15 minuti
    this.lockoutEndTime = null;
    
    // Inizializza gli elementi UI
    this.initElements();
    
    // Registra gli event listener
    this.registerEventListeners();
    
    // Inizializza il validatore di password
    this.initPasswordValidator();

    // Apply initial translations
    this.translateUIElements();

    // Listen for language changes
    eventManager.on('language:change', this.translateUIElements.bind(this));
  }
  
  translateUIElements() {
    // Loading screen
    const loadingScreenText = document.querySelector('#loading-screen p');
    if (loadingScreenText) {
      loadingScreenText.textContent = i18n.t('common.loading');
    }

    // Auth Tabs
    if (this.loginTab) this.loginTab.textContent = i18n.t('auth.login.title');
    if (this.registerTab) this.registerTab.textContent = i18n.t('auth.register.title');

    // Login Form
    const loginEmailLabel = document.querySelector('label[for="login-email"]');
    if (loginEmailLabel) loginEmailLabel.textContent = i18n.t('auth.login.emailLabel');
    if (this.loginEmail) this.loginEmail.placeholder = i18n.t('auth.login.emailPlaceholder');
    
    const loginPasswordLabel = document.querySelector('label[for="login-password"]');
    if (loginPasswordLabel) loginPasswordLabel.textContent = i18n.t('auth.login.password');
    if (this.loginPassword) this.loginPassword.placeholder = i18n.t('auth.login.passwordPlaceholder');
    
    const rememberMeLabel = document.querySelector('label[for="remember-me"]');
    if (rememberMeLabel) rememberMeLabel.textContent = i18n.t('auth.login.remember');
    
    if (this.loginButton) this.loginButton.textContent = i18n.t('auth.login.submit');
    if (this.forgotPasswordLink) this.forgotPasswordLink.textContent = i18n.t('auth.login.forgot');
    
    if (this.guestButton) {
        // Set text based on current state, or default if not disabled
        if (this.guestButton.disabled) {
            this.guestButton.textContent = i18n.t('auth.login.loggingIn');
        } else {
            this.guestButton.textContent = i18n.t('auth.login.guestButton');
        }
    }
    
    // Register Form
    const registerNicknameLabel = document.querySelector('label[for="register-nickname"]');
    if (registerNicknameLabel) registerNicknameLabel.textContent = i18n.t('auth.register.nicknameLabel');
    if (this.registerNickname) this.registerNickname.placeholder = i18n.t('auth.register.nicknamePlaceholder');
    
    const registerEmailLabel = document.querySelector('label[for="register-email"]');
    if (registerEmailLabel) registerEmailLabel.textContent = i18n.t('auth.register.email');
    if (this.registerEmail) this.registerEmail.placeholder = i18n.t('auth.register.emailPlaceholder');
    
    const registerPasswordLabel = document.querySelector('label[for="register-password"]');
    if (registerPasswordLabel) registerPasswordLabel.textContent = i18n.t('auth.register.password');
    if (this.registerPassword) this.registerPassword.placeholder = i18n.t('auth.register.passwordPlaceholder');
    
    const registerConfirmPasswordLabel = document.querySelector('label[for="register-confirm-password"]');
    if (registerConfirmPasswordLabel) registerConfirmPasswordLabel.textContent = i18n.t('auth.register.confirmPassword');
    if (this.registerConfirmPassword) this.registerConfirmPassword.placeholder = i18n.t('auth.register.confirmPasswordPlaceholder');
    
    if (this.registerButton) this.registerButton.textContent = i18n.t('auth.register.submit');

    // Forgot Password Form
    const forgotEmailLabel = document.querySelector('label[for="forgot-email"]');
    if (forgotEmailLabel) forgotEmailLabel.textContent = i18n.t('auth.forgot.emailLabel');
    if (this.forgotEmail) this.forgotEmail.placeholder = i18n.t('auth.forgot.emailPlaceholder');

    if (this.forgotButton) {
        // Set text based on current state, or default if not disabled
        if (this.forgotButton.disabled) {
            this.forgotButton.textContent = i18n.t('auth.forgot.sendingRecovery');
        } else {
            this.forgotButton.textContent = i18n.t('auth.forgot.submitButton');
        }
    }
    if (this.backToLoginLink) this.backToLoginLink.textContent = i18n.t('auth.forgot.backToLoginLink');
  }

  /**
   * Inizializza i riferimenti agli elementi dell'interfaccia
   */
  initElements() {
    // Tab di navigazione
    this.loginTab = document.querySelector('.auth-tab[data-tab="login"]');
    this.registerTab = document.querySelector('.auth-tab[data-tab="register"]');
    
    // Form
    this.loginForm = document.getElementById('login-form');
    this.registerForm = document.getElementById('register-form');
    this.forgotForm = document.getElementById('forgot-form');
    
    // Campi login
    this.loginEmail = document.getElementById('login-email');
    this.loginPassword = document.getElementById('login-password');
    this.rememberMe = document.getElementById('remember-me');
    this.loginButton = document.getElementById('login-button');
    this.guestButton = document.getElementById('guest-button');
    this.forgotPasswordLink = document.getElementById('forgot-password');
    
    // Campi registrazione
    this.registerNickname = document.getElementById('register-nickname');
    this.registerEmail = document.getElementById('register-email');
    this.registerPassword = document.getElementById('register-password');
    this.registerConfirmPassword = document.getElementById('register-confirm-password');
    this.registerButton = document.getElementById('register-button');
    
    // Campi recupero password
    this.forgotEmail = document.getElementById('forgot-email');
    this.forgotButton = document.getElementById('forgot-button');
    this.backToLoginLink = document.getElementById('back-to-login');
    
    // Messaggi di errore e successo
    this.loginError = document.getElementById('login-error');
    this.loginSuccess = document.getElementById('login-success');
    this.registerError = document.getElementById('register-error');
    this.registerSuccess = document.getElementById('register-success');
    this.forgotError = document.getElementById('forgot-error');
    this.forgotSuccess = document.getElementById('forgot-success');
  }
  
  /**
   * Registra gli event listener per gli elementi dell'interfaccia
   */
  registerEventListeners() {
    // Tab di navigazione
    this.loginTab.addEventListener('click', () => this.showForm('login'));
    this.registerTab.addEventListener('click', () => this.showForm('register'));
    
    // Form di login
    this.loginButton.addEventListener('click', () => this.handleLogin());
    this.guestButton.addEventListener('click', () => this.handleGuestLogin());
    this.forgotPasswordLink.addEventListener('click', () => this.showForm('forgot'));
    
    // Form di registrazione
    this.registerButton.addEventListener('click', () => this.handleRegister());
    
    // Form di recupero password
    this.forgotButton.addEventListener('click', () => this.handleForgotPassword());
    this.backToLoginLink.addEventListener('click', () => this.showForm('login'));
    
    // Gestione tasto Invio nei form
    this.loginEmail.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.loginPassword.focus();
    });
    
    this.loginPassword.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.handleLogin();
    });
    
    this.registerNickname.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.registerEmail.focus();
    });
    
    this.registerEmail.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.registerPassword.focus();
    });
    
    this.registerPassword.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.registerConfirmPassword.focus();
    });
    
    this.registerConfirmPassword.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.handleRegister();
    });
    
    this.forgotEmail.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.handleForgotPassword();
    });
  }
  
  /**
   * Mostra un form specifico
   * @param {string} formName - Nome del form da mostrare ('login', 'register', 'forgot')
   */
  showForm(formName) {
    // Nascondi tutti i form
    this.loginForm.style.display = 'none';
    this.registerForm.style.display = 'none';
    this.forgotForm.style.display = 'none';
    
    // Rimuovi la classe active da tutti i tab
    this.loginTab.classList.remove('active');
    this.registerTab.classList.remove('active');
    
    // Mostra il form richiesto
    switch (formName) {
      case 'login':
        this.loginForm.style.display = 'block';
        this.loginTab.classList.add('active');
        break;
      case 'register':
        this.registerForm.style.display = 'block';
        this.registerTab.classList.add('active');
        break;
      case 'forgot':
        this.forgotForm.style.display = 'block';
        break;
    }
    
    this.currentForm = formName;
    
    // Resetta i messaggi di errore e successo
    this.resetMessages();

    // Re-apply translations
    this.translateUIElements();
  }
  
  /**
   * Resetta tutti i messaggi di errore e successo
   */
  resetMessages() {
    // Messaggi di login
    this.loginError.style.display = 'none';
    this.loginSuccess.style.display = 'none';
    
    // Messaggi di registrazione
    this.registerError.style.display = 'none';
    this.registerSuccess.style.display = 'none';
    
    // Messaggi di recupero password
    this.forgotError.style.display = 'none';
    this.forgotSuccess.style.display = 'none';
  }
  
  /**
   * Mostra un messaggio di errore
   * @param {string} formName - Nome del form ('login', 'register', 'forgot')
   * @param {string} message - Messaggio di errore da mostrare
   */
  showError(formName, message) {
    switch (formName) {
      case 'login':
        this.loginError.textContent = message;
        this.loginError.style.display = 'block';
        break;
      case 'register':
        this.registerError.textContent = message;
        this.registerError.style.display = 'block';
        break;
      case 'forgot':
        this.forgotError.textContent = message;
        this.forgotError.style.display = 'block';
        break;
    }
  }
  
  /**
   * Mostra un messaggio di successo
   * @param {string} formName - Nome del form ('login', 'register', 'forgot')
   * @param {string} message - Messaggio di successo da mostrare
   */
  showSuccess(formName, message) {
    switch (formName) {
      case 'login':
        this.loginSuccess.textContent = message;
        this.loginSuccess.style.display = 'block';
        break;
      case 'register':
        this.registerSuccess.textContent = message;
        this.registerSuccess.style.display = 'block';
        break;
      case 'forgot':
        this.forgotSuccess.textContent = message;
        this.forgotSuccess.style.display = 'block';
        break;
    }
  }
  
  /**
   * Inizializza il validatore di password
   */
  initPasswordValidator() {
    this.passwordRequirements = {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true
    };
    
    this.passwordStrengthMeter = document.getElementById('password-strength-meter');
    this.passwordRequirementsList = document.getElementById('password-requirements');
  }
  
  /**
   * Valida la forza della password
   * @param {string} password - Password da validare
   * @returns {Object} Risultato della validazione
   */
  validatePassword(password) {
    const result = {
      isValid: true,
      errors: [],
      strength: 0
    };

    // Lunghezza minima
    if (password.length < this.passwordRequirements.minLength) {
      result.isValid = false;
      // Using i18n for error messages from password validator
      result.errors.push(i18n.t('auth.password.minLength', {length: this.passwordRequirements.minLength}));
    }

    // Caratteri maiuscoli
    if (this.passwordRequirements.requireUppercase && !/[A-Z]/.test(password)) {
      result.isValid = false;
      result.errors.push(i18n.t('auth.password.requireUppercase'));
    }

    // Caratteri minuscoli
    if (this.passwordRequirements.requireLowercase && !/[a-z]/.test(password)) {
      result.isValid = false;
      result.errors.push(i18n.t('auth.password.requireLowercase'));
    }

    // Numeri
    if (this.passwordRequirements.requireNumbers && !/\d/.test(password)) {
      result.isValid = false;
      result.errors.push(i18n.t('auth.password.requireNumbers'));
    }

    // Caratteri speciali
    if (this.passwordRequirements.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      result.isValid = false;
      result.errors.push(i18n.t('auth.password.requireSpecialChars'));
    }

    // Calcola la forza della password
    result.strength = this.calculatePasswordStrength(password);

    return result;
  }
  
  /**
   * Calcola la forza della password
   * @param {string} password - Password da valutare
   * @returns {number} Punteggio di forza (0-100)
   */
  calculatePasswordStrength(password) {
    let strength = 0;
    
    // Lunghezza
    strength += Math.min(password.length * 4, 40);
    
    // Complessità
    if (/[A-Z]/.test(password)) strength += 10;
    if (/[a-z]/.test(password)) strength += 10;
    if (/[0-9]/.test(password)) strength += 10;
    if (/[^A-Za-z0-9]/.test(password)) strength += 10;
    
    // Varietà
    const uniqueChars = new Set(password).size;
    strength += Math.min(uniqueChars * 2, 20);
    
    return Math.min(strength, 100);
  }
  
  /**
   * Gestisce il login con protezione contro brute force
   */
  async handleLogin() {
    // Verifica se l'account è bloccato
    if (this.lockoutEndTime && Date.now() < this.lockoutEndTime) {
      const remainingTime = Math.ceil((this.lockoutEndTime - Date.now()) / 1000 / 60);
      // Using i18n for error message
      this.showError('login', i18n.t('auth.errors.accountLocked', {minutes: remainingTime}));
      return;
    }

    const email = this.loginEmail.value.trim();
    const password = this.loginPassword.value;
    const rememberMe = this.rememberMe.checked;

    if (!email || !password) {
      // Using i18n for error message
      this.showError('login', i18n.t('auth.errors.enterEmailPassword'));
      return;
    }

    try {
      const result = await this.authManager.login(email, password, rememberMe);
      
      if (result.success) {
        // Reset tentativi di login
        this.loginAttempts = 0;
        this.lockoutEndTime = null;
        
        // Gestione 2FA se necessario
        if (result.requires2FA) {
          this.show2FAForm();
        } else {
          // Using i18n for success message (though it's not in the provided keys, good practice)
          this.showSuccess('login', i18n.t('auth.login.success', {defaultValue: 'Login effettuato con successo'}));
          this.screenManager.showScreen('main-menu');
        }
      } else {
        this.loginAttempts++;
        
        if (this.loginAttempts >= this.maxLoginAttempts) {
          this.lockoutEndTime = Date.now() + this.lockoutTime;
          // Using i18n for error message
           const lockoutMinutes = Math.ceil(this.lockoutTime / (1000 * 60));
          this.showError('login', i18n.t('auth.errors.accountLocked', {minutes: lockoutMinutes}));
        } else {
          // Using i18n for error message
          this.showError('login', i18n.t('auth.errors.invalidCredentials', {attempts: this.maxLoginAttempts - this.loginAttempts}));
        }
      }
    } catch (error) {
      console.error('Errore durante il login:', error);
      // Using i18n for error message
      this.showError('login', i18n.t('auth.errors.generic'));
    }
  }
  
  /**
   * Mostra il form per l'autenticazione a due fattori
   */
  show2FAForm() {
    // Nascondi il form di login
    this.loginForm.style.display = 'none';
    
    // Mostra il form 2FA
    const twoFactorForm = document.getElementById('two-factor-form');
    twoFactorForm.style.display = 'block';
    
    // Focus sul campo del codice
    document.getElementById('two-factor-code').focus();
  }
  
  /**
   * Gestisce la registrazione con validazione avanzata
   */
  async handleRegister() {
    const nickname = this.registerNickname.value.trim();
    const email = this.registerEmail.value.trim();
    const password = this.registerPassword.value;
    const confirmPassword = this.registerConfirmPassword.value;

    // Validazione base
    if (!nickname || !email || !password || !confirmPassword) {
      // Using i18n for error message
      this.showError('register', i18n.t('auth.errors.fillAllFields'));
      return;
    }

    // Validazione email
    if (!this.validateEmail(email)) {
      // Using i18n for error message
      this.showError('register', i18n.t('auth.errors.invalidEmail'));
      return;
    }

    // Validazione password
    const passwordValidation = this.validatePassword(password);
    if (!passwordValidation.isValid) {
      // Error messages from validatePassword are already internationalized
      this.showError('register', passwordValidation.errors.join('\n'));
      return;
    }

    // Verifica corrispondenza password
    if (password !== confirmPassword) {
      // Using i18n for error message
      this.showError('register', i18n.t('auth.errors.passwordsNoMatch'));
      return;
    }

    try {
      const result = await this.authManager.register(nickname, email, password);
      
      if (result.success) {
        // Using i18n for success message
        this.showSuccess('register', i18n.t('auth.register.registrationSuccess'));
        this.showForm('login');
      } else {
        this.showError('register', result.message || i18n.t('auth.errors.generic'));
      }
    } catch (error) {
      console.error('Errore durante la registrazione:', error);
      // Using i18n for error message
      this.showError('register', i18n.t('auth.errors.generic'));
    }
  }
  
  /**
   * Valida un indirizzo email
   * @param {string} email - Email da validare
   * @returns {boolean} Risultato della validazione
   */
  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
  
  /**
   * Gestisce il login come ospite
   */
  handleGuestLogin() {
    // Resetta i messaggi
    this.resetMessages();
    
    // Disabilita il pulsante durante il login
    this.guestButton.disabled = true;
    this.guestButton.textContent = i18n.t('auth.login.loggingIn');
    
    // Effettua il login come ospite
    this.authManager.loginAsGuest()
      .then(() => {
        // Login riuscito, mostra il menu principale
        this.screenManager.showScreen('main-menu-screen');
      })
      .catch(error => {
        // Mostra l'errore
        this.showError('login', error.message || i18n.t('auth.errors.generic'));
      })
      .finally(() => {
        // Riabilita il pulsante
        this.guestButton.disabled = false;
        this.translateUIElements(); // Update button text to default and other elements
      });
  }
  
  /**
   * Gestisce il tentativo di recupero password
   */
  handleForgotPassword() {
    // Resetta i messaggi
    this.resetMessages();
    
    // Ottieni i valori dei campi
    const email = this.forgotEmail.value.trim();
    
    // Validazione base
    if (!email) {
      // Using i18n for error message
      this.showError('forgot', i18n.t('auth.errors.invalidEmail')); // Or a more specific "enter email"
      return;
    }
    
    // Disabilita il pulsante durante la richiesta
    this.forgotButton.disabled = true;
    this.forgotButton.textContent = i18n.t('auth.forgot.sendingRecovery');
    
    // Effettua la richiesta di recupero password
    this.authManager.requestPasswordReset(email)
      .then(() => {
        // Richiesta riuscita, mostra messaggio di successo
        // Using i18n for success message
        this.showSuccess('forgot', i18n.t('auth.forgot.recoverySentSuccess'));
        
        // Pulisci i campi
        this.forgotEmail.value = '';
        
        // Torna al form di login dopo 3 secondi
        setTimeout(() => {
          this.showForm('login');
        }, 3000);
      })
      .catch(error => {
        // Mostra l'errore
        this.showError('forgot', error.message || i18n.t('auth.errors.generic'));
      })
      .finally(() => {
        // Riabilita il pulsante
        this.forgotButton.disabled = false;
        this.translateUIElements(); // Update button text to default and other elements
      });
  }
}

// Esporta la classe
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AuthUI;
}
