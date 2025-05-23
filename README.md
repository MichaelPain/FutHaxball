# README - HaxBall Clone Avanzato

## Panoramica

Questo progetto è un clone avanzato del popolare gioco di calcio 2D [HaxBall](https://www.haxball.com), mantenendo le meccaniche di gioco, la grafica e la struttura originali, ma con l'aggiunta di numerose funzionalità avanzate e miglioramenti significativi.

## Caratteristiche

### Funzionalità Base
- **Meccaniche di gioco originali**: Fisica realistica, controlli semplici e intuitivi
- **Sistema di autenticazione completo**: Registrazione con email, login, recupero password
- **Matchmaking competitivo**: Sistema basato su MMR per partite equilibrate
- **Classifiche separate**: Ranking per modalità 1v1, 2v2 e squadre
- **Architettura di rete P2P**: Comunicazione WebRTC con fallback a WebSocket
- **Statistiche dettagliate**: Tracciamento completo delle performance dei giocatori
- **Interfaccia responsive**: Compatibile con desktop e dispositivi mobili

### Funzionalità Aggiuntive
- **Sistema di stanze casual**: Crea e gestisci stanze personalizzate per partite amichevoli
- **Editor di mappe personalizzate**: Crea, modifica e condividi le tue mappe di gioco
- **Sistema di regole personalizzate**: Modifica parametri di gioco, fisica e altre opzioni
- **Sistema di invito tramite link**: Invita amici direttamente con link univoci
- **Trasferimento host**: Passa i privilegi di host ad altri giocatori

### Funzionalità Ranked
- **Sistema di verifiche pre-partita**: Garantisce partite competitive di qualità
- **Gestione avanzata delle partite ranked**: Tracciamento statistiche in tempo reale
- **Sistema di penalità**: Mantiene un ambiente di gioco corretto e sportivo
- **Classifiche competitive**: Aggiornate in tempo reale con statistiche dettagliate

## Tecnologie Utilizzate

- **Frontend**: HTML5, CSS3, JavaScript (Canvas API)
- **Backend**: Node.js, Express
- **Database**: MongoDB
- **Autenticazione**: JWT, bcrypt
- **Comunicazione in tempo reale**: Socket.IO, WebRTC
- **Test**: Jest (Client-side), Mocha, Chai, Sinon (Server-side)

## Struttura del Progetto

```
haxball-clone/
├── src/
│   ├── client/
│   │   ├── assets/
│   │   ├── css/
│   │   ├── js/
│   │   └── index.html
│   └── server/
│       ├── controllers/
│       ├── middleware/
│       ├── models/
│       ├── routes/
│       └── server.js
├── test/
├── DEPLOYMENT.md
├── USER_GUIDE.md
├── ADDITIONAL_FEATURES.md
├── package.json
└── README.md
```

## Installazione e Avvio Rapido

1. Clona il repository:
```bash
git clone https://github.com/tuorepository/haxball-clone.git
cd haxball-clone
```

2. Installa le dipendenze:
```bash
npm install
```

3. Configura le variabili d'ambiente creando un file `.env`:
```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/haxball-clone
JWT_SECRET=il_tuo_segreto_jwt
EMAIL_SERVICE=gmail
EMAIL_USER=tua_email@gmail.com
EMAIL_PASSWORD=tua_password_email
```

4. Avvia il server:
```bash
npm start
```

5. Apri il browser e vai a `http://localhost:3000`

## Documentazione

Per informazioni dettagliate, consulta:

- [Guida Utente](USER_GUIDE.md) - Istruzioni complete per gli utenti finali
- [Guida al Deployment](DEPLOYMENT.md) - Istruzioni per il deployment in produzione
- [Funzionalità Aggiuntive](ADDITIONAL_FEATURES.md) - Dettagli sulle funzionalità avanzate
- [Sistema Ranked](RANKED_FEATURES.md) - Documentazione del sistema competitivo e matchmaking

## Test

### Test Lato Client (Jest)
Per eseguire i test unitari e di integrazione per la logica client-side:
```bash
npm test
```
Per eseguirli in modalità watch:
```bash
npm run test:watch
```
Questi test coprono utilità client-side e gestori logici.

### Test Lato Server (Mocha)
Per i test di integrazione e di sistema per la logica server-side:
```bash
# Assicurati che le dipendenze di sviluppo per i test server siano installate.
# (mocha, chai, chai-http, sinon - idealmente definite in package.json)
cd test
node runTests.js
```

## Licenza

Questo progetto è rilasciato sotto licenza MIT. Vedi il file LICENSE per i dettagli.

## Contribuire

I contributi sono benvenuti! Per favore, leggi le linee guida per i contributi prima di inviare pull request.

## Contatti

Per domande o supporto, contatta:
- Email: supporto@tuodominio.com
- Discord: discord.gg/tuoserver
