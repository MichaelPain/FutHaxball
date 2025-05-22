/**
 * GeoLocation.js - Modello per la geolocalizzazione
 * 
 * Questo modello definisce la struttura dei dati per la geolocalizzazione
 * utilizzata nei campionati nazionali, continentali e internazionali.
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Definizione dei tipi di regione geografica
const REGION_TYPES = {
  COUNTRY: 'country',
  CONTINENT: 'continent',
  INTERNATIONAL: 'international'
};

// Definizione dei continenti
const CONTINENTS = {
  AFRICA: 'africa',
  ASIA: 'asia',
  EUROPE: 'europe',
  NORTH_AMERICA: 'north_america',
  SOUTH_AMERICA: 'south_america',
  OCEANIA: 'oceania',
  ANTARCTICA: 'antarctica'
};

// Schema per la geolocalizzazione degli utenti
const UserGeoLocationSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  country: {
    type: String
  },
  countryCode: {
    type: String
  },
  continent: {
    type: String,
    enum: Object.values(CONTINENTS)
  },
  region: {
    type: String
  },
  city: {
    type: String
  },
  ipAddress: {
    type: String
  },
  lastDetectedAt: {
    type: Date,
    default: Date.now
  },
  manuallySet: {
    type: Boolean,
    default: false
  },
  verificationStatus: {
    type: String,
    enum: ['pending', 'verified', 'rejected'],
    default: 'pending'
  },
  verifiedAt: {
    type: Date
  },
  verifiedBy: {
    type: Schema.Types.ObjectId,
    ref: 'Admin'
  }
}, {
  timestamps: true
});

// Schema per i campionati geografici
const GeoChampionshipSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: Object.values(REGION_TYPES),
    required: true
  },
  countries: [{
    type: String
  }],
  continent: {
    type: String,
    enum: Object.values(CONTINENTS)
  },
  season: {
    type: String
  },
  year: {
    type: Number
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date
  },
  tournamentId: {
    type: Schema.Types.ObjectId,
    ref: 'Tournament',
    required: true
  },
  qualificationTournaments: [{
    tournamentId: {
      type: Schema.Types.ObjectId,
      ref: 'Tournament'
    },
    name: String,
    type: String,
    qualificationSpots: Number
  }],
  nextStageChampionship: {
    type: Schema.Types.ObjectId,
    ref: 'GeoChampionship'
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Indici per migliorare le performance delle query
UserGeoLocationSchema.index({ userId: 1 }, { unique: true });
UserGeoLocationSchema.index({ countryCode: 1 });
UserGeoLocationSchema.index({ continent: 1 });
UserGeoLocationSchema.index({ verificationStatus: 1 });

GeoChampionshipSchema.index({ type: 1 });
GeoChampionshipSchema.index({ 'countries': 1 });
GeoChampionshipSchema.index({ continent: 1 });
GeoChampionshipSchema.index({ tournamentId: 1 }, { unique: true });
GeoChampionshipSchema.index({ startDate: 1 });

// Metodi statici per UserGeoLocation
UserGeoLocationSchema.statics = {
  /**
   * Trova la geolocalizzazione di un utente
   * @param {String} userId - ID dell'utente
   * @returns {Promise<UserGeoLocation>} Promessa che restituisce la geolocalizzazione
   */
  async findByUserId(userId) {
    return this.findOne({ userId });
  },
  
  /**
   * Trova utenti per paese
   * @param {String} countryCode - Codice del paese
   * @returns {Promise<Array>} Promessa che restituisce gli utenti
   */
  async findByCountry(countryCode) {
    return this.find({ countryCode })
      .populate('userId', 'nickname avatar');
  },
  
  /**
   * Trova utenti per continente
   * @param {String} continent - Continente
   * @returns {Promise<Array>} Promessa che restituisce gli utenti
   */
  async findByContinent(continent) {
    return this.find({ continent })
      .populate('userId', 'nickname avatar');
  }
};

// Metodi statici per GeoChampionship
GeoChampionshipSchema.statics = {
  REGION_TYPES,
  CONTINENTS,
  
  /**
   * Trova campionati nazionali
   * @param {String} countryCode - Codice del paese (opzionale)
   * @returns {Promise<Array>} Promessa che restituisce i campionati
   */
  async findNationalChampionships(countryCode = null) {
    const query = { type: REGION_TYPES.COUNTRY };
    
    if (countryCode) {
      query.countries = countryCode;
    }
    
    return this.find(query)
      .populate('tournamentId')
      .sort({ startDate: -1 });
  },
  
  /**
   * Trova campionati continentali
   * @param {String} continent - Continente (opzionale)
   * @returns {Promise<Array>} Promessa che restituisce i campionati
   */
  async findContinentalChampionships(continent = null) {
    const query = { type: REGION_TYPES.CONTINENT };
    
    if (continent) {
      query.continent = continent;
    }
    
    return this.find(query)
      .populate('tournamentId')
      .sort({ startDate: -1 });
  },
  
  /**
   * Trova campionati internazionali
   * @returns {Promise<Array>} Promessa che restituisce i campionati
   */
  async findInternationalChampionships() {
    return this.find({ type: REGION_TYPES.INTERNATIONAL })
      .populate('tournamentId')
      .sort({ startDate: -1 });
  },
  
  /**
   * Trova campionati per torneo
   * @param {String} tournamentId - ID del torneo
   * @returns {Promise<GeoChampionship>} Promessa che restituisce il campionato
   */
  async findByTournamentId(tournamentId) {
    return this.findOne({ tournamentId })
      .populate('qualificationTournaments.tournamentId')
      .populate('nextStageChampionship');
  }
};

// Metodi di istanza per UserGeoLocation
UserGeoLocationSchema.methods = {
  /**
   * Aggiorna la geolocalizzazione dell'utente
   * @param {Object} geoData - Dati di geolocalizzazione
   * @returns {Promise<UserGeoLocation>} Promessa che restituisce la geolocalizzazione aggiornata
   */
  async updateLocation(geoData) {
    Object.assign(this, geoData);
    this.lastDetectedAt = new Date();
    
    return this.save();
  },
  
  /**
   * Verifica la geolocalizzazione dell'utente
   * @param {String} adminId - ID dell'amministratore che verifica
   * @returns {Promise<UserGeoLocation>} Promessa che restituisce la geolocalizzazione verificata
   */
  async verify(adminId) {
    this.verificationStatus = 'verified';
    this.verifiedAt = new Date();
    this.verifiedBy = adminId;
    
    return this.save();
  }
};

// Metodi di istanza per GeoChampionship
GeoChampionshipSchema.methods = {
  /**
   * Aggiunge un torneo di qualificazione
   * @param {Object} qualificationData - Dati del torneo di qualificazione
   * @returns {Promise<GeoChampionship>} Promessa che restituisce il campionato aggiornato
   */
  async addQualificationTournament(qualificationData) {
    this.qualificationTournaments.push(qualificationData);
    
    return this.save();
  },
  
  /**
   * Imposta il campionato di fase successiva
   * @param {String} nextChampionshipId - ID del campionato di fase successiva
   * @returns {Promise<GeoChampionship>} Promessa che restituisce il campionato aggiornato
   */
  async setNextStageChampionship(nextChampionshipId) {
    this.nextStageChampionship = nextChampionshipId;
    
    return this.save();
  }
};

const UserGeoLocation = mongoose.model('UserGeoLocation', UserGeoLocationSchema);
const GeoChampionship = mongoose.model('GeoChampionship', GeoChampionshipSchema);

module.exports = {
  UserGeoLocation,
  GeoChampionship,
  REGION_TYPES,
  CONTINENTS
};
