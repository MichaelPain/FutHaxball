/**
 * CountryDetector.js - Componente per il rilevamento automatico del paese di un giocatore
 * 
 * Questo componente utilizza il GeoLocationService per rilevare automaticamente
 * il paese di un giocatore in base al suo indirizzo IP o alle informazioni fornite.
 */

const GeoLocationService = require('./GeoLocationService');

class CountryDetector {
  /**
   * Costruttore
   * @param {Object} config - Configurazione del rilevatore
   */
  constructor(config = {}) {
    this.geoLocationService = config.geoLocationService || new GeoLocationService(config);
    this.cacheEnabled = config.cacheEnabled !== undefined ? config.cacheEnabled : true;
    this.cacheTTL = config.cacheTTL || 86400000; // 24 ore in millisecondi
    this.detectionCache = new Map();
    
    // Opzioni di fallback
    this.fallbackToClientInfo = config.fallbackToClientInfo !== undefined ? config.fallbackToClientInfo : true;
    this.fallbackToDefaultCountry = config.fallbackToDefaultCountry !== undefined ? config.fallbackToDefaultCountry : true;
    this.defaultCountry = config.defaultCountry || 'US';
    
    // Opzioni di verifica
    this.verifyClientInfo = config.verifyClientInfo !== undefined ? config.verifyClientInfo : true;
  }
  
  /**
   * Rileva il paese di un utente
   * @param {Object} options - Opzioni di rilevamento
   * @param {String} options.ip - Indirizzo IP dell'utente
   * @param {String} options.clientCountry - Paese dichiarato dal client
   * @param {Object} options.coordinates - Coordinate geografiche {latitude, longitude}
   * @returns {Promise<Object>} Informazioni sul paese
   */
  async detectCountry(options = {}) {
    const { ip, clientCountry, coordinates } = options;
    
    // Verifica se i dati sono nella cache
    let cacheKey = null;
    if (this.cacheEnabled) {
      if (ip) {
        cacheKey = `ip_${ip}`;
      } else if (coordinates) {
        cacheKey = `coords_${coordinates.latitude}_${coordinates.longitude}`;
      } else if (clientCountry) {
        cacheKey = `client_${clientCountry}`;
      }
      
      if (cacheKey && this.detectionCache.has(cacheKey)) {
        const cachedData = this.detectionCache.get(cacheKey);
        if (Date.now() - cachedData.timestamp < this.cacheTTL) {
          return cachedData.data;
        }
        // Rimuovi i dati scaduti dalla cache
        this.detectionCache.delete(cacheKey);
      }
    }
    
    try {
      let countryInfo = null;
      
      // Metodo 1: Rileva il paese tramite IP
      if (ip) {
        try {
          const locationData = await this.geoLocationService.getLocationByIp(ip);
          if (locationData.success) {
            countryInfo = this._createCountryInfo(locationData);
            
            // Verifica la coerenza con il paese dichiarato dal client
            if (this.verifyClientInfo && clientCountry && clientCountry !== locationData.country_code) {
              countryInfo.verified = false;
              countryInfo.clientCountryMatch = false;
            }
          }
        } catch (error) {
          console.error('Errore durante il rilevamento del paese tramite IP:', error);
        }
      }
      
      // Metodo 2: Rileva il paese tramite coordinate
      if (!countryInfo && coordinates) {
        try {
          const locationData = await this.geoLocationService.getLocationByCoordinates(
            coordinates.latitude,
            coordinates.longitude
          );
          if (locationData.success) {
            countryInfo = this._createCountryInfo(locationData);
            
            // Verifica la coerenza con il paese dichiarato dal client
            if (this.verifyClientInfo && clientCountry && clientCountry !== locationData.country_code) {
              countryInfo.verified = false;
              countryInfo.clientCountryMatch = false;
            }
          }
        } catch (error) {
          console.error('Errore durante il rilevamento del paese tramite coordinate:', error);
        }
      }
      
      // Metodo 3: Utilizza il paese dichiarato dal client
      if (!countryInfo && this.fallbackToClientInfo && clientCountry) {
        countryInfo = {
          country_code: clientCountry,
          country_name: this._getCountryNameFromCode(clientCountry),
          continent_code: this.geoLocationService._getContinentCodeFromCountry(clientCountry),
          continent_name: this.geoLocationService._getContinentNameFromCode(
            this.geoLocationService._getContinentCodeFromCountry(clientCountry)
          ),
          verified: false,
          source: 'client_info'
        };
      }
      
      // Metodo 4: Utilizza il paese predefinito
      if (!countryInfo && this.fallbackToDefaultCountry) {
        countryInfo = {
          country_code: this.defaultCountry,
          country_name: this._getCountryNameFromCode(this.defaultCountry),
          continent_code: this.geoLocationService._getContinentCodeFromCountry(this.defaultCountry),
          continent_name: this.geoLocationService._getContinentNameFromCode(
            this.geoLocationService._getContinentCodeFromCountry(this.defaultCountry)
          ),
          verified: false,
          source: 'default'
        };
      }
      
      // Salva i dati nella cache
      if (this.cacheEnabled && cacheKey && countryInfo) {
        this.detectionCache.set(cacheKey, {
          data: countryInfo,
          timestamp: Date.now()
        });
      }
      
      return countryInfo;
    } catch (error) {
      console.error('Errore durante il rilevamento del paese:', error);
      
      // In caso di errore, restituisci il paese predefinito
      return {
        country_code: this.defaultCountry,
        country_name: this._getCountryNameFromCode(this.defaultCountry),
        continent_code: this.geoLocationService._getContinentCodeFromCountry(this.defaultCountry),
        continent_name: this.geoLocationService._getContinentNameFromCode(
          this.geoLocationService._getContinentCodeFromCountry(this.defaultCountry)
        ),
        verified: false,
        source: 'default',
        error: error.message
      };
    }
  }
  
  /**
   * Verifica se un utente può partecipare a un campionato nazionale
   * @param {Object} options - Opzioni di verifica
   * @param {String} options.ip - Indirizzo IP dell'utente
   * @param {String} options.clientCountry - Paese dichiarato dal client
   * @param {Object} options.coordinates - Coordinate geografiche {latitude, longitude}
   * @param {String} countryCode - Codice ISO del paese del campionato
   * @returns {Promise<Object>} Risultato della verifica
   */
  async canParticipateInNationalChampionship(options = {}, countryCode) {
    const countryInfo = await this.detectCountry(options);
    
    const canParticipate = countryInfo.country_code === countryCode;
    
    return {
      canParticipate,
      countryInfo,
      targetCountry: {
        country_code: countryCode,
        country_name: this._getCountryNameFromCode(countryCode)
      }
    };
  }
  
  /**
   * Verifica se un utente può partecipare a un campionato continentale
   * @param {Object} options - Opzioni di verifica
   * @param {String} options.ip - Indirizzo IP dell'utente
   * @param {String} options.clientCountry - Paese dichiarato dal client
   * @param {Object} options.coordinates - Coordinate geografiche {latitude, longitude}
   * @param {String} continentCode - Codice del continente del campionato
   * @returns {Promise<Object>} Risultato della verifica
   */
  async canParticipateInContinentalChampionship(options = {}, continentCode) {
    const countryInfo = await this.detectCountry(options);
    
    const canParticipate = countryInfo.continent_code === continentCode;
    
    return {
      canParticipate,
      countryInfo,
      targetContinent: {
        continent_code: continentCode,
        continent_name: this.geoLocationService._getContinentNameFromCode(continentCode)
      }
    };
  }
  
  /**
   * Crea un oggetto con le informazioni sul paese
   * @param {Object} locationData - Dati di posizione
   * @returns {Object} Informazioni sul paese
   * @private
   */
  _createCountryInfo(locationData) {
    return {
      country_code: locationData.country_code,
      country_name: locationData.country_name,
      continent_code: locationData.continent_code,
      continent_name: locationData.continent_name,
      region_code: locationData.region_code,
      region_name: locationData.region_name,
      city: locationData.city,
      latitude: locationData.latitude,
      longitude: locationData.longitude,
      verified: true,
      source: 'geo_api',
      clientCountryMatch: true
    };
  }
  
  /**
   * Ottiene il nome del paese dal codice
   * @param {String} countryCode - Codice ISO del paese
   * @returns {String} Nome del paese
   * @private
   */
  _getCountryNameFromCode(countryCode) {
    // Implementazione semplificata, in un'applicazione reale si utilizzerebbe una libreria di localizzazione
    const countryNames = {
      'IT': 'Italy',
      'US': 'United States',
      'GB': 'United Kingdom',
      'DE': 'Germany',
      'FR': 'France',
      'ES': 'Spain',
      'JP': 'Japan',
      'CN': 'China',
      'RU': 'Russia',
      'BR': 'Brazil',
      'IN': 'India',
      // Aggiungi altri paesi secondo necessità
    };
    
    return countryNames[countryCode] || 'Unknown';
  }
}

// Esporta la classe
module.exports = CountryDetector;
