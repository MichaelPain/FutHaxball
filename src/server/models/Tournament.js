/**
 * Tournament.js - Modello per i tornei
 * 
 * Questo modello definisce la struttura dei dati per i tornei,
 * inclusi formati, partecipanti, bracket e regole.
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Definizione dei formati di torneo disponibili
const TOURNAMENT_FORMATS = {
  SINGLE_ELIMINATION: 'single_elimination',
  DOUBLE_ELIMINATION: 'double_elimination',
  ROUND_ROBIN: 'round_robin',
  SWISS: 'swiss',
  MULTI_STAGE: 'multi_stage'
};

// Definizione delle modalità di gioco
const GAME_MODES = {
  ONE_VS_ONE: '1v1',
  TWO_VS_TWO: '2v2',
  THREE_VS_THREE: '3v3',
  CUSTOM: 'custom'
};

// Definizione dei tipi di torneo
const TOURNAMENT_TYPES = {
  CASUAL: 'casual',
  RANKED: 'ranked',
  CHAMPIONSHIP: 'championship',
  EVENT: 'event'
};

// Definizione degli stati del torneo
const TOURNAMENT_STATUS = {
  DRAFT: 'draft',
  REGISTRATION: 'registration',
  UPCOMING: 'upcoming',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

// Schema per i partecipanti
const ParticipantSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  teamId: {
    type: Schema.Types.ObjectId,
    ref: 'Team'
  },
  seed: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['registered', 'checked_in', 'active', 'eliminated', 'winner', 'disqualified'],
    default: 'registered'
  },
  registeredAt: {
    type: Date,
    default: Date.now
  },
  checkedInAt: {
    type: Date
  },
  stats: {
    wins: {
      type: Number,
      default: 0
    },
    losses: {
      type: Number,
      default: 0
    },
    draws: {
      type: Number,
      default: 0
    },
    goalsScored: {
      type: Number,
      default: 0
    },
    goalsConceded: {
      type: Number,
      default: 0
    }
  }
});

// Schema per le squadre
const TeamSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  logo: {
    type: String
  },
  members: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  captain: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  seed: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['active', 'eliminated', 'winner', 'disqualified'],
    default: 'active'
  }
});

// Schema per le partite
const MatchSchema = new Schema({
  round: {
    type: Number,
    required: true
  },
  matchNumber: {
    type: Number,
    required: true
  },
  stage: {
    type: String,
    default: 'main'
  },
  participants: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  teams: [{
    type: Schema.Types.ObjectId,
    ref: 'Team'
  }],
  scores: [{
    type: Number,
    default: 0
  }],
  winner: {
    type: Schema.Types.ObjectId
  },
  status: {
    type: String,
    enum: ['pending', 'scheduled', 'in_progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  scheduledTime: {
    type: Date
  },
  startTime: {
    type: Date
  },
  endTime: {
    type: Date
  },
  roomId: {
    type: String
  },
  nextMatchId: {
    type: Schema.Types.ObjectId,
    ref: 'Match'
  },
  previousMatches: [{
    type: Schema.Types.ObjectId,
    ref: 'Match'
  }]
});

// Schema per le fasi del torneo (per tornei multi-stage)
const StageSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  format: {
    type: String,
    enum: Object.values(TOURNAMENT_FORMATS),
    required: true
  },
  order: {
    type: Number,
    required: true
  },
  startDate: {
    type: Date
  },
  endDate: {
    type: Date
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'completed'],
    default: 'pending'
  },
  qualificationCount: {
    type: Number,
    default: 0
  },
  matches: [MatchSchema]
});

// Schema per i premi
const PrizeSchema = new Schema({
  rank: {
    type: Number,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  value: {
    type: Number
  },
  currency: {
    type: String
  },
  itemType: {
    type: String
  },
  itemId: {
    type: String
  }
});

// Schema per le regole personalizzate
const CustomRulesSchema = new Schema({
  timeLimit: {
    type: Number
  },
  scoreLimit: {
    type: Number
  },
  teamSize: {
    type: Number
  },
  ballSpeed: {
    type: Number
  },
  playerSpeed: {
    type: Number
  },
  kickPower: {
    type: Number
  },
  mapId: {
    type: String
  },
  customMap: {
    type: Schema.Types.Mixed
  },
  otherRules: {
    type: Schema.Types.Mixed
  }
});

// Schema per la geolocalizzazione
const GeoLocationSchema = new Schema({
  type: {
    type: String,
    enum: ['country', 'continent', 'international'],
    required: true
  },
  countries: [{
    type: String
  }],
  continent: {
    type: String
  },
  restrictions: {
    type: Schema.Types.Mixed
  }
});

// Schema principale per i tornei
const TournamentSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  slug: {
    type: String,
    required: true,
    unique: true
  },
  description: {
    type: String
  },
  format: {
    type: String,
    enum: Object.values(TOURNAMENT_FORMATS),
    required: true
  },
  mode: {
    type: String,
    enum: Object.values(GAME_MODES),
    required: true
  },
  type: {
    type: String,
    enum: Object.values(TOURNAMENT_TYPES),
    required: true
  },
  status: {
    type: String,
    enum: Object.values(TOURNAMENT_STATUS),
    default: TOURNAMENT_STATUS.DRAFT
  },
  visibility: {
    type: String,
    enum: ['public', 'private', 'unlisted'],
    default: 'public'
  },
  registrationOpen: {
    type: Date
  },
  registrationClose: {
    type: Date
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date
  },
  checkInRequired: {
    type: Boolean,
    default: false
  },
  checkInStart: {
    type: Date
  },
  checkInEnd: {
    type: Date
  },
  maxParticipants: {
    type: Number
  },
  minParticipants: {
    type: Number,
    default: 2
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  participants: [ParticipantSchema],
  teams: [TeamSchema],
  stages: [StageSchema],
  matches: [MatchSchema],
  rules: CustomRulesSchema,
  prizes: [PrizeSchema],
  mmrImpact: {
    enabled: {
      type: Boolean,
      default: false
    },
    factor: {
      type: Number,
      default: 1.0
    }
  },
  geoLocation: GeoLocationSchema,
  inviteCode: {
    type: String
  },
  password: {
    type: String
  },
  streamUrl: {
    type: String
  },
  discordUrl: {
    type: String
  },
  tags: [{
    type: String
  }],
  banner: {
    type: String
  },
  logo: {
    type: String
  }
}, {
  timestamps: true
});

// Indici per migliorare le performance delle query
TournamentSchema.index({ slug: 1 }, { unique: true });
TournamentSchema.index({ status: 1 });
TournamentSchema.index({ type: 1 });
TournamentSchema.index({ startDate: 1 });
TournamentSchema.index({ 'geoLocation.type': 1 });
TournamentSchema.index({ 'geoLocation.countries': 1 });
TournamentSchema.index({ createdBy: 1 });

// Metodi statici
TournamentSchema.statics = {
  TOURNAMENT_FORMATS,
  GAME_MODES,
  TOURNAMENT_TYPES,
  TOURNAMENT_STATUS,
  
  /**
   * Trova un torneo per slug
   * @param {String} slug - Slug del torneo
   * @returns {Promise<Tournament>} Promessa che restituisce il torneo
   */
  async findBySlug(slug) {
    return this.findOne({ slug });
  },
  
  /**
   * Ottiene i tornei attivi
   * @param {Object} options - Opzioni di query (limit, skip, sort)
   * @returns {Promise<Array>} Promessa che restituisce i tornei
   */
  async getActiveTournaments(options = {}) {
    const query = this.find({ 
      status: { $in: [TOURNAMENT_STATUS.REGISTRATION, TOURNAMENT_STATUS.UPCOMING, TOURNAMENT_STATUS.ACTIVE] },
      visibility: 'public'
    });
    
    if (options.limit) {
      query.limit(options.limit);
    }
    
    if (options.skip) {
      query.skip(options.skip);
    }
    
    if (options.sort) {
      query.sort(options.sort);
    } else {
      query.sort({ startDate: 1 });
    }
    
    return query.exec();
  },
  
  /**
   * Ottiene i tornei per tipo
   * @param {String} type - Tipo di torneo
   * @param {Object} options - Opzioni di query (limit, skip, sort)
   * @returns {Promise<Array>} Promessa che restituisce i tornei
   */
  async getTournamentsByType(type, options = {}) {
    const query = this.find({ 
      type,
      visibility: 'public'
    });
    
    if (options.limit) {
      query.limit(options.limit);
    }
    
    if (options.skip) {
      query.skip(options.skip);
    }
    
    if (options.sort) {
      query.sort(options.sort);
    } else {
      query.sort({ startDate: -1 });
    }
    
    return query.exec();
  },
  
  /**
   * Ottiene i tornei per geolocalizzazione
   * @param {String} country - Codice paese
   * @param {Object} options - Opzioni di query (limit, skip, sort)
   * @returns {Promise<Array>} Promessa che restituisce i tornei
   */
  async getTournamentsByCountry(country, options = {}) {
    const query = this.find({ 
      $or: [
        { 'geoLocation.type': 'country', 'geoLocation.countries': country },
        { 'geoLocation.type': 'continent' },
        { 'geoLocation.type': 'international' }
      ],
      visibility: 'public'
    });
    
    if (options.limit) {
      query.limit(options.limit);
    }
    
    if (options.skip) {
      query.skip(options.skip);
    }
    
    if (options.sort) {
      query.sort(options.sort);
    } else {
      query.sort({ startDate: -1 });
    }
    
    return query.exec();
  },
  
  /**
   * Ottiene i tornei creati da un utente
   * @param {String} userId - ID dell'utente
   * @param {Object} options - Opzioni di query (limit, skip, sort)
   * @returns {Promise<Array>} Promessa che restituisce i tornei
   */
  async getTournamentsByCreator(userId, options = {}) {
    const query = this.find({ createdBy: userId });
    
    if (options.limit) {
      query.limit(options.limit);
    }
    
    if (options.skip) {
      query.skip(options.skip);
    }
    
    if (options.sort) {
      query.sort(options.sort);
    } else {
      query.sort({ createdAt: -1 });
    }
    
    return query.exec();
  },
  
  /**
   * Ottiene i tornei a cui partecipa un utente
   * @param {String} userId - ID dell'utente
   * @param {Object} options - Opzioni di query (limit, skip, sort)
   * @returns {Promise<Array>} Promessa che restituisce i tornei
   */
  async getTournamentsByParticipant(userId, options = {}) {
    const query = this.find({ 'participants.userId': userId });
    
    if (options.limit) {
      query.limit(options.limit);
    }
    
    if (options.skip) {
      query.skip(options.skip);
    }
    
    if (options.sort) {
      query.sort(options.sort);
    } else {
      query.sort({ startDate: -1 });
    }
    
    return query.exec();
  }
};

// Metodi di istanza
TournamentSchema.methods = {
  /**
   * Verifica se un utente è registrato al torneo
   * @param {String} userId - ID dell'utente
   * @returns {Boolean} True se l'utente è registrato
   */
  isUserRegistered(userId) {
    return this.participants.some(p => p.userId.toString() === userId.toString());
  },
  
  /**
   * Registra un utente al torneo
   * @param {String} userId - ID dell'utente
   * @param {String} teamId - ID della squadra (opzionale)
   * @returns {Tournament} Il torneo aggiornato
   */
  registerUser(userId, teamId = null) {
    if (this.isUserRegistered(userId)) {
      throw new Error('L\'utente è già registrato al torneo');
    }
    
    if (this.status !== TOURNAMENT_STATUS.REGISTRATION) {
      throw new Error('Le registrazioni per questo torneo non sono aperte');
    }
    
    if (this.maxParticipants && this.participants.length >= this.maxParticipants) {
      throw new Error('Il torneo ha raggiunto il numero massimo di partecipanti');
    }
    
    this.participants.push({
      userId,
      teamId,
      registeredAt: new Date()
    });
    
    return this;
  },
  
  /**
   * Rimuove un utente dal torneo
   * @param {String} userId - ID dell'utente
   * @returns {Tournament} Il torneo aggiornato
   */
  unregisterUser(userId) {
    const index = this.participants.findIndex(p => p.userId.toString() === userId.toString());
    
    if (index === -1) {
      throw new Error('L\'utente non è registrato al torneo');
    }
    
    if (this.status !== TOURNAMENT_STATUS.REGISTRATION && this.status !== TOURNAMENT_STATUS.UPCOMING) {
      throw new Error('Non è più possibile annullare la registrazione a questo torneo');
    }
    
    this.participants.splice(index, 1);
    
    return this;
  },
  
  /**
   * Effettua il check-in di un utente
   * @param {String} userId - ID dell'utente
   * @returns {Tournament} Il torneo aggiornato
   */
  checkInUser(userId) {
    const participant = this.participants.find(p => p.userId.toString() === userId.toString());
    
    if (!participant) {
      throw new Error('L\'utente non è registrato al torneo');
    }
    
    if (!this.checkInRequired) {
      throw new Error('Il check-in non è richiesto per questo torneo');
    }
    
    const now = new Date();
    if (now < this.checkInStart || now > this.checkInEnd) {
      throw new Error('Il check-in non è attualmente aperto');
    }
    
    participant.status = 'checked_in';
    participant.checkedInAt = now;
    
    return this;
  },
  
  /**
   * Genera il bracket del torneo
   * @returns {Tournament} Il torneo aggiornato
   */
  generateBracket() {
    if (this.status !== TOURNAMENT_STATUS.UPCOMING) {
      throw new Error('Il torneo non è nello stato corretto per generare il bracket');
    }
    
    const checkedInParticipants = this.checkInRequired
      ? this.participants.filter(p => p.status === 'checked_in')
      : this.participants;
    
    if (checkedInParticipants.length < this.minParticipants) {
      throw new Error(`Il torneo richiede almeno ${this.minParticipants} partecipanti`);
    }
    
    // Implementazione specifica per ogni formato di torneo
    switch (this.format) {
      case TOURNAMENT_FORMATS.SINGLE_ELIMINATION:
        this._generateSingleEliminationBracket(checkedInParticipants);
        break;
      case TOURNAMENT_FORMATS.DOUBLE_ELIMINATION:
        this._generateDoubleEliminationBracket(checkedInParticipants);
        break;
      case TOURNAMENT_FORMATS.ROUND_ROBIN:
        this._generateRoundRobinBracket(checkedInParticipants);
        break;
      case TOURNAMENT_FORMATS.SWISS:
        this._generateSwissBracket(checkedInParticipants);
        break;
      case TOURNAMENT_FORMATS.MULTI_STAGE:
        this._generateMultiStageBracket(checkedInParticipants);
        break;
      default:
        throw new Error(`Formato di torneo non supportato: ${this.format}`);
    }
    
    this.status = TOURNAMENT_STATUS.ACTIVE;
    
    return this;
  },
  
  /**
   * Aggiorna il risultato di una partita
   * @param {String} matchId - ID della partita
   * @param {Array} scores - Punteggi della partita
   * @param {String} winnerId - ID del vincitore
   * @returns {Tournament} Il torneo aggiornato
   */
  updateMatchResult(matchId, scores, winnerId) {
    const match = this.matches.id(matchId);
    
    if (!match) {
      throw new Error('Partita non trovata');
    }
    
    if (match.status !== 'in_progress') {
      throw new Error('La partita non è in corso');
    }
    
    match.scores = scores;
    match.winner = winnerId;
    match.status = 'completed';
    match.endTime = new Date();
    
    // Aggiorna le statistiche dei partecipanti
    match.participants.forEach((participantId, index) => {
      const participant = this.participants.find(p => p.userId.toString() === participantId.toString());
      
      if (participant) {
        if (participantId.toString() === winnerId.toString()) {
          participant.stats.wins += 1;
        } else {
          participant.stats.losses += 1;
        }
        
        participant.stats.goalsScored += scores[index];
        participant.stats.goalsConceded += scores[1 - index]; // Assume 1v1
      }
    });
    
    // Aggiorna il bracket
    this._advanceWinner(match);
    
    // Verifica se il torneo è completato
    this._checkTournamentCompletion();
    
    return this;
  },
  
  /**
   * Genera un link di invito al torneo
   * @returns {String} Codice di invito
   */
  generateInviteCode() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let code = '';
    
    for (let i = 0; i < 8; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    
    this.inviteCode = code;
    return code;
  },
  
  // Metodi privati per la generazione dei bracket
  _generateSingleEliminationBracket(participants) {
    // Implementazione del bracket a eliminazione singola
    // ...
  },
  
  _generateDoubleEliminationBracket(participants) {
    // Implementazione del bracket a doppia eliminazione
    // ...
  },
  
  _generateRoundRobinBracket(participants) {
    // Implementazione del bracket round robin
    // ...
  },
  
  _generateSwissBracket(participants) {
    // Implementazione del bracket svizzero
    // ...
  },
  
  _generateMultiStageBracket(participants) {
    // Implementazione del bracket multi-stage
    // ...
  },
  
  _advanceWinner(match) {
    // Avanza il vincitore alla prossima partita
    // ...
  },
  
  _checkTournamentCompletion() {
    // Verifica se tutte le partite sono completate
    const allMatchesCompleted = this.matches.every(m => 
      m.status === 'completed' || m.status === 'cancelled'
    );
    
    if (allMatchesCompleted) {
      this.status = TOURNAMENT_STATUS.COMPLETED;
      this.endDate = new Date();
    }
    
    return allMatchesCompleted;
  }
};

// Middleware pre-save
TournamentSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Genera uno slug se non esiste
  if (!this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^\w ]+/g, '')
      .replace(/ +/g, '-');
  }
  
  next();
});

// Esportazione del modello
const Tournament = mongoose.model('Tournament', TournamentSchema);
module.exports = Tournament;
