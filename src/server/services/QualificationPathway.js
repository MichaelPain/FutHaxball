/**
 * QualificationPathway.js - Sistema per gestire i percorsi di qualificazione tra campionati
 * 
 * Questo componente gestisce i percorsi di qualificazione tra campionati nazionali,
 * continentali e internazionali, definendo le regole di promozione e retrocessione.
 */

const RegionManager = require('./RegionManager');

class QualificationPathway {
  /**
   * Costruttore
   * @param {Object} config - Configurazione del sistema
   */
  constructor(config = {}) {
    this.regionManager = config.regionManager || new RegionManager(config);
    this.tournamentManager = config.tournamentManager;
    
    // Configurazione dei percorsi di qualificazione
    this.pathwayConfig = config.pathwayConfig || {
      // Numero di qualificati dai campionati nazionali ai continentali
      nationalToContinent: 2,
      
      // Numero di qualificati dai campionati continentali agli internazionali
      continentToInternational: 3,
      
      // Percentuale di qualificati dai campionati regionali ai nazionali
      regionalToNational: 0.2, // 20%
      
      // Numero minimo di partecipanti per un campionato valido
      minParticipants: {
        regional: 4,
        national: 6,
        continental: 8,
        international: 12
      },
      
      // Numero massimo di partecipanti per campionato
      maxParticipants: {
        regional: 16,
        national: 24,
        continental: 32,
        international: 48
      }
    };
  }
  
  /**
   * Ottiene il percorso di qualificazione per un campionato nazionale
   * @param {String} countryCode - Codice ISO del paese
   * @returns {Object} Percorso di qualificazione
   */
  getNationalQualificationPathway(countryCode) {
    const country = this.regionManager.getCountry(countryCode);
    if (!country) {
      throw new Error(`Paese non valido: ${countryCode}`);
    }
    
    const continent = this.regionManager.getCountryContinent(countryCode);
    
    return {
      country,
      continent,
      qualifiesTo: {
        type: 'continental',
        code: continent.code,
        name: continent.name,
        slots: this.pathwayConfig.nationalToContinent
      },
      qualifiesFrom: {
        type: 'regional',
        regions: this._getRegionsForCountry(countryCode),
        slots: this._calculateRegionalSlots(countryCode)
      }
    };
  }
  
  /**
   * Ottiene il percorso di qualificazione per un campionato continentale
   * @param {String} continentCode - Codice del continente
   * @returns {Object} Percorso di qualificazione
   */
  getContinentalQualificationPathway(continentCode) {
    const continent = this.regionManager.getContinent(continentCode);
    if (!continent) {
      throw new Error(`Continente non valido: ${continentCode}`);
    }
    
    return {
      continent,
      qualifiesTo: {
        type: 'international',
        code: 'WORLD',
        name: 'World Championship',
        slots: this.pathwayConfig.continentToInternational
      },
      qualifiesFrom: {
        type: 'national',
        countries: this.regionManager.getCountriesInContinent(continentCode),
        slots: this._calculateNationalSlots(continentCode)
      }
    };
  }
  
  /**
   * Ottiene il percorso di qualificazione per un campionato internazionale
   * @returns {Object} Percorso di qualificazione
   */
  getInternationalQualificationPathway() {
    const continents = this.regionManager.getContinentsForInternationalChampionship();
    
    return {
      qualifiesFrom: {
        type: 'continental',
        continents,
        slots: this._calculateContinentalSlots()
      }
    };
  }
  
  /**
   * Ottiene i qualificati da un campionato nazionale a uno continentale
   * @param {String} tournamentId - ID del campionato nazionale
   * @returns {Promise<Array>} Lista dei qualificati
   */
  async getNationalQualifiers(tournamentId) {
    if (!this.tournamentManager) {
      throw new Error('TournamentManager non disponibile');
    }
    
    try {
      const tournament = await this.tournamentManager.getTournamentDetails(tournamentId);
      
      if (!tournament || tournament.type !== 'national' || tournament.status !== 'completed') {
        throw new Error('Campionato nazionale non valido o non completato');
      }
      
      const countryCode = tournament.geoRestriction.country;
      const pathway = this.getNationalQualificationPathway(countryCode);
      const slots = pathway.qualifiesTo.slots;
      
      // Ottieni i primi N classificati
      const standings = await this.tournamentManager.getTournamentStandings(tournamentId);
      return standings.slice(0, slots);
    } catch (error) {
      console.error('Errore durante il recupero dei qualificati nazionali:', error);
      return [];
    }
  }
  
  /**
   * Ottiene i qualificati da un campionato continentale a uno internazionale
   * @param {String} tournamentId - ID del campionato continentale
   * @returns {Promise<Array>} Lista dei qualificati
   */
  async getContinentalQualifiers(tournamentId) {
    if (!this.tournamentManager) {
      throw new Error('TournamentManager non disponibile');
    }
    
    try {
      const tournament = await this.tournamentManager.getTournamentDetails(tournamentId);
      
      if (!tournament || tournament.type !== 'continental' || tournament.status !== 'completed') {
        throw new Error('Campionato continentale non valido o non completato');
      }
      
      const continentCode = tournament.geoRestriction.continent;
      const pathway = this.getContinentalQualificationPathway(continentCode);
      const slots = pathway.qualifiesTo.slots;
      
      // Ottieni i primi N classificati
      const standings = await this.tournamentManager.getTournamentStandings(tournamentId);
      return standings.slice(0, slots);
    } catch (error) {
      console.error('Errore durante il recupero dei qualificati continentali:', error);
      return [];
    }
  }
  
  /**
   * Crea un campionato continentale con i qualificati dai campionati nazionali
   * @param {String} continentCode - Codice del continente
   * @param {Object} tournamentData - Dati del campionato
   * @returns {Promise<Object>} Campionato creato
   */
  async createContinentalChampionshipWithQualifiers(continentCode, tournamentData) {
    if (!this.tournamentManager) {
      throw new Error('TournamentManager non disponibile');
    }
    
    try {
      // Ottieni i campionati nazionali completati per questo continente
      const nationalTournaments = await this.tournamentManager.getTournaments({
        type: 'national',
        status: 'completed',
        geoRestriction: { continent: continentCode }
      });
      
      // Raccogli i qualificati da ogni campionato nazionale
      const qualifiers = [];
      for (const tournament of nationalTournaments) {
        const countryQualifiers = await this.getNationalQualifiers(tournament._id);
        qualifiers.push(...countryQualifiers);
      }
      
      // Crea il campionato continentale
      const continentalTournament = await this.tournamentManager.createTournament({
        ...tournamentData,
        type: 'continental',
        geoRestriction: { continent: continentCode },
        participants: qualifiers
      });
      
      return continentalTournament;
    } catch (error) {
      console.error('Errore durante la creazione del campionato continentale:', error);
      throw error;
    }
  }
  
  /**
   * Crea un campionato internazionale con i qualificati dai campionati continentali
   * @param {Object} tournamentData - Dati del campionato
   * @returns {Promise<Object>} Campionato creato
   */
  async createInternationalChampionshipWithQualifiers(tournamentData) {
    if (!this.tournamentManager) {
      throw new Error('TournamentManager non disponibile');
    }
    
    try {
      // Ottieni i campionati continentali completati
      const continentalTournaments = await this.tournamentManager.getTournaments({
        type: 'continental',
        status: 'completed'
      });
      
      // Raccogli i qualificati da ogni campionato continentale
      const qualifiers = [];
      for (const tournament of continentalTournaments) {
        const continentQualifiers = await this.getContinentalQualifiers(tournament._id);
        qualifiers.push(...continentQualifiers);
      }
      
      // Crea il campionato internazionale
      const internationalTournament = await this.tournamentManager.createTournament({
        ...tournamentData,
        type: 'international',
        geoRestriction: { international: true },
        participants: qualifiers
      });
      
      return internationalTournament;
    } catch (error) {
      console.error('Errore durante la creazione del campionato internazionale:', error);
      throw error;
    }
  }
  
  /**
   * Verifica se un giocatore è qualificato per un campionato
   * @param {String} userId - ID dell'utente
   * @param {String} tournamentId - ID del campionato
   * @returns {Promise<Boolean>} True se il giocatore è qualificato
   */
  async isPlayerQualified(userId, tournamentId) {
    if (!this.tournamentManager) {
      throw new Error('TournamentManager non disponibile');
    }
    
    try {
      const tournament = await this.tournamentManager.getTournamentDetails(tournamentId);
      
      if (!tournament) {
        throw new Error('Campionato non valido');
      }
      
      // Se è un campionato nazionale o regionale, non è necessaria la qualificazione
      if (tournament.type === 'national' || tournament.type === 'regional') {
        return true;
      }
      
      // Per campionati continentali, verifica la qualificazione dai campionati nazionali
      if (tournament.type === 'continental') {
        const nationalTournaments = await this.tournamentManager.getTournaments({
          type: 'national',
          status: 'completed',
          geoRestriction: { continent: tournament.geoRestriction.continent }
        });
        
        for (const nationalTournament of nationalTournaments) {
          const qualifiers = await this.getNationalQualifiers(nationalTournament._id);
          if (qualifiers.some(q => q.userId === userId)) {
            return true;
          }
        }
      }
      
      // Per campionati internazionali, verifica la qualificazione dai campionati continentali
      if (tournament.type === 'international') {
        const continentalTournaments = await this.tournamentManager.getTournaments({
          type: 'continental',
          status: 'completed'
        });
        
        for (const continentalTournament of continentalTournaments) {
          const qualifiers = await this.getContinentalQualifiers(continentalTournament._id);
          if (qualifiers.some(q => q.userId === userId)) {
            return true;
          }
        }
      }
      
      return false;
    } catch (error) {
      console.error('Errore durante la verifica della qualificazione:', error);
      return false;
    }
  }
  
  /**
   * Ottiene le regioni per un paese
   * @param {String} countryCode - Codice ISO del paese
   * @returns {Array} Lista delle regioni
   * @private
   */
  _getRegionsForCountry(countryCode) {
    const continent = this.regionManager.getCountryContinent(countryCode);
    if (!continent) return [];
    
    const regions = this.regionManager.getRegionsInContinent(continent.code);
    return regions.filter(region => region.countries.includes(countryCode));
  }
  
  /**
   * Calcola il numero di slot per le regioni di un paese
   * @param {String} countryCode - Codice ISO del paese
   * @returns {Object} Numero di slot per regione
   * @private
   */
  _calculateRegionalSlots(countryCode) {
    const regions = this._getRegionsForCountry(countryCode);
    const totalSlots = this.pathwayConfig.maxParticipants.national;
    const slotsPerRegion = Math.floor(totalSlots / regions.length);
    
    const slots = {};
    regions.forEach(region => {
      slots[region.code] = slotsPerRegion;
    });
    
    return slots;
  }
  
  /**
   * Calcola il numero di slot per i paesi di un continente
   * @param {String} continentCode - Codice del continente
   * @returns {Object} Numero di slot per paese
   * @private
   */
  _calculateNationalSlots(continentCode) {
    const countries = this.regionManager.getCountriesInContinent(continentCode);
    const totalSlots = this.pathwayConfig.maxParticipants.continental;
    
    // Assegna slot in base alla popolazione o all'importanza del paese
    // In un'implementazione reale, si utilizzerebbe un algoritmo più sofisticato
    const slots = {};
    
    // Assegna almeno uno slot a ogni paese
    countries.forEach(country => {
      slots[country.code] = 1;
    });
    
    // Distribuisci gli slot rimanenti in base all'importanza
    const remainingSlots = totalSlots - countries.length;
    const importantCountries = this._getImportantCountries(continentCode);
    
    let slotsAssigned = 0;
    for (const country of importantCountries) {
      if (slotsAssigned < remainingSlots) {
        slots[country] += 1;
        slotsAssigned++;
      } else {
        break;
      }
    }
    
    return slots;
  }
  
  /**
   * Calcola il numero di slot per i continenti
   * @returns {Object} Numero di slot per continente
   * @private
   */
  _calculateContinentalSlots() {
    const continents = this.regionManager.getContinentsForInternationalChampionship();
    const totalSlots = this.pathwayConfig.maxParticipants.international;
    
    // Assegna slot in base all'importanza del continente
    const slots = {};
    
    // Distribuzione predefinita degli slot
    const distribution = {
      'EU': 16, // Europa
      'AS': 10, // Asia
      'NA': 8,  // Nord America
      'SA': 6,  // Sud America
      'AF': 5,  // Africa
      'OC': 3   // Oceania
    };
    
    // Assegna gli slot in base alla distribuzione
    continents.forEach(continent => {
      slots[continent.code] = distribution[continent.code] || 1;
    });
    
    return slots;
  }
  
  /**
   * Ottiene i paesi più importanti di un continente
   * @param {String} continentCode - Codice del continente
   * @returns {Array} Lista dei codici dei paesi
   * @private
   */
  _getImportantCountries(continentCode) {
    // In un'implementazione reale, si utilizzerebbe un database o un'API
    // per ottenere i paesi più importanti in base a vari criteri
    
    // Implementazione semplificata
    const importantCountries = {
      'EU': ['DE', 'FR', 'GB', 'IT', 'ES', 'NL', 'PT', 'BE', 'CH', 'SE'],
      'AS': ['CN', 'JP', 'KR', 'IN', 'ID', 'TH', 'MY', 'SG', 'PH', 'VN'],
      'NA': ['US', 'CA', 'MX', 'CR', 'PA', 'JM', 'CU', 'DO', 'HT', 'GT'],
      'SA': ['BR', 'AR', 'CO', 'CL', 'PE', 'UY', 'EC', 'VE', 'PY', 'BO'],
      'AF': ['ZA', 'EG', 'NG', 'MA', 'TN', 'DZ', 'GH', 'CM', 'SN', 'CI'],
      'OC': ['AU', 'NZ', 'PG', 'FJ', 'SB', 'VU', 'TO', 'WS', 'KI', 'MH']
    };
    
    return importantCountries[continentCode] || [];
  }
}

// Esporta la classe
module.exports = QualificationPathway;
