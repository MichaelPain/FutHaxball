/**
 * Translation management system
 */
import securityLogger from './securityLogger';
import eventManager from './eventManager';
import configManager from './configManager';

class I18n {
  constructor() {
    this.translations = {
      it: {
        common: {
          loading: 'Caricamento...',
          error: 'Errore',
          success: 'Successo',
          cancel: 'Annulla',
          save: 'Salva',
          delete: 'Elimina',
          edit: 'Modifica',
          create: 'Crea',
          search: 'Cerca',
          filter: 'Filtra',
          sort: 'Ordina',
          refresh: 'Aggiorna',
          back: 'Indietro',
          next: 'Avanti',
          previous: 'Precedente',
          confirm: 'Conferma',
          yes: 'Sì',
          no: 'No',
          close: 'Chiudi',
          open: 'Apri',
          settings: 'Impostazioni',
          profile: 'Profilo',
          logout: 'Esci',
          login: 'Accedi',
          register: 'Registrati',
          forgotPassword: 'Password dimenticata',
          resetPassword: 'Reimposta password',
          changePassword: 'Cambia password',
          changeEmail: 'Cambia email',
          changeUsername: 'Cambia username',
          changeAvatar: 'Cambia avatar',
          changeLanguage: 'Cambia lingua',
          changeTheme: 'Cambia tema',
          notifications: 'Notifiche',
          messages: 'Messaggi',
          friends: 'Amici',
          teams: 'Squadre',
          tournaments: 'Tornei',
          games: 'Partite',
          stats: 'Statistiche',
          leaderboard: 'Classifica',
          help: 'Aiuto',
          about: 'Informazioni',
          terms: 'Termini',
          privacy: 'Privacy',
          contact: 'Contatti',
          support: 'Supporto',
          feedback: 'Feedback',
          report: 'Segnala',
          block: 'Blocca',
          unblock: 'Sblocca',
          mute: 'Silenzia',
          unmute: 'Riattiva audio',
          kick: 'Espelli',
          ban: 'Banna',
          unban: 'Rimuovi ban',
          promote: 'Promuovi',
          demote: 'Degrada',
          invite: 'Invita',
          join: 'Unisciti',
          leave: 'Esci',
          start: 'Inizia',
          stop: 'Ferma',
          pause: 'Pausa',
          resume: 'Riprendi',
          restart: 'Riavvia',
          reset: 'Ripristina',
          clear: 'Cancella',
          copy: 'Copia',
          paste: 'Incolla',
          cut: 'Taglia',
          undo: 'Annulla',
          redo: 'Ripeti',
          zoom: 'Zoom',
          fullscreen: 'Schermo intero',
          minimize: 'Minimizza',
          maximize: 'Massimizza',
          restore: 'Ripristina',
          exit: 'Esci',
          quit: 'Esci',
          shutdown: 'Spegni',
          reboot: 'Riavvia',
          update: 'Aggiorna',
          install: 'Installa',
          uninstall: 'Disinstalla',
          configure: 'Configura',
          customize: 'Personalizza',
          import: 'Importa',
          export: 'Esporta',
          backup: 'Backup',
          restore: 'Ripristina',
          sync: 'Sincronizza',
          share: 'Condividi',
          print: 'Stampa',
          download: 'Scarica',
          upload: 'Carica',
          browse: 'Sfoglia',
          select: 'Seleziona',
          deselect: 'Deseleziona',
          check: 'Seleziona',
          uncheck: 'Deseleziona',
          enable: 'Attiva',
          disable: 'Disattiva',
          show: 'Mostra',
          hide: 'Nascondi',
          expand: 'Espandi',
          collapse: 'Comprimi'
        },
        auth: {
          login: {
            title: 'Accedi',
            username: 'Username',
            password: 'Password',
            emailLabel: 'Email',
            emailPlaceholder: 'Inserisci la tua email',
            passwordPlaceholder: 'Inserisci la tua password',
            remember: 'Ricordami',
            submit: 'Accedi',
            forgot: 'Password dimenticata?',
            register: 'Non hai un account? Registrati',
            guestButton: 'Gioca come ospite',
            loggingIn: 'Accesso in corso...'
          },
          register: {
            title: 'Registrati',
            username: 'Username',
            nicknameLabel: 'Nickname',
            nicknamePlaceholder: 'Scegli un nickname',
            email: 'Email',
            emailPlaceholder: 'Inserisci la tua email',
            password: 'Password',
            passwordPlaceholder: 'Crea una password',
            confirmPassword: 'Conferma password',
            confirmPasswordPlaceholder: 'Conferma la password',
            terms: 'Accetto i termini e le condizioni',
            submit: 'Registrati',
            login: 'Hai già un account? Accedi',
            registrationSuccess: 'Registrazione effettuata con successo'
          },
          forgot: {
            title: 'Password dimenticata',
            email: 'Email',
            emailLabel: 'Email',
            emailPlaceholder: 'Inserisci la tua email',
            submitButton: 'Recupera Password',
            backToLoginLink: 'Torna al login',
            sendingRecovery: 'Invio in corso...',
            recoverySentSuccess: 'Istruzioni per il reset della password inviate alla tua email'
          },
          reset: {
            title: 'Reimposta password',
            password: 'Nuova password',
            confirmPassword: 'Conferma password',
            submit: 'Reimposta password',
            login: 'Torna al login'
          },
          change: {
            title: 'Cambia password',
            currentPassword: 'Password attuale',
            newPassword: 'Nuova password',
            confirmPassword: 'Conferma password',
            submit: 'Cambia password',
            cancel: 'Annulla'
          },
          errors: {
            enterEmailPassword: 'Inserisci email e password',
            accountLocked: 'Account temporaneamente bloccato. Riprova tra {minutes} minuti.',
            invalidCredentials: 'Credenziali non valide. Tentativi rimanenti: {attempts}',
            fillAllFields: 'Compila tutti i campi',
            invalidEmail: 'Email non valida',
            passwordsNoMatch: 'Le password non coincidono',
            generic: 'Si è verificato un errore'
          },
          password: {
            errorTitle: 'Errore validazione password',
            minLength: 'La password deve essere di almeno {length} caratteri',
            requireUppercase: 'La password deve contenere almeno una lettera maiuscola',
            requireLowercase: 'La password deve contenere almeno una lettera minuscola',
            requireNumbers: 'La password deve contenere almeno un numero',
            requireSpecialChars: 'La password deve contenere almeno un carattere speciale'
          }
        },
        game: {
          title: 'Partita',
          status: {
            waiting: 'In attesa',
            starting: 'In partenza',
            playing: 'In corso',
            paused: 'In pausa',
            finished: 'Terminata',
            cancelled: 'Annullata'
          },
          score: 'Punteggio',
          time: 'Tempo',
          players: 'Giocatori',
          teams: 'Squadre',
          settings: 'Impostazioni',
          chat: 'Chat',
          stats: 'Statistiche',
          replay: 'Replay',
          share: 'Condividi',
          report: 'Segnala'
        },
        tournament: {
          title: 'Torneo',
          status: {
            upcoming: 'In arrivo',
            ongoing: 'In corso',
            finished: 'Terminato',
            cancelled: 'Annullato'
          },
          type: {
            single: 'Eliminazione diretta',
            double: 'Doppia eliminazione',
            round: 'Girone all\'italiana',
            swiss: 'Sistema svizzero'
          },
          phase: {
            group: 'Fase a gironi',
            knockout: 'Fase ad eliminazione',
            final: 'Finale'
          },
          teams: 'Squadre',
          matches: 'Partite',
          bracket: 'Tabellone',
          standings: 'Classifica',
          stats: 'Statistiche',
          settings: 'Impostazioni',
          chat: 'Chat',
          share: 'Condividi',
          report: 'Segnala'
        },
        team: {
          title: 'Squadra',
          status: {
            active: 'Attiva',
            inactive: 'Inattiva',
            disbanded: 'Sciolta'
          },
          role: {
            owner: 'Proprietario',
            admin: 'Amministratore',
            captain: 'Capitano',
            player: 'Giocatore',
            member: 'Membro'
          },
          info: 'Informazioni',
          roster: 'Rosa',
          matches: 'Partite',
          tournaments: 'Tornei',
          stats: 'Statistiche',
          settings: 'Impostazioni',
          chat: 'Chat',
          share: 'Condividi',
          report: 'Segnala'
        },
        profile: {
          title: 'Profilo',
          info: 'Informazioni',
          stats: 'Statistiche',
          matches: 'Partite',
          tournaments: 'Tornei',
          teams: 'Squadre',
          friends: 'Amici',
          settings: 'Impostazioni',
          chat: 'Chat',
          share: 'Condividi',
          report: 'Segnala'
        },
        settings: {
          title: 'Impostazioni',
          general: 'Generali',
          account: 'Account',
          security: 'Sicurezza',
          notifications: 'Notifiche',
          privacy: 'Privacy',
          language: 'Lingua',
          theme: 'Tema',
          graphics: 'Grafica',
          sound: 'Audio',
          controls: 'Controlli',
          keybindings: 'Tasti',
          save: 'Salva',
          reset: 'Ripristina',
          cancel: 'Annulla'
        },
        errors: {
          validation: 'Errore di validazione: {error}',
          network: 'Errore di rete: {error}',
          auth: 'Errore di autenticazione: {error}',
          permission: 'Errore di permessi: {error}',
          notFound: 'Risorsa non trovata: {error}',
          server: 'Errore del server: {error}',
          unknown: 'Errore sconosciuto: {error}'
        }
      },
      en: {
        common: {
          loading: 'Loading...',
          error: 'Error',
          success: 'Success',
          cancel: 'Cancel',
          save: 'Save',
          delete: 'Delete',
          edit: 'Edit',
          create: 'Create',
          search: 'Search',
          filter: 'Filter',
          sort: 'Sort',
          refresh: 'Refresh',
          back: 'Back',
          next: 'Next',
          previous: 'Previous',
          confirm: 'Confirm',
          yes: 'Yes',
          no: 'No',
          close: 'Close',
          open: 'Open',
          settings: 'Settings',
          profile: 'Profile',
          logout: 'Logout',
          login: 'Login',
          register: 'Register',
          forgotPassword: 'Forgot Password',
          resetPassword: 'Reset Password',
          changePassword: 'Change Password',
          changeEmail: 'Change Email',
          changeUsername: 'Change Username',
          changeAvatar: 'Change Avatar',
          changeLanguage: 'Change Language',
          changeTheme: 'Change Theme',
          notifications: 'Notifications',
          messages: 'Messages',
          friends: 'Friends',
          teams: 'Teams',
          tournaments: 'Tournaments',
          games: 'Games',
          stats: 'Stats',
          leaderboard: 'Leaderboard',
          help: 'Help',
          about: 'About',
          terms: 'Terms',
          privacy: 'Privacy',
          contact: 'Contact',
          support: 'Support',
          feedback: 'Feedback',
          report: 'Report',
          block: 'Block',
          unblock: 'Unblock',
          mute: 'Mute',
          unmute: 'Unmute',
          kick: 'Kick',
          ban: 'Ban',
          unban: 'Unban',
          promote: 'Promote',
          demote: 'Demote',
          invite: 'Invite',
          join: 'Join',
          leave: 'Leave',
          start: 'Start',
          stop: 'Stop',
          pause: 'Pause',
          resume: 'Resume',
          restart: 'Restart',
          reset: 'Reset',
          clear: 'Clear',
          copy: 'Copy',
          paste: 'Paste',
          cut: 'Cut',
          undo: 'Undo',
          redo: 'Redo',
          zoom: 'Zoom',
          fullscreen: 'Fullscreen',
          minimize: 'Minimize',
          maximize: 'Maximize',
          restore: 'Restore',
          exit: 'Exit',
          quit: 'Quit',
          shutdown: 'Shutdown',
          reboot: 'Reboot',
          update: 'Update',
          install: 'Install',
          uninstall: 'Uninstall',
          configure: 'Configure',
          customize: 'Customize',
          import: 'Import',
          export: 'Export',
          backup: 'Backup',
          restore: 'Restore',
          sync: 'Sync',
          share: 'Share',
          print: 'Print',
          download: 'Download',
          upload: 'Upload',
          browse: 'Browse',
          select: 'Select',
          deselect: 'Deselect',
          check: 'Check',
          uncheck: 'Uncheck',
          enable: 'Enable',
          disable: 'Disable',
          show: 'Show',
          hide: 'Hide',
          expand: 'Expand',
          collapse: 'Collapse'
        },
        auth: {
          login: {
            title: 'Login',
            username: 'Username',
            password: 'Password',
            emailLabel: 'Email',
            emailPlaceholder: 'Enter your email',
            passwordPlaceholder: 'Enter your password',
            remember: 'Remember me',
            submit: 'Login',
            forgot: 'Forgot password?',
            register: 'Don\'t have an account? Register',
            guestButton: 'Play as guest',
            loggingIn: 'Logging in...'
          },
          register: {
            title: 'Register',
            username: 'Username',
            nicknameLabel: 'Nickname',
            nicknamePlaceholder: 'Choose a nickname',
            email: 'Email',
            emailPlaceholder: 'Enter your email',
            password: 'Password',
            passwordPlaceholder: 'Create a password',
            confirmPassword: 'Confirm password',
            confirmPasswordPlaceholder: 'Confirm your password',
            terms: 'I accept the terms and conditions',
            submit: 'Register',
            login: 'Already have an account? Login',
            registrationSuccess: 'Registration successful'
          },
          forgot: {
            title: 'Forgot Password',
            email: 'Email',
            emailLabel: 'Email',
            emailPlaceholder: 'Enter your email',
            submitButton: 'Reset password',
            backToLoginLink: 'Back to login',
            sendingRecovery: 'Sending recovery instructions...',
            recoverySentSuccess: 'Password reset instructions sent to your email'
          },
          reset: {
            title: 'Reset Password',
            password: 'New password',
            confirmPassword: 'Confirm password',
            submit: 'Reset password',
            login: 'Back to login'
          },
          change: {
            title: 'Change Password',
            currentPassword: 'Current password',
            newPassword: 'New password',
            confirmPassword: 'Confirm password',
            submit: 'Change password',
            cancel: 'Cancel'
          },
          errors: {
            enterEmailPassword: 'Please enter email and password',
            accountLocked: 'Account temporarily locked. Try again in {minutes} minutes.',
            invalidCredentials: 'Invalid credentials. Attempts remaining: {attempts}',
            fillAllFields: 'Please fill in all fields',
            invalidEmail: 'Invalid email address',
            passwordsNoMatch: 'Passwords do not match',
            generic: 'An error occurred'
          },
          password: {
            errorTitle: 'Password validation error',
            minLength: 'Password must be at least {length} characters',
            requireUppercase: 'Password must contain at least one uppercase letter',
            requireLowercase: 'Password must contain at least one lowercase letter',
            requireNumbers: 'Password must contain at least one number',
            requireSpecialChars: 'Password must contain at least one special character'
          }
        },
        game: {
          title: 'Game',
          status: {
            waiting: 'Waiting',
            starting: 'Starting',
            playing: 'Playing',
            paused: 'Paused',
            finished: 'Finished',
            cancelled: 'Cancelled'
          },
          score: 'Score',
          time: 'Time',
          players: 'Players',
          teams: 'Teams',
          settings: 'Settings',
          chat: 'Chat',
          stats: 'Stats',
          replay: 'Replay',
          share: 'Share',
          report: 'Report'
        },
        tournament: {
          title: 'Tournament',
          status: {
            upcoming: 'Upcoming',
            ongoing: 'Ongoing',
            finished: 'Finished',
            cancelled: 'Cancelled'
          },
          type: {
            single: 'Single elimination',
            double: 'Double elimination',
            round: 'Round robin',
            swiss: 'Swiss system'
          },
          phase: {
            group: 'Group stage',
            knockout: 'Knockout stage',
            final: 'Final'
          },
          teams: 'Teams',
          matches: 'Matches',
          bracket: 'Bracket',
          standings: 'Standings',
          stats: 'Stats',
          settings: 'Settings',
          chat: 'Chat',
          share: 'Share',
          report: 'Report'
        },
        team: {
          title: 'Team',
          status: {
            active: 'Active',
            inactive: 'Inactive',
            disbanded: 'Disbanded'
          },
          role: {
            owner: 'Owner',
            admin: 'Admin',
            captain: 'Captain',
            player: 'Player',
            member: 'Member'
          },
          info: 'Info',
          roster: 'Roster',
          matches: 'Matches',
          tournaments: 'Tournaments',
          stats: 'Stats',
          settings: 'Settings',
          chat: 'Chat',
          share: 'Share',
          report: 'Report'
        },
        profile: {
          title: 'Profile',
          info: 'Info',
          stats: 'Stats',
          matches: 'Matches',
          tournaments: 'Tournaments',
          teams: 'Teams',
          friends: 'Friends',
          settings: 'Settings',
          chat: 'Chat',
          share: 'Share',
          report: 'Report'
        },
        settings: {
          title: 'Settings',
          general: 'General',
          account: 'Account',
          security: 'Security',
          notifications: 'Notifications',
          privacy: 'Privacy',
          language: 'Language',
          theme: 'Theme',
          graphics: 'Graphics',
          sound: 'Sound',
          controls: 'Controls',
          keybindings: 'Keybindings',
          save: 'Save',
          reset: 'Reset',
          cancel: 'Cancel'
        },
        errors: {
          validation: 'Validation error: {error}',
          network: 'Network error: {error}',
          auth: 'Authentication error: {error}',
          permission: 'Permission error: {error}',
          notFound: 'Resource not found: {error}',
          server: 'Server error: {error}',
          unknown: 'Unknown error: {error}'
        }
      }
    };

    this.currentLanguage = configManager.get('ui.language') || 'en';
    this.fallbackLanguage = 'it';
  }

  /**
   * Gets a translation
   * @param {string} key - Translation key
   * @param {Object} params - Translation parameters
   * @returns {string} Translated string
   */
  t(key, params = {}) {
    try {
      const keys = key.split('.');
      let translation = this.translations[this.currentLanguage];

      for (const k of keys) {
        if (!translation || !translation[k]) {
          translation = this.translations[this.fallbackLanguage];
          for (const k2 of keys) {
            if (!translation || !translation[k2]) {
              this.logMissingTranslation(key);
              return key;
            }
            translation = translation[k2];
          }
          break;
        }
        translation = translation[k];
      }

      return this.replaceParams(translation, params);
    } catch (error) {
      this.logTranslationError(key, error);
      return key;
    }
  }

  /**
   * Replaces parameters in a translation
   * @param {string} translation - Translation string
   * @param {Object} params - Parameters to replace
   * @returns {string} Translation with replaced parameters
   */
  replaceParams(translation, params) {
    return translation.replace(/\{(\w+)\}/g, (match, key) => {
      return params[key] !== undefined ? params[key] : match;
    });
  }

  /**
   * Sets the current language
   * @param {string} language - Language code
   */
  setLanguage(language) {
    try {
      if (!this.translations[language]) {
        throw new Error(`Language ${language} not supported`);
      }

      const oldLanguage = this.currentLanguage;
      this.currentLanguage = language;
      configManager.set('ui.language', language);
      this.logLanguageChange(oldLanguage, language);
      eventManager.emit('language:change', { oldLanguage, newLanguage: language });
    } catch (error) {
      this.logInvalidLanguage(language, error);
      throw error;
    }
  }

  /**
   * Gets the current language
   * @returns {string} Current language code
   */
  getLanguage() {
    return this.currentLanguage;
  }

  /**
   * Gets available languages
   * @returns {string[]} Available language codes
   */
  getAvailableLanguages() {
    return Object.keys(this.translations);
  }

  /**
   * Logs a missing translation
   * @param {string} key - Missing translation key
   */
  logMissingTranslation(key) {
    securityLogger.log(
      'I18N',
      `Missing translation: ${key}`,
      'WARN',
      {
        key,
        language: this.currentLanguage
      }
    );
  }

  /**
   * Logs a translation error
   * @param {string} key - Translation key
   * @param {Error} error - Error object
   */
  logTranslationError(key, error) {
    securityLogger.log(
      'I18N',
      `Translation error: ${error.message}`,
      'ERROR',
      {
        key,
        language: this.currentLanguage,
        error
      }
    );
  }

  /**
   * Logs a language change
   * @param {string} oldLanguage - Old language code
   * @param {string} newLanguage - New language code
   */
  logLanguageChange(oldLanguage, newLanguage) {
    securityLogger.log(
      'I18N',
      `Language changed: ${oldLanguage} -> ${newLanguage}`,
      'INFO',
      {
        oldLanguage,
        newLanguage
      }
    );
  }

  /**
   * Logs an invalid language
   * @param {string} language - Invalid language code
   * @param {Error} error - Error object
   */
  logInvalidLanguage(language, error) {
    securityLogger.log(
      'I18N',
      `Invalid language: ${language}`,
      'ERROR',
      {
        language,
        error
      }
    );
  }
}

const i18n = new I18n();
export default i18n; 