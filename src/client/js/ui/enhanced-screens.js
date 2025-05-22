/**
 * Sistema migliorato di gestione delle schermate con transizioni animate
 * e supporto per notifiche in-game
 */
class EnhancedScreenManager {
  constructor() {
    this.currentScreen = null;
    this.screens = {};
    this.transitions = {
      fadeIn: 'screen-transition',
      slideIn: 'screen-slide-in',
      zoomIn: 'screen-zoom-in'
    };
    this.notificationQueue = [];
    this.isProcessingNotification = false;
    
    // Inizializza il container per le notifiche
    this.initNotificationSystem();
  }
  
  /**
   * Registra una schermata nel sistema
   * @param {string} id - Identificativo della schermata
   * @param {HTMLElement} element - Elemento DOM della schermata
   * @param {Object} options - Opzioni aggiuntive
   */
  registerScreen(id, element, options = {}) {
    if (typeof element === 'string') {
      element = document.getElementById(element);
    }
    
    if (!element) {
      console.error(`Impossibile trovare l'elemento con ID: ${id}`);
      return;
    }
    
    this.screens[id] = {
      element,
      options: {
        transition: options.transition || 'fadeIn',
        onShow: options.onShow || null,
        onHide: options.onHide || null,
        keepInDOM: options.keepInDOM || false
      }
    };
    
    // Nascondi inizialmente tutte le schermate
    element.style.display = 'none';
  }
  
  /**
   * Mostra una schermata specifica
   * @param {string} id - Identificativo della schermata da mostrare
   * @param {Object} data - Dati da passare alla schermata
   */
  showScreen(id, data = {}) {
    if (!this.screens[id]) {
      console.error(`Schermata non registrata: ${id}`);
      return;
    }
    
    // Nascondi la schermata corrente
    if (this.currentScreen) {
      const currentScreenObj = this.screens[this.currentScreen];
      
      // Esegui callback onHide se presente
      if (currentScreenObj.options.onHide) {
        currentScreenObj.options.onHide();
      }
      
      // Rimuovi classi di transizione
      Object.values(this.transitions).forEach(className => {
        currentScreenObj.element.classList.remove(className);
      });
      
      // Nascondi l'elemento
      if (!currentScreenObj.options.keepInDOM) {
        currentScreenObj.element.style.display = 'none';
      }
    }
    
    // Mostra la nuova schermata
    const newScreenObj = this.screens[id];
    newScreenObj.element.style.display = 'block';
    
    // Applica la transizione
    const transitionClass = this.transitions[newScreenObj.options.transition];
    if (transitionClass) {
      // Forza un reflow per assicurarsi che la transizione venga applicata
      newScreenObj.element.offsetHeight;
      newScreenObj.element.classList.add(transitionClass);
    }
    
    // Esegui callback onShow se presente
    if (newScreenObj.options.onShow) {
      newScreenObj.options.onShow(data);
    }
    
    // Aggiorna la schermata corrente
    this.currentScreen = id;
    
    // Emetti evento di cambio schermata
    this.emitScreenChangeEvent(id, data);
  }
  
  /**
   * Emette un evento personalizzato per il cambio di schermata
   * @param {string} screenId - ID della schermata mostrata
   * @param {Object} data - Dati associati alla schermata
   */
  emitScreenChangeEvent(screenId, data) {
    const event = new CustomEvent('screenChange', {
      detail: {
        screenId,
        data
      }
    });
    document.dispatchEvent(event);
  }
  
  /**
   * Inizializza il sistema di notifiche
   */
  initNotificationSystem() {
    // Crea il container per le notifiche
    this.notificationContainer = document.createElement('div');
    this.notificationContainer.className = 'notification-container';
    this.notificationContainer.style.position = 'fixed';
    this.notificationContainer.style.top = '20px';
    this.notificationContainer.style.left = '50%';
    this.notificationContainer.style.transform = 'translateX(-50%)';
    this.notificationContainer.style.zIndex = '9999';
    this.notificationContainer.style.pointerEvents = 'none';
    
    // Aggiungi il container al body
    document.body.appendChild(this.notificationContainer);
  }
  
  /**
   * Mostra una notifica
   * @param {string} message - Messaggio da mostrare
   * @param {string} type - Tipo di notifica (info, success, warning, error)
   * @param {number} duration - Durata in millisecondi
   */
  showNotification(message, type = 'info', duration = 3000) {
    // Aggiungi la notifica alla coda
    this.notificationQueue.push({
      message,
      type,
      duration
    });
    
    // Processa la coda se non è già in corso
    if (!this.isProcessingNotification) {
      this.processNotificationQueue();
    }
  }
  
  /**
   * Processa la coda delle notifiche
   */
  processNotificationQueue() {
    if (this.notificationQueue.length === 0) {
      this.isProcessingNotification = false;
      return;
    }
    
    this.isProcessingNotification = true;
    const notification = this.notificationQueue.shift();
    
    // Crea l'elemento della notifica
    const notificationElement = document.createElement('div');
    notificationElement.className = `game-notification ${notification.type}`;
    notificationElement.textContent = notification.message;
    
    // Stili in base al tipo
    switch (notification.type) {
      case 'success':
        notificationElement.style.backgroundColor = 'rgba(46, 125, 50, 0.9)';
        break;
      case 'warning':
        notificationElement.style.backgroundColor = 'rgba(255, 152, 0, 0.9)';
        break;
      case 'error':
        notificationElement.style.backgroundColor = 'rgba(211, 47, 47, 0.9)';
        break;
      default: // info
        notificationElement.style.backgroundColor = 'rgba(25, 118, 210, 0.9)';
    }
    
    // Aggiungi al container
    this.notificationContainer.appendChild(notificationElement);
    
    // Forza un reflow
    notificationElement.offsetHeight;
    
    // Mostra la notifica
    notificationElement.classList.add('show');
    
    // Rimuovi dopo la durata specificata
    setTimeout(() => {
      notificationElement.classList.remove('show');
      
      // Rimuovi l'elemento dopo la transizione
      setTimeout(() => {
        if (notificationElement.parentNode) {
          this.notificationContainer.removeChild(notificationElement);
        }
        
        // Processa la prossima notifica
        this.processNotificationQueue();
      }, 300);
    }, notification.duration);
  }
  
  /**
   * Crea un timer di gioco
   * @param {number} duration - Durata in secondi
   * @param {Function} onComplete - Callback da eseguire al termine
   * @param {Function} onTick - Callback da eseguire ad ogni secondo
   * @returns {Object} - Oggetto timer con metodi start, pause, resume, stop
   */
  createGameTimer(duration, onComplete, onTick) {
    // Crea l'elemento del timer
    const timerElement = document.createElement('div');
    timerElement.className = 'game-timer';
    document.body.appendChild(timerElement);
    
    let remainingTime = duration;
    let intervalId = null;
    let isPaused = false;
    
    // Formatta il tempo (mm:ss)
    const formatTime = (seconds) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };
    
    // Aggiorna il display del timer
    const updateDisplay = () => {
      timerElement.textContent = formatTime(remainingTime);
      
      // Aggiungi classe warning quando mancano meno di 10 secondi
      if (remainingTime <= 10) {
        timerElement.classList.add('warning');
      } else {
        timerElement.classList.remove('warning');
      }
    };
    
    // Inizializza il display
    updateDisplay();
    
    // Metodi del timer
    const timer = {
      start() {
        if (intervalId !== null) return;
        
        intervalId = setInterval(() => {
          if (isPaused) return;
          
          remainingTime--;
          updateDisplay();
          
          if (onTick) onTick(remainingTime);
          
          if (remainingTime <= 0) {
            this.stop();
            if (onComplete) onComplete();
          }
        }, 1000);
      },
      
      pause() {
        isPaused = true;
      },
      
      resume() {
        isPaused = false;
      },
      
      stop() {
        if (intervalId !== null) {
          clearInterval(intervalId);
          intervalId = null;
        }
      },
      
      getRemainingTime() {
        return remainingTime;
      },
      
      setRemainingTime(time) {
        remainingTime = time;
        updateDisplay();
      },
      
      destroy() {
        this.stop();
        if (timerElement.parentNode) {
          timerElement.parentNode.removeChild(timerElement);
        }
      }
    };
    
    return timer;
  }
}

// Esporta la classe
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EnhancedScreenManager;
}
