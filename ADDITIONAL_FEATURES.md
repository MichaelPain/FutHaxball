# Aggiornamento della Documentazione - HaxBall Clone con Funzionalità Aggiuntive

Questo documento descrive le funzionalità aggiuntive implementate nel clone di HaxBall e fornisce istruzioni per il loro utilizzo.

## Indice
1. [Sistema di Stanze Casual](#sistema-di-stanze-casual)
2. [Editor di Mappe Personalizzate](#editor-di-mappe-personalizzate)
3. [Sistema di Regole Personalizzate](#sistema-di-regole-personalizzate)
4. [Sistema di Invito tramite Link](#sistema-di-invito-tramite-link)
5. [Trasferimento Host](#trasferimento-host)

## Sistema di Stanze Casual

Il sistema di stanze casual permette ai giocatori di creare e unirsi a partite non competitive, ideali per giocare con amici o allenarsi.

### Caratteristiche Principali
- **Creazione di stanze**: Crea stanze personalizzate con nome, password opzionale e numero massimo di giocatori
- **Filtri e ricerca**: Trova facilmente stanze in base al nome o al tipo
- **Chat in-game**: Comunica con altri giocatori nella stanza
- **Gestione dei giocatori**: Cambia squadra, espelli o banna giocatori (solo per l'host)

### Come Utilizzare
1. Dalla schermata principale, seleziona "Stanze Casual"
2. Per creare una stanza, clicca su "Crea Stanza" e compila il form
3. Per unirti a una stanza esistente, selezionala dalla lista e clicca "Entra"
4. Se la stanza è protetta da password, ti verrà richiesto di inserirla
5. Una volta nella stanza, puoi cambiare squadra cliccando sul tuo nome e selezionando la squadra desiderata
6. L'host può avviare la partita quando tutti i giocatori sono pronti

## Editor di Mappe Personalizzate

L'editor di mappe permette di creare, modificare e condividere mappe personalizzate per le partite.

### Caratteristiche Principali
- **Interfaccia visuale**: Editor intuitivo con funzionalità drag-and-drop
- **Elementi personalizzabili**: Aggiungi pareti, porte, punti di spawn e decorazioni
- **Salvataggio e caricamento**: Salva le tue mappe e carica quelle create da altri
- **Test immediato**: Prova la tua mappa prima di pubblicarla

### Come Utilizzare
1. Dalla schermata principale, seleziona "Editor di Mappe"
2. Per creare una nuova mappa, clicca su "Nuova Mappa" e imposta dimensioni e nome
3. Usa gli strumenti nella barra laterale per aggiungere elementi:
   - Pareti: Definiscono i confini e gli ostacoli
   - Porte: Necessarie per entrambe le squadre (rossa e blu)
   - Punti di spawn: Posizioni di partenza per i giocatori
   - Decorazioni: Elementi estetici senza effetto sul gameplay
4. Seleziona un elemento per spostarlo o eliminarlo
5. Usa la rotellina del mouse per lo zoom
6. Clicca "Salva" per salvare la mappa
7. Clicca "Test" per provare la mappa in una partita di prova

## Sistema di Regole Personalizzate

Il sistema di regole personalizzate consente di modificare vari aspetti del gameplay per creare esperienze di gioco uniche.

### Caratteristiche Principali
- **Parametri di gioco**: Modifica limiti di tempo, punteggio, dimensioni delle squadre
- **Fisica personalizzabile**: Regola velocità della palla, dei giocatori, forza del calcio
- **Preset salvabili**: Crea e salva configurazioni di regole per riutilizzarle
- **Validazione automatica**: Verifica che le regole siano valide e bilanciate

### Come Utilizzare
1. Quando crei o modifichi una stanza, clicca su "Regole Personalizzate"
2. Seleziona un preset esistente dal menu a tendina o crea regole personalizzate
3. Regola i parametri usando i cursori e i campi di input:
   - **Limiti di Gioco**: Tempo, punteggio, dimensione squadre
   - **Fisica**: Velocità palla/giocatori, forza calcio, dimensioni
   - **Opzioni di Gioco**: Collisioni tra compagni, autogol, kickoff
   - **Overtime**: Impostazioni per tempi supplementari e sudden death
4. Clicca "Salva Preset" per salvare la configurazione per uso futuro
5. Clicca "Salva Regole" per applicare le regole alla stanza corrente

## Sistema di Invito tramite Link

Il sistema di invito permette di condividere facilmente un link per invitare amici a unirsi alla tua stanza.

### Caratteristiche Principali
- **Link univoci**: Ogni stanza ha un link di invito unico
- **Condivisione semplice**: Copia il link negli appunti con un clic
- **Accesso diretto**: Gli invitati possono unirsi direttamente tramite link
- **Supporto password**: I link possono includere la password per stanze private

### Come Utilizzare
1. Quando sei in una stanza, clicca sul pulsante "Invita Amici"
2. Il link di invito verrà generato e copiato automaticamente negli appunti
3. Condividi il link con i tuoi amici tramite qualsiasi piattaforma (Discord, WhatsApp, email, ecc.)
4. Quando qualcuno clicca sul link, verrà indirizzato direttamente alla tua stanza
5. Se la stanza è protetta da password, il link includerà automaticamente la password

## Trasferimento Host

Il sistema di trasferimento host permette di passare i privilegi di host a un altro giocatore nella stanza.

### Caratteristiche Principali
- **Trasferimento manuale**: L'host può trasferire i privilegi a qualsiasi giocatore
- **Trasferimento automatico**: In caso di disconnessione dell'host, i privilegi vengono trasferiti automaticamente
- **Sistema di priorità**: Il trasferimento automatico segue un sistema di priorità basato sul tempo di permanenza nella stanza

### Come Utilizzare
1. Come host, clicca sul nome di un altro giocatore nella lista
2. Seleziona l'opzione "Trasferisci Host"
3. Conferma l'azione nel popup di conferma
4. Il giocatore selezionato diventerà il nuovo host e riceverà una notifica
5. I privilegi di host includono:
   - Avviare la partita
   - Espellere o bannare giocatori
   - Modificare le impostazioni della stanza
   - Trasferire i privilegi di host

---

Tutte queste funzionalità sono state implementate mantenendo la compatibilità con le meccaniche di gioco originali di HaxBall, garantendo un'esperienza di gioco familiare ma arricchita.
