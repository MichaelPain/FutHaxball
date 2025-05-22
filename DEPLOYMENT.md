# Guida al Deployment - HaxBall Clone

Questa guida fornisce istruzioni dettagliate per il deployment del clone di HaxBall con le funzionalità aggiuntive richieste.

## Requisiti di Sistema

- Node.js v14.0.0 o superiore
- MongoDB v4.4 o superiore
- Un server con almeno 1GB di RAM e 10GB di spazio su disco
- Connessione internet stabile

## Configurazione dell'Ambiente

1. Clona il repository:
```bash
git clone https://github.com/tuorepository/haxball-clone.git
cd haxball-clone
```

2. Installa le dipendenze:
```bash
npm install
```

3. Crea un file `.env` nella directory principale con le seguenti variabili:
```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/haxball-clone
JWT_SECRET=il_tuo_segreto_jwt
EMAIL_SERVICE=gmail
EMAIL_USER=tua_email@gmail.com
EMAIL_PASSWORD=tua_password_email
```

## Deployment del Database

1. Assicurati che MongoDB sia in esecuzione:
```bash
sudo systemctl start mongod
sudo systemctl enable mongod
```

2. Crea il database:
```bash
mongo
> use haxball-clone
> exit
```

## Deployment del Server

### Opzione 1: Deployment Locale

1. Avvia il server in modalità sviluppo:
```bash
npm run dev
```

2. Oppure in modalità produzione:
```bash
npm start
```

### Opzione 2: Deployment su VPS (Digital Ocean, AWS, ecc.)

1. Configura il tuo server con Node.js e MongoDB

2. Clona il repository e installa le dipendenze come sopra

3. Configura un reverse proxy con Nginx:
```
server {
    listen 80;
    server_name tuodominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

4. Configura SSL con Let's Encrypt:
```bash
sudo certbot --nginx -d tuodominio.com
```

5. Usa PM2 per gestire il processo Node.js:
```bash
npm install -g pm2
pm2 start src/server/server.js --name haxball-clone
pm2 save
pm2 startup
```

### Opzione 3: Deployment su Servizi Cloud (Heroku, Vercel, ecc.)

1. Per Heroku:
```bash
heroku create
git push heroku main
heroku addons:create mongolab
heroku config:set JWT_SECRET=il_tuo_segreto_jwt
heroku config:set EMAIL_SERVICE=gmail
heroku config:set EMAIL_USER=tua_email@gmail.com
heroku config:set EMAIL_PASSWORD=tua_password_email
```

2. Per Vercel, crea un file `vercel.json`:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "src/server/server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "src/server/server.js"
    }
  ]
}
```

Poi esegui:
```bash
vercel
```

## Configurazione STUN/TURN per WebRTC

Per garantire che la comunicazione WebRTC funzioni correttamente anche attraverso NAT e firewall, configura i server STUN/TURN:

1. Installa e configura coturn:
```bash
sudo apt-get install coturn
sudo nano /etc/turnserver.conf
```

2. Aggiungi la seguente configurazione:
```
listening-port=3478
fingerprint
lt-cred-mech
realm=tuodominio.com
user=username:password
```

3. Avvia il servizio:
```bash
sudo systemctl start coturn
sudo systemctl enable coturn
```

4. Aggiorna la configurazione WebRTC nel file `src/client/js/networkManager.js` con i tuoi server STUN/TURN:
```javascript
const peerConnection = new RTCPeerConnection({
  iceServers: [
    { urls: 'stun:stun.tuodominio.com:3478' },
    { 
      urls: 'turn:turn.tuodominio.com:3478',
      username: 'username',
      credential: 'password'
    }
  ]
});
```

## Monitoraggio e Manutenzione

1. Configura il monitoraggio con PM2:
```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

2. Configura backup regolari del database:
```bash
mkdir -p /backup/mongodb
echo '#!/bin/bash
mongodump --out /backup/mongodb/$(date +"%Y-%m-%d")
find /backup/mongodb -type d -mtime +7 -exec rm -rf {} \;' > /etc/cron.daily/mongodb-backup
chmod +x /etc/cron.daily/mongodb-backup
```

## Aggiornamenti

Per aggiornare l'applicazione:

1. Esegui il pull delle ultime modifiche:
```bash
git pull origin main
```

2. Installa eventuali nuove dipendenze:
```bash
npm install
```

3. Riavvia il server:
```bash
pm2 restart haxball-clone
```

## Risoluzione dei Problemi

### Problemi di Connessione WebRTC

Se gli utenti riscontrano problemi con la connessione WebRTC:

1. Verifica che i server STUN/TURN siano configurati correttamente
2. Assicurati che le porte necessarie (3478 UDP/TCP) siano aperte nel firewall
3. Controlla i log del client per errori ICE

### Problemi di Performance

Se il server diventa lento:

1. Monitora l'utilizzo delle risorse:
```bash
pm2 monit
```

2. Considera l'aggiunta di un sistema di caching come Redis:
```bash
npm install redis
```

3. Implementa lo sharding del database MongoDB se necessario

## Contatti e Supporto

Per assistenza, contatta:
- Email: supporto@tuodominio.com
- Discord: discord.gg/tuoserver
