// test/runTests.js - Script per eseguire tutti i test

const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configurazione
const testDir = path.join(__dirname);
const testFiles = fs.readdirSync(testDir)
  .filter(file => file.endsWith('Test.js'))
  .map(file => path.join(testDir, file));

console.log('Esecuzione dei test per HaxBall Clone...');
console.log(`Trovati ${testFiles.length} file di test`);

// Installa le dipendenze necessarie per i test
console.log('Installazione delle dipendenze per i test...');
exec('npm install --save-dev mocha chai chai-http', (error, stdout, stderr) => {
  if (error) {
    console.error(`Errore nell'installazione delle dipendenze: ${error.message}`);
    return;
  }
  
  console.log('Dipendenze installate con successo');
  
  // Esegui i test uno per uno
  let completedTests = 0;
  let failedTests = 0;
  
  testFiles.forEach(testFile => {
    const fileName = path.basename(testFile);
    console.log(`\nEsecuzione di ${fileName}...`);
    
    exec(`npx mocha ${testFile}`, (error, stdout, stderr) => {
      console.log(stdout);
      
      if (error) {
        console.error(`Test falliti in ${fileName}`);
        failedTests++;
      } else {
        console.log(`Test completati con successo in ${fileName}`);
      }
      
      completedTests++;
      
      // Quando tutti i test sono completati, mostra il riepilogo
      if (completedTests === testFiles.length) {
        console.log('\n=== Riepilogo dei Test ===');
        console.log(`Test completati: ${completedTests}/${testFiles.length}`);
        console.log(`Test falliti: ${failedTests}`);
        
        if (failedTests === 0) {
          console.log('\nTutti i test sono stati completati con successo!');
        } else {
          console.log('\nAlcuni test sono falliti. Controlla i log per maggiori dettagli.');
        }
      }
    });
  });
});
