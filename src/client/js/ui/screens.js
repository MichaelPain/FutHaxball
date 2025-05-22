// Gestione delle schermate e dell'interfaccia utente
document.addEventListener('DOMContentLoaded', function() {
  // Riferimenti agli elementi DOM
  const screens = document.querySelectorAll('.screen');
  const mainMenuScreen = document.getElementById('main-menu-screen');
  const gameScreen = document.getElementById('game-screen');
  const roomScreen = document.getElementById('room-screen');
  const profileScreen = document.getElementById('profile-screen');
  const rankingScreen = document.getElementById('ranking-screen');
  const gameFieldContainer = document.querySelector('.game-field-container');
  
  // Funzione per mostrare una schermata specifica
  function showScreen(screenId) {
    // Nascondi tutte le schermate
    screens.forEach(screen => {
      screen.style.display = 'none';
    });
    
    // Mostra la schermata richiesta
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
      targetScreen.style.display = 'block';
    }
    
    // Gestisci la visibilità del campo di gioco
    if (gameFieldContainer) {
      // Mostra il campo solo nelle schermate di gioco
      if (screenId === 'game-screen' || screenId === 'room-screen') {
        gameFieldContainer.style.display = 'block';
        // Inizializza o mostra il gioco se esiste
        if (window.haxballGame) {
          window.haxballGame.showGame();
        }
      } else {
        gameFieldContainer.style.display = 'none';
        // Nascondi il gioco se esiste
        if (window.haxballGame) {
          window.haxballGame.hideGame();
        }
      }
    }
  }
  
  // Inizializza con la schermata del menu principale
  showScreen('main-menu-screen');
  
  // Gestione dei pulsanti del menu principale
  const playButton = document.querySelector('.menu-option[data-screen="game-screen"]');
  const roomsButton = document.querySelector('.menu-option[data-screen="room-screen"]');
  const profileButton = document.querySelector('.menu-option[data-screen="profile-screen"]');
  const rankingButton = document.querySelector('.menu-option[data-screen="ranking-screen"]');
  
  // Aggiungi event listener ai pulsanti
  if (playButton) {
    playButton.addEventListener('click', function() {
      showScreen('game-screen');
    });
  }
  
  if (roomsButton) {
    roomsButton.addEventListener('click', function() {
      showScreen('room-screen');
    });
  }
  
  if (profileButton) {
    profileButton.addEventListener('click', function() {
      showScreen('profile-screen');
    });
  }
  
  if (rankingButton) {
    rankingButton.addEventListener('click', function() {
      showScreen('ranking-screen');
    });
  }
  
  // Aggiungi pulsanti di ritorno al menu per ogni schermata
  screens.forEach(screen => {
    if (screen.id !== 'main-menu-screen') {
      const backButton = document.createElement('button');
      backButton.className = 'back-button';
      backButton.textContent = 'Torna al Menu';
      backButton.addEventListener('click', function() {
        showScreen('main-menu-screen');
      });
      
      // Aggiungi il pulsante solo se non esiste già
      if (!screen.querySelector('.back-button')) {
        screen.appendChild(backButton);
      }
    }
  });
  
  // Esponi l'API per la gestione delle schermate
  window.screenManager = {
    showScreen: showScreen
  };
});
