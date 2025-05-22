# Sistema Ranked e Matchmaking - Documentazione

Questo documento descrive il sistema di matchmaking competitivo e classifiche implementato nel clone di HaxBall.

## Indice
1. [Panoramica](#panoramica)
2. [Modalità Competitive](#modalità-competitive)
3. [Sistema di Matchmaking](#sistema-di-matchmaking)
4. [Calcolo MMR](#calcolo-mmr)
5. [Classifiche](#classifiche)
6. [Flusso di Gioco](#flusso-di-gioco)
7. [Integrazione con il Client](#integrazione-con-il-client)
8. [API Server](#api-server)

## Panoramica

Il sistema ranked di HaxBall Clone offre un'esperienza competitiva strutturata dove i giocatori possono competere in diverse modalità e migliorare il loro posizionamento nelle classifiche. Il sistema utilizza un algoritmo di matchmaking basato su MMR (Matchmaking Rating) per creare partite equilibrate tra giocatori di livello simile.

## Modalità Competitive

Il sistema supporta tre modalità competitive principali:

### Solo (1v1)
- Partite uno contro uno
- Focus sulle abilità individuali
- Classifiche separate per questa modalità

### Doubles (2v2)
- Partite due contro due
- Bilanciamento dei team basato sull'MMR
- Possibilità di entrare in coda da soli o con un amico

### Team (3v3)
- Partite tre contro tre
- Esperienza di squadra completa
- Classifiche separate per questa modalità

## Sistema di Matchmaking

Il matchmaking è progettato per creare partite equilibrate e ridurre i tempi di attesa:

### Processo di Matchmaking
1. I giocatori entrano in coda per una modalità specifica
2. Il sistema cerca altri giocatori con MMR simile
3. Inizialmente, il range di MMR è ristretto (±100 punti)
4. Con l'aumentare del tempo di attesa, il range si espande gradualmente
5. Una volta trovati abbastanza giocatori, viene creato un match
6. Tutti i giocatori devono accettare il match entro 30 secondi
7. Se tutti accettano, il match inizia; altrimenti, i giocatori che hanno accettato vengono rimessi in coda

### Bilanciamento dei Team
- Per le modalità 2v2 e 3v3, i team vengono bilanciati in base all'MMR
- I giocatori vengono distribuiti in modo da minimizzare la differenza di MMR tra i team
- Esempio 2v2: [1800, 1200] vs [1700, 1300] invece di [1800, 1700] vs [1300, 1200]

## Calcolo MMR

L'MMR è il valore numerico che rappresenta l'abilità di un giocatore:

### Sistema di Rating
- Basato su una variante del sistema Elo
- MMR iniziale: 1000
- Range MMR: 500-4000
- Fattori K (determinano quanto velocemente cambia l'MMR):
  - 1v1: 32
  - 2v2: 24
  - 3v3: 20

### Variazione MMR
- Vittoria contro giocatori con MMR più alto = guadagno maggiore
- Sconfitta contro giocatori con MMR più basso = perdita maggiore
- Pareggio = variazione minima o nulla
- Protezione per i nuovi giocatori: guadagno aumentato e perdite ridotte nelle prime 10 partite

### Ranghi
L'MMR determina il rango visibile del giocatore:
- Bronzo 1-3: 500-1399
- Argento 1-3: 1400-1999
- Oro 1-3: 2000-2599
- Platino 1-3: 2600-3199
- Diamante 1-3: 3200-3799
- Campione: 3800+

## Classifiche

Le classifiche mostrano i migliori giocatori per ogni modalità:

### Caratteristiche
- Aggiornamento in tempo reale dopo ogni partita
- Visualizzazione del rango, MMR e statistiche principali
- Filtri per modalità (1v1, 2v2, 3v3)
- Evidenziazione della posizione dell'utente corrente

### Statistiche Tracciate
- Partite giocate
- Vittorie/Sconfitte
- Percentuale di vittorie
- Gol segnati
- MMR attuale e storico

## Flusso di Gioco

Il flusso di una partita ranked è il seguente:

1. **Entrata in Coda**
   - Il giocatore seleziona una modalità ranked
   - Entra in coda e riceve una stima del tempo di attesa

2. **Match Trovato**
   - Tutti i giocatori ricevono una notifica
   - Hanno 30 secondi per accettare il match
   - Se tutti accettano, il match viene creato

3. **Pre-Partita**
   - I giocatori vengono assegnati ai team
   - Viene selezionata una mappa ufficiale
   - Breve countdown prima dell'inizio

4. **Partita**
   - La partita si svolge con le regole competitive standard
   - Timer e punteggio visualizzati
   - Statistiche in tempo reale

5. **Post-Partita**
   - Visualizzazione del risultato finale
   - Riepilogo delle statistiche individuali
   - Variazione MMR per ogni giocatore
   - Aggiornamento delle classifiche

## Integrazione con il Client

Il sistema ranked è integrato nel client attraverso diversi componenti:

### RankedMatchmaking.js
- Gestisce l'interfaccia utente per il matchmaking
- Comunica con il server per entrare/uscire dalla coda
- Gestisce le notifiche di match trovato
- Visualizza lo stato della coda e i tempi di attesa

### RankingSystem.js
- Visualizza le classifiche per le diverse modalità
- Mostra le statistiche personali dell'utente
- Permette di visualizzare lo storico delle partite
- Visualizza i ranghi e le variazioni di MMR

## API Server

Il server espone diverse API per il sistema ranked:

### Matchmaking
- `POST /api/matchmaking/join` - Entra in coda per una modalità
- `POST /api/matchmaking/leave` - Esci dalla coda
- `POST /api/matchmaking/accept` - Accetta un match trovato
- `POST /api/matchmaking/decline` - Rifiuta un match trovato

### Classifiche
- `GET /api/rankings/:mode` - Ottieni le classifiche per una modalità
- `GET /api/rankings/me` - Ottieni le statistiche personali
- `GET /api/rankings/player/:id` - Ottieni le statistiche di un giocatore specifico

### Match
- `GET /api/matches/:id` - Ottieni i dettagli di un match
- `GET /api/matches/history` - Ottieni lo storico delle partite dell'utente
- `POST /api/matches/:id/report` - Segnala un problema in un match

---

Il sistema ranked e matchmaking è progettato per essere equo, competitivo e coinvolgente, offrendo ai giocatori un'esperienza di gioco strutturata con obiettivi chiari di progressione e miglioramento.
