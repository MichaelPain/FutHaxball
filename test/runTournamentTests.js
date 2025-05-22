/**
 * runTournamentTests.js - Script per eseguire i test del sistema di tornei
 * 
 * Questo script esegue i test per verificare il corretto funzionamento
 * del sistema di tornei, inclusi tornei standard, eventi, campionati
 * geolocalizzati, tornei multi-stage e sistema di ricompense.
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('Avvio dei test del sistema di tornei...');

// Esegui i test con Mocha
const mochaProcess = spawn('npx', ['mocha', 'tournamentSystemTest.js', '--timeout', '10000'], {
  cwd: path.join(__dirname),
  stdio: 'inherit'
});

mochaProcess.on('close', (code) => {
  if (code === 0) {
    console.log('\n✅ Tutti i test del sistema di tornei sono stati completati con successo!');
  } else {
    console.error(`\n❌ I test del sistema di tornei sono falliti con codice di uscita ${code}`);
  }
});
