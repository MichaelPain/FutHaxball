// mapEditor.js - Gestisce l'editor di mappe personalizzate

export class MapEditor {
    constructor(uiManager, gameManager) {
        this.uiManager = uiManager;
        this.gameManager = gameManager;
        this.canvas = document.getElementById('map-editor-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.currentMap = null;
        this.selectedElement = null;
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.scale = 1;
        
        // Elementi della mappa
        this.mapElements = {
            walls: [],
            goals: [],
            spawnPoints: {
                red: [],
                blue: []
            },
            decorations: []
        };
        
        // Binding dei metodi
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Canvas events
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.canvas.addEventListener('wheel', this.handleWheel.bind(this));
        
        // Toolbar buttons
        document.getElementById('add-wall-btn').addEventListener('click', () => this.addElement('wall'));
        document.getElementById('add-goal-btn').addEventListener('click', () => this.addElement('goal'));
        document.getElementById('add-red-spawn-btn').addEventListener('click', () => this.addElement('redSpawn'));
        document.getElementById('add-blue-spawn-btn').addEventListener('click', () => this.addElement('blueSpawn'));
        document.getElementById('add-decoration-btn').addEventListener('click', () => this.addElement('decoration'));
        document.getElementById('delete-element-btn').addEventListener('click', () => this.deleteSelectedElement());
        
        // Map controls
        document.getElementById('new-map-btn').addEventListener('click', () => this.createNewMap());
        document.getElementById('save-map-btn').addEventListener('click', () => this.saveMap());
        document.getElementById('load-map-btn').addEventListener('click', () => this.showLoadMapModal());
        document.getElementById('test-map-btn').addEventListener('click', () => this.testMap());
    }
    
    // Inizializza l'editor con una mappa vuota o esistente
    initialize(mapData = null) {
        // Imposta le dimensioni del canvas
        this.canvas.width = 800;
        this.canvas.height = 600;
        
        if (mapData) {
            // Carica una mappa esistente
            this.loadMap(mapData);
        } else {
            // Crea una nuova mappa vuota
            this.createNewMap();
        }
        
        // Renderizza la mappa
        this.render();
    }
    
    // Crea una nuova mappa vuota
    createNewMap() {
        // Mostra il modal per la creazione di una nuova mappa
        const modal = document.getElementById('new-map-modal');
        const nameInput = document.getElementById('map-name-input');
        const widthInput = document.getElementById('map-width-input');
        const heightInput = document.getElementById('map-height-input');
        const submitButton = document.getElementById('create-map-btn');
        const cancelButton = document.getElementById('cancel-create-map-btn');
        
        // Resetta gli input
        nameInput.value = 'Nuova Mappa';
        widthInput.value = '800';
        heightInput.value = '600';
        
        // Mostra il modal
        modal.classList.add('active');
        
        // Gestisci il submit
        const handleSubmit = () => {
            const name = nameInput.value.trim();
            const width = parseInt(widthInput.value, 10);
            const height = parseInt(heightInput.value, 10);
            
            if (name && !isNaN(width) && !isNaN(height) && width > 0 && height > 0) {
                this.currentMap = {
                    name,
                    width,
                    height,
                    author: this.gameManager.authManager.getCurrentUser().nickname,
                    createdAt: new Date().toISOString(),
                    elements: {
                        walls: [],
                        goals: {
                            red: { x: 0, y: height / 2, width: 8, height: 140 },
                            blue: { x: width - 8, y: height / 2, width: 8, height: 140 }
                        },
                        spawnPoints: {
                            red: [{ x: width * 0.2, y: height / 2 }],
                            blue: [{ x: width * 0.8, y: height / 2 }]
                        },
                        decorations: []
                    }
                };
                
                // Aggiorna le dimensioni del canvas
                this.canvas.width = width;
                this.canvas.height = height;
                
                // Aggiorna gli elementi della mappa
                this.mapElements = {
                    walls: [],
                    goals: [
                        { type: 'goal', team: 'red', x: 0, y: height / 2 - 70, width: 8, height: 140 },
                        { type: 'goal', team: 'blue', x: width - 8, y: height / 2 - 70, width: 8, height: 140 }
                    ],
                    spawnPoints: {
                        red: [{ type: 'spawnPoint', team: 'red', x: width * 0.2, y: height / 2 }],
                        blue: [{ type: 'spawnPoint', team: 'blue', x: width * 0.8, y: height / 2 }]
                    },
                    decorations: []
                };
                
                // Renderizza la nuova mappa
                this.render();
                
                // Chiudi il modal
                modal.classList.remove('active');
            } else {
                this.uiManager.showError('Inserisci valori validi per nome, larghezza e altezza');
            }
        };
        
        // Event listener per il pulsante di submit
        submitButton.onclick = handleSubmit;
        
        // Event listener per il pulsante di annulla
        cancelButton.onclick = () => {
            modal.classList.remove('active');
        };
    }
    
    // Carica una mappa esistente
    loadMap(mapData) {
        this.currentMap = mapData;
        
        // Aggiorna le dimensioni del canvas
        this.canvas.width = mapData.width;
        this.canvas.height = mapData.height;
        
        // Converte gli elementi della mappa in un formato utilizzabile dall'editor
        this.mapElements = {
            walls: [],
            goals: [],
            spawnPoints: {
                red: [],
                blue: []
            },
            decorations: []
        };
        
        // Aggiungi le pareti
        if (mapData.elements.walls) {
            mapData.elements.walls.forEach(wall => {
                this.mapElements.walls.push({
                    type: 'wall',
                    x: wall.x,
                    y: wall.y,
                    width: wall.width,
                    height: wall.height
                });
            });
        }
        
        // Aggiungi le porte
        if (mapData.elements.goals) {
            if (mapData.elements.goals.red) {
                this.mapElements.goals.push({
                    type: 'goal',
                    team: 'red',
                    x: mapData.elements.goals.red.x,
                    y: mapData.elements.goals.red.y - mapData.elements.goals.red.height / 2,
                    width: mapData.elements.goals.red.width,
                    height: mapData.elements.goals.red.height
                });
            }
            
            if (mapData.elements.goals.blue) {
                this.mapElements.goals.push({
                    type: 'goal',
                    team: 'blue',
                    x: mapData.elements.goals.blue.x,
                    y: mapData.elements.goals.blue.y - mapData.elements.goals.blue.height / 2,
                    width: mapData.elements.goals.blue.width,
                    height: mapData.elements.goals.blue.height
                });
            }
        }
        
        // Aggiungi i punti di spawn
        if (mapData.elements.spawnPoints) {
            if (mapData.elements.spawnPoints.red) {
                mapData.elements.spawnPoints.red.forEach(spawn => {
                    this.mapElements.spawnPoints.red.push({
                        type: 'spawnPoint',
                        team: 'red',
                        x: spawn.x,
                        y: spawn.y
                    });
                });
            }
            
            if (mapData.elements.spawnPoints.blue) {
                mapData.elements.spawnPoints.blue.forEach(spawn => {
                    this.mapElements.spawnPoints.blue.push({
                        type: 'spawnPoint',
                        team: 'blue',
                        x: spawn.x,
                        y: spawn.y
                    });
                });
            }
        }
        
        // Aggiungi le decorazioni
        if (mapData.elements.decorations) {
            mapData.elements.decorations.forEach(decoration => {
                this.mapElements.decorations.push({
                    type: 'decoration',
                    x: decoration.x,
                    y: decoration.y,
                    width: decoration.width,
                    height: decoration.height,
                    color: decoration.color || '#cccccc'
                });
            });
        }
        
        // Renderizza la mappa
        this.render();
    }
    
    // Salva la mappa corrente
    saveMap() {
        if (!this.currentMap) {
            this.uiManager.showError('Nessuna mappa da salvare');
            return;
        }
        
        // Mostra il modal per il salvataggio
        const modal = document.getElementById('save-map-modal');
        const nameInput = document.getElementById('save-map-name-input');
        const descriptionInput = document.getElementById('map-description-input');
        const submitButton = document.getElementById('save-map-confirm-btn');
        const cancelButton = document.getElementById('cancel-save-map-btn');
        
        // Imposta i valori attuali
        nameInput.value = this.currentMap.name;
        descriptionInput.value = this.currentMap.description || '';
        
        // Mostra il modal
        modal.classList.add('active');
        
        // Gestisci il submit
        const handleSubmit = () => {
            const name = nameInput.value.trim();
            const description = descriptionInput.value.trim();
            
            if (name) {
                // Aggiorna i metadati della mappa
                this.currentMap.name = name;
                this.currentMap.description = description;
                this.currentMap.updatedAt = new Date().toISOString();
                
                // Converti gli elementi dell'editor nel formato di salvataggio
                this.currentMap.elements = {
                    walls: this.mapElements.walls.map(wall => ({
                        x: wall.x,
                        y: wall.y,
                        width: wall.width,
                        height: wall.height
                    })),
                    goals: {
                        red: this.mapElements.goals.find(goal => goal.team === 'red') ? {
                            x: this.mapElements.goals.find(goal => goal.team === 'red').x,
                            y: this.mapElements.goals.find(goal => goal.team === 'red').y + this.mapElements.goals.find(goal => goal.team === 'red').height / 2,
                            width: this.mapElements.goals.find(goal => goal.team === 'red').width,
                            height: this.mapElements.goals.find(goal => goal.team === 'red').height
                        } : null,
                        blue: this.mapElements.goals.find(goal => goal.team === 'blue') ? {
                            x: this.mapElements.goals.find(goal => goal.team === 'blue').x,
                            y: this.mapElements.goals.find(goal => goal.team === 'blue').y + this.mapElements.goals.find(goal => goal.team === 'blue').height / 2,
                            width: this.mapElements.goals.find(goal => goal.team === 'blue').width,
                            height: this.mapElements.goals.find(goal => goal.team === 'blue').height
                        } : null
                    },
                    spawnPoints: {
                        red: this.mapElements.spawnPoints.red.map(spawn => ({
                            x: spawn.x,
                            y: spawn.y
                        })),
                        blue: this.mapElements.spawnPoints.blue.map(spawn => ({
                            x: spawn.x,
                            y: spawn.y
                        }))
                    },
                    decorations: this.mapElements.decorations.map(decoration => ({
                        x: decoration.x,
                        y: decoration.y,
                        width: decoration.width,
                        height: decoration.height,
                        color: decoration.color
                    }))
                };
                
                // Salva la mappa nel database
                this.gameManager.networkManager.saveMap(this.currentMap)
                    .then(response => {
                        this.uiManager.showSuccess('Mappa salvata con successo');
                        // Aggiorna l'ID della mappa se è una nuova mappa
                        if (response.mapId && !this.currentMap.id) {
                            this.currentMap.id = response.mapId;
                        }
                    })
                    .catch(error => {
                        this.uiManager.showError('Errore nel salvataggio della mappa: ' + error.message);
                    });
                
                // Chiudi il modal
                modal.classList.remove('active');
            } else {
                this.uiManager.showError('Il nome della mappa è obbligatorio');
            }
        };
        
        // Event listener per il pulsante di submit
        submitButton.onclick = handleSubmit;
        
        // Event listener per il pulsante di annulla
        cancelButton.onclick = () => {
            modal.classList.remove('active');
        };
    }
    
    // Mostra il modal per caricare una mappa
    showLoadMapModal() {
        // Mostra il modal per il caricamento
        const modal = document.getElementById('load-map-modal');
        const mapListElement = document.getElementById('map-list');
        const closeButton = document.getElementById('close-load-map-btn');
        
        // Pulisci la lista
        mapListElement.innerHTML = '';
        
        // Carica la lista delle mappe dal server
        this.gameManager.networkManager.getMaps()
            .then(maps => {
                if (maps.length === 0) {
                    mapListElement.innerHTML = '<div class="no-maps-message">Nessuna mappa disponibile</div>';
                    return;
                }
                
                // Crea un elemento per ogni mappa
                maps.forEach(map => {
                    const mapElement = document.createElement('div');
                    mapElement.className = 'map-item';
                    mapElement.innerHTML = `
                        <div class="map-info">
                            <div class="map-name">${map.name}</div>
                            <div class="map-author">di ${map.author}</div>
                            <div class="map-date">Creata il ${new Date(map.createdAt).toLocaleDateString()}</div>
                        </div>
                        <button class="load-map-item-btn">Carica</button>
                    `;
                    
                    // Event listener per il pulsante di caricamento
                    const loadButton = mapElement.querySelector('.load-map-item-btn');
                    loadButton.addEventListener('click', () => {
                        this.loadMap(map);
                        modal.classList.remove('active');
                    });
                    
                    mapListElement.appendChild(mapElement);
                });
            })
            .catch(error => {
                mapListElement.innerHTML = `<div class="error-message">Errore nel caricamento delle mappe: ${error.message}</div>`;
            });
        
        // Mostra il modal
        modal.classList.add('active');
        
        // Event listener per il pulsante di chiusura
        closeButton.onclick = () => {
            modal.classList.remove('active');
        };
    }
    
    // Testa la mappa corrente
    testMap() {
        if (!this.currentMap) {
            this.uiManager.showError('Nessuna mappa da testare');
            return;
        }
        
        // Verifica che la mappa abbia tutti gli elementi necessari
        if (!this.validateMap()) {
            return;
        }
        
        // Converti la mappa nel formato di gioco
        const gameMap = this.convertMapToGameFormat();
        
        // Avvia una partita di test con la mappa
        this.gameManager.startTestGame(gameMap);
    }
    
    // Valida la mappa corrente
    validateMap() {
        // Verifica che ci siano le porte per entrambe le squadre
        const redGoal = this.mapElements.goals.find(goal => goal.team === 'red');
        const blueGoal = this.mapElements.goals.find(goal => goal.team === 'blue');
        
        if (!redGoal) {
            this.uiManager.showError('Manca la porta della squadra rossa');
            return false;
        }
        
        if (!blueGoal) {
            this.uiManager.showError('Manca la porta della squadra blu');
            return false;
        }
        
        // Verifica che ci siano i punti di spawn per entrambe le squadre
        if (this.mapElements.spawnPoints.red.length === 0) {
            this.uiManager.showError('Mancano i punti di spawn della squadra rossa');
            return false;
        }
        
        if (this.mapElements.spawnPoints.blue.length === 0) {
            this.uiManager.showError('Mancano i punti di spawn della squadra blu');
            return false;
        }
        
        return true;
    }
    
    // Converte la mappa nel formato utilizzato dal gioco
    convertMapToGameFormat() {
        return {
            id: this.currentMap.id,
            name: this.currentMap.name,
            width: this.currentMap.width,
            height: this.currentMap.height,
            author: this.currentMap.author,
            elements: {
                walls: this.mapElements.walls.map(wall => ({
                    x: wall.x,
                    y: wall.y,
                    width: wall.width,
                    height: wall.height
                })),
                goals: {
                    red: this.mapElements.goals.find(goal => goal.team === 'red') ? {
                        x: this.mapElements.goals.find(goal => goal.team === 'red').x,
                        y: this.mapElements.goals.find(goal => goal.team === 'red').y + this.mapElements.goals.find(goal => goal.team === 'red').height / 2,
                        width: this.mapElements.goals.find(goal => goal.team === 'red').width,
                        height: this.mapElements.goals.find(goal => goal.team === 'red').height
                    } : null,
                    blue: this.mapElements.goals.find(goal => goal.team === 'blue') ? {
                        x: this.mapElements.goals.find(goal => goal.team === 'blue').x,
                        y: this.mapElements.goals.find(goal => goal.team === 'blue').y + this.mapElements.goals.find(goal => goal.team === 'blue').height / 2,
                        width: this.mapElements.goals.find(goal => goal.team === 'blue').width,
                        height: this.mapElements.goals.find(goal => goal.team === 'blue').height
                    } : null
                },
                spawnPoints: {
                    red: this.mapElements.spawnPoints.red.map(spawn => ({
                        x: spawn.x,
                        y: spawn.y
                    })),
                    blue: this.mapElements.spawnPoints.blue.map(spawn => ({
                        x: spawn.x,
                        y: spawn.y
                    }))
                },
                decorations: this.mapElements.decorations.map(decoration => ({
                    x: decoration.x,
                    y: decoration.y,
                    width: decoration.width,
                    height: decoration.height,
                    color: decoration.color
                }))
            }
        };
    }
    
    // Aggiunge un nuovo elemento alla mappa
    addElement(type) {
        const x = this.canvas.width / 2;
        const y = this.canvas.height / 2;
        
        switch (type) {
            case 'wall':
                this.mapElements.walls.push({
                    type: 'wall',
                    x: x - 50,
                    y: y - 10,
                    width: 100,
                    height: 20
                });
                break;
            case 'goal':
                // Determina quale porta aggiungere (rossa o blu)
                const hasRedGoal = this.mapElements.goals.some(goal => goal.team === 'red');
                const hasBlueGoal = this.mapElements.goals.some(goal => goal.team === 'blue');
                
                if (!hasRedGoal) {
                    this.mapElements.goals.push({
                        type: 'goal',
                        team: 'red',
                        x: 0,
                        y: y - 70,
                        width: 8,
                        height: 140
                    });
                } else if (!hasBlueGoal) {
                    this.mapElements.goals.push({
                        type: 'goal',
                        team: 'blue',
                        x: this.canvas.width - 8,
                        y: y - 70,
                        width: 8,
                        height: 140
                    });
                } else {
                    this.uiManager.showError('Entrambe le porte sono già presenti');
                }
                break;
            case 'redSpawn':
                this.mapElements.spawnPoints.red.push({
                    type: 'spawnPoint',
                    team: 'red',
                    x: x - 100,
                    y: y
                });
                break;
            case 'blueSpawn':
                this.mapElements.spawnPoints.blue.push({
                    type: 'spawnPoint',
                    team: 'blue',
                    x: x + 100,
                    y: y
                });
                break;
            case 'decoration':
                this.mapElements.decorations.push({
                    type: 'decoration',
                    x: x - 25,
                    y: y - 25,
                    width: 50,
                    height: 50,
                    color: '#cccccc'
                });
                break;
        }
        
        // Renderizza la mappa aggiornata
        this.render();
    }
    
    // Elimina l'elemento selezionato
    deleteSelectedElement() {
        if (!this.selectedElement) {
            this.uiManager.showError('Nessun elemento selezionato');
            return;
        }
        
        switch (this.selectedElement.type) {
            case 'wall':
                this.mapElements.walls = this.mapElements.walls.filter(wall => wall !== this.selectedElement);
                break;
            case 'goal':
                this.mapElements.goals = this.mapElements.goals.filter(goal => goal !== this.selectedElement);
                break;
            case 'spawnPoint':
                if (this.selectedElement.team === 'red') {
                    this.mapElements.spawnPoints.red = this.mapElements.spawnPoints.red.filter(spawn => spawn !== this.selectedElement);
                } else {
                    this.mapElements.spawnPoints.blue = this.mapElements.spawnPoints.blue.filter(spawn => spawn !== this.selectedElement);
                }
                break;
            case 'decoration':
                this.mapElements.decorations = this.mapElements.decorations.filter(decoration => decoration !== this.selectedElement);
                break;
        }
        
        // Deseleziona l'elemento
        this.selectedElement = null;
        
        // Renderizza la mappa aggiornata
        this.render();
    }
    
    // Gestisce l'evento mousedown sul canvas
    handleMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / this.scale;
        const y = (e.clientY - rect.top) / this.scale;
        
        // Cerca l'elemento sotto il cursore
        this.selectedElement = this.findElementAt(x, y);
        
        if (this.selectedElement) {
            this.isDragging = true;
            this.dragStartX = x;
            this.dragStartY = y;
        }
        
        // Renderizza la mappa aggiornata
        this.render();
    }
    
    // Gestisce l'evento mousemove sul canvas
    handleMouseMove(e) {
        if (!this.isDragging || !this.selectedElement) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / this.scale;
        const y = (e.clientY - rect.top) / this.scale;
        
        // Calcola lo spostamento
        const dx = x - this.dragStartX;
        const dy = y - this.dragStartY;
        
        // Aggiorna la posizione dell'elemento selezionato
        this.selectedElement.x += dx;
        this.selectedElement.y += dy;
        
        // Aggiorna il punto di partenza del drag
        this.dragStartX = x;
        this.dragStartY = y;
        
        // Renderizza la mappa aggiornata
        this.render();
    }
    
    // Gestisce l'evento mouseup sul canvas
    handleMouseUp() {
        this.isDragging = false;
    }
    
    // Gestisce l'evento wheel sul canvas (zoom)
    handleWheel(e) {
        e.preventDefault();
        
        // Calcola il nuovo fattore di scala
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        this.scale *= delta;
        
        // Limita il fattore di scala
        this.scale = Math.max(0.5, Math.min(2, this.scale));
        
        // Renderizza la mappa aggiornata
        this.render();
    }
    
    // Trova l'elemento alla posizione specificata
    findElementAt(x, y) {
        // Controlla le decorazioni
        for (const decoration of this.mapElements.decorations) {
            if (this.isPointInRect(x, y, decoration)) {
                return decoration;
            }
        }
        
        // Controlla le pareti
        for (const wall of this.mapElements.walls) {
            if (this.isPointInRect(x, y, wall)) {
                return wall;
            }
        }
        
        // Controlla le porte
        for (const goal of this.mapElements.goals) {
            if (this.isPointInRect(x, y, goal)) {
                return goal;
            }
        }
        
        // Controlla i punti di spawn rossi
        for (const spawn of this.mapElements.spawnPoints.red) {
            if (this.isPointInCircle(x, y, spawn, 10)) {
                return spawn;
            }
        }
        
        // Controlla i punti di spawn blu
        for (const spawn of this.mapElements.spawnPoints.blue) {
            if (this.isPointInCircle(x, y, spawn, 10)) {
                return spawn;
            }
        }
        
        return null;
    }
    
    // Verifica se un punto è all'interno di un rettangolo
    isPointInRect(x, y, rect) {
        return x >= rect.x && x <= rect.x + rect.width &&
               y >= rect.y && y <= rect.y + rect.height;
    }
    
    // Verifica se un punto è all'interno di un cerchio
    isPointInCircle(x, y, circle, radius) {
        const dx = x - circle.x;
        const dy = y - circle.y;
        return dx * dx + dy * dy <= radius * radius;
    }
    
    // Renderizza la mappa
    render() {
        if (!this.ctx) return;
        
        // Pulisci il canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Applica lo zoom
        this.ctx.save();
        this.ctx.scale(this.scale, this.scale);
        
        // Disegna lo sfondo
        this.ctx.fillStyle = '#1a2125';
        this.ctx.fillRect(0, 0, this.canvas.width / this.scale, this.canvas.height / this.scale);
        
        // Disegna la griglia
        this.drawGrid();
        
        // Disegna le decorazioni
        this.mapElements.decorations.forEach(decoration => {
            this.ctx.fillStyle = decoration.color;
            this.ctx.fillRect(decoration.x, decoration.y, decoration.width, decoration.height);
            
            // Evidenzia se selezionato
            if (decoration === this.selectedElement) {
                this.ctx.strokeStyle = '#ffffff';
                this.ctx.lineWidth = 2;
                this.ctx.strokeRect(decoration.x, decoration.y, decoration.width, decoration.height);
            }
        });
        
        // Disegna le pareti
        this.mapElements.walls.forEach(wall => {
            this.ctx.fillStyle = '#ffffff';
            this.ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
            
            // Evidenzia se selezionato
            if (wall === this.selectedElement) {
                this.ctx.strokeStyle = '#00ff00';
                this.ctx.lineWidth = 2;
                this.ctx.strokeRect(wall.x, wall.y, wall.width, wall.height);
            }
        });
        
        // Disegna le porte
        this.mapElements.goals.forEach(goal => {
            this.ctx.fillStyle = goal.team === 'red' ? '#e56e56' : '#5689e5';
            this.ctx.fillRect(goal.x, goal.y, goal.width, goal.height);
            
            // Evidenzia se selezionato
            if (goal === this.selectedElement) {
                this.ctx.strokeStyle = '#ffff00';
                this.ctx.lineWidth = 2;
                this.ctx.strokeRect(goal.x, goal.y, goal.width, goal.height);
            }
        });
        
        // Disegna i punti di spawn rossi
        this.mapElements.spawnPoints.red.forEach(spawn => {
            this.ctx.fillStyle = '#e56e56';
            this.ctx.beginPath();
            this.ctx.arc(spawn.x, spawn.y, 10, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Evidenzia se selezionato
            if (spawn === this.selectedElement) {
                this.ctx.strokeStyle = '#ffff00';
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.arc(spawn.x, spawn.y, 12, 0, Math.PI * 2);
                this.ctx.stroke();
            }
        });
        
        // Disegna i punti di spawn blu
        this.mapElements.spawnPoints.blue.forEach(spawn => {
            this.ctx.fillStyle = '#5689e5';
            this.ctx.beginPath();
            this.ctx.arc(spawn.x, spawn.y, 10, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Evidenzia se selezionato
            if (spawn === this.selectedElement) {
                this.ctx.strokeStyle = '#ffff00';
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.arc(spawn.x, spawn.y, 12, 0, Math.PI * 2);
                this.ctx.stroke();
            }
        });
        
        // Ripristina il contesto
        this.ctx.restore();
    }
    
    // Disegna la griglia
    drawGrid() {
        const gridSize = 50;
        const width = this.canvas.width / this.scale;
        const height = this.canvas.height / this.scale;
        
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.lineWidth = 1;
        
        // Linee verticali
        for (let x = 0; x <= width; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, height);
            this.ctx.stroke();
        }
        
        // Linee orizzontali
        for (let y = 0; y <= height; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(width, y);
            this.ctx.stroke();
        }
    }
}
