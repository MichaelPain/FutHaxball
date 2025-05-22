// test/runRankedTests.js - Script per eseguire i test del sistema ranked e matchmaking

const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configurazione
const testDir = path.join(__dirname);
const rankedTestFiles = [
  'rankedSystemTest.js'
];

console.log('Esecuzione dei test per il sistema ranked e matchmaking di HaxBall Clone...');
console.log(`Trovati ${rankedTestFiles.length} file di test`);

// Verifica che le dipendenze per i test siano installate
console.log('Verifica delle dipendenze per i test...');
exec('npm list --depth=0 mocha chai chai-http', (error, stdout, stderr) => {
  const installDeps = error || !stdout.includes('mocha') || !stdout.includes('chai');
  
  if (installDeps) {
    console.log('Installazione delle dipendenze per i test...');
    exec('npm install --save-dev mocha chai chai-http', (error, stdout, stderr) => {
      if (error) {
        console.error(`Errore nell'installazione delle dipendenze: ${error.message}`);
        return;
      }
      
      console.log('Dipendenze installate con successo');
      runTests();
    });
  } else {
    console.log('Dipendenze già installate');
    runTests();
  }
});

function runTests() {
  // Esegui i test uno per uno
  let completedTests = 0;
  let failedTests = 0;
  
  rankedTestFiles.forEach(testFile => {
    const fullPath = path.join(testDir, testFile);
    console.log(`\nEsecuzione di ${testFile}...`);
    
    exec(`npx mocha ${fullPath}`, (error, stdout, stderr) => {
      console.log(stdout);
      
      if (error) {
        console.error(`Test falliti in ${testFile}`);
        failedTests++;
      } else {
        console.log(`Test completati con successo in ${testFile}`);
      }
      
      completedTests++;
      
      // Quando tutti i test sono completati, mostra il riepilogo
      if (completedTests === rankedTestFiles.length) {
        console.log('\n=== Riepilogo dei Test del Sistema Ranked ===');
        console.log(`Test completati: ${completedTests}/${rankedTestFiles.length}`);
        console.log(`Test falliti: ${failedTests}`);
        
        if (failedTests === 0) {
          console.log('\nTutti i test del sistema ranked sono stati completati con successo!');
        } else {
          console.log('\nAlcuni test sono falliti. Controlla i log per maggiori dettagli.');
        }
      }
    });
  });
}
