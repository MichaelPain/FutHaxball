# Sistema Ranked e Funzionalità Competitive

Questo documento descrive in dettaglio il sistema ranked e le funzionalità competitive implementate nel clone di HaxBall.

## Indice
1. [Modalità Ranked](#modalità-ranked)
2. [Sistema di Matchmaking](#sistema-di-matchmaking)
3. [Sistema di Verifiche Pre-Partita](#sistema-di-verifiche-pre-partita)
4. [Gestione delle Partite Ranked](#gestione-delle-partite-ranked)
5. [Sistema di Penalità](#sistema-di-penalità)
6. [Classifiche e Statistiche](#classifiche-e-statistiche)

## Modalità Ranked

Il gioco offre tre modalità competitive distinte:

### Solo (1v1)
- Partite uno contro uno
- Mappe ottimizzate per il gioco 1v1
- Durata partita: 3 minuti per tempo
- Punteggio massimo: 5 gol

### Doubles (2v2)
- Partite due contro due
- Team bilanciati in base all'MMR
- Durata partita: 4 minuti per tempo
- Punteggio massimo: 7 gol

### Team (3v3+)
- Partite a squadre complete (3v3 o più)
- Supporto per squadre preformate
- Durata partita: 5 minuti per tempo
- Punteggio massimo: 10 gol

## Sistema di Matchmaking

Il sistema di matchmaking è progettato per creare partite equilibrate e competitive:

### Funzionamento del Matchmaking
- Basato su un sistema MMR (Matchmaking Rating)
- Code separate per ogni modalità di gioco
- Range MMR dinamico che si espande con il tempo di attesa
- Sistema di accettazione del match con timeout

### Calcolo MMR
- Basato su una variante del sistema Elo
- Variazioni di MMR che dipendono dalla differenza di abilità
- Protezione per i nuovi giocatori nelle prime partite
- Sistema di ranghi visivi (Bronzo, Argento, Oro, Platino, Diamante, Campione)

### Bilanciamento delle Squadre
- Nelle modalità 2v2 e 3v3+, i team vengono bilanciati in base all'MMR totale
- Giocatori in gruppo vengono mantenuti nella stessa squadra
- Possibilità di giocare contro squadre di livello leggermente superiore se in gruppo

## Sistema di Verifiche Pre-Partita

Prima dell'inizio di ogni partita ranked, viene eseguita una serie di verifiche per garantire un'esperienza di gioco ottimale:

### Verifiche Tecniche
- Test di connessione (ping, stabilità, packet loss)
- Verifica delle prestazioni hardware
- Controllo della compatibilità del browser

### Verifiche di Prontezza
- Conferma manuale di ogni giocatore
- Timeout di 60 secondi per completare tutte le verifiche
- Possibilità di annullare la partita se un giocatore non completa le verifiche

### Gestione dei Fallimenti
- Se un giocatore fallisce le verifiche, la partita viene annullata
- Il giocatore che ha fallito le verifiche riceve una penalità temporanea
- Gli altri giocatori vengono rimessi in coda con priorità

## Gestione delle Partite Ranked

Durante le partite ranked, il sistema gestisce vari aspetti per garantire un'esperienza competitiva equa:

### Tracciamento delle Statistiche
- Gol, assist, autogoal
- Possesso palla (individuale e di squadra)
- Tocchi e calci
- Statistiche difensive (salvataggi, intercettazioni)

### Interfaccia di Gioco
- Visualizzazione in tempo reale delle statistiche
- Timer di gioco
- Punteggio e informazioni sulla partita
- Indicatori di stato dei giocatori

### Gestione delle Disconnessioni
- Rilevamento automatico delle disconnessioni
- Finestra di riconnessione di 2 minuti
- Penalità per disconnessioni frequenti
- Possibilità di annullare la partita in caso di disconnessioni all'inizio

### Completamento della Partita
- Calcolo automatico dell'MMR al termine
- Riepilogo dettagliato delle statistiche
- Registrazione della partita nello storico
- Aggiornamento delle classifiche

## Sistema di Penalità

Il sistema di penalità è progettato per mantenere un ambiente di gioco corretto e sportivo:

### Tipi di Penalità
- **Avvertimento**: Notifica senza conseguenze immediate
- **Ban dalla Chat**: Impossibilità di utilizzare la chat in-game
- **Ban dalle Partite Ranked**: Impossibilità di partecipare alle partite competitive
- **Ban Temporaneo**: Impossibilità di accedere al gioco

### Durata delle Penalità
- Le penalità possono essere temporanee o permanenti
- Le penalità temporanee hanno una durata variabile in base alla gravità e alla recidività
- Sistema di escalation per comportamenti ripetuti

### Comportamenti Sanzionabili
- Inattività (AFK) durante le partite
- Comportamento tossico in chat
- Cheating/Hacking
- Sabotaggio intenzionale
- Disconnessioni frequenti

### Sistema di Segnalazione
- Interfaccia per segnalare comportamenti scorretti
- Possibilità di allegare l'ID della partita
- Revisione delle segnalazioni da parte del team di moderazione
- Feedback sullo stato delle segnalazioni

## Classifiche e Statistiche

Il sistema di classifiche offre una visione completa delle performance dei giocatori:

### Classifiche Competitive
- Classifiche separate per ogni modalità (1v1, 2v2, 3v3+)
- Aggiornamento in tempo reale dopo ogni partita
- Visualizzazione della posizione dell'utente
- Filtri per regione e periodo di tempo

### Statistiche del Giocatore
- Statistiche generali (vittorie, sconfitte, percentuale di vittorie)
- Statistiche offensive (gol, assist, gol per partita)
- Statistiche difensive (salvataggi, intercettazioni)
- Evoluzione dell'MMR nel tempo

### Storico Partite
- Registro completo delle partite giocate
- Dettagli su ogni partita (punteggio, statistiche, avversari)
- Possibilità di rivedere le statistiche dettagliate
- Filtri per tipo di partita e risultato
