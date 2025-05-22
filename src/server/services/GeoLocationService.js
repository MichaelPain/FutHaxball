/**
 * GeoLocationService.js - Servizio per la geolocalizzazione dei giocatori
 * 
 * Questo servizio utilizza API di geolocalizzazione per determinare la posizione
 * geografica dei giocatori, supportando la creazione di campionati basati sulla località.
 */

class GeoLocationService {
  /**
   * Costruttore
   * @param {Object} config - Configurazione del servizio
   */
  constructor(config = {}) {
    this.apiKey = config.apiKey || process.env.GEOLOCATION_API_KEY;
    this.cacheEnabled = config.cacheEnabled !== undefined ? config.cacheEnabled : true;
    this.cacheTTL = config.cacheTTL || 86400000; // 24 ore in millisecondi
    this.geoCache = new Map();
    
    // Provider di geolocalizzazione supportati
    this.providers = {
      ipstack: {
        baseUrl: 'http://api.ipstack.com/',
        queryParams: { access_key: this.apiKey, format: 1 }
      },
      ipapi: {
        baseUrl: 'https://ipapi.co/',
        queryParams: { format: 'json' }
      },
      ipinfo: {
        baseUrl: 'https://ipinfo.io/',
        queryParams: { token: this.apiKey }
      }
    };
    
    // Provider predefinito
    this.defaultProvider = config.defaultProvider || 'ipapi';
    
    // Mappa dei continenti
    this.continentMap = {
      'AF': 'africa',
      'AN': 'antarctica',
      'AS': 'asia',
      'EU': 'europe',
      'NA': 'north_america',
      'OC': 'oceania',
      'SA': 'south_america'
    };
  }
  
  /**
   * Ottiene la posizione geografica di un utente in base all'indirizzo IP
   * @param {String} ip - Indirizzo IP dell'utente
   * @param {String} provider - Provider di geolocalizzazione da utilizzare
   * @returns {Promise<Object>} Informazioni sulla posizione geografica
   */
  async getLocationByIp(ip, provider = this.defaultProvider) {
    // Verifica se i dati sono nella cache
    const cacheKey = `ip_${ip}_${provider}`;
    if (this.cacheEnabled && this.geoCache.has(cacheKey)) {
      const cachedData = this.geoCache.get(cacheKey);
      if (Date.now() - cachedData.timestamp < this.cacheTTL) {
        return cachedData.data;
      }
      // Rimuovi i dati scaduti dalla cache
      this.geoCache.delete(cacheKey);
    }
    
    try {
      // Seleziona il provider
      const selectedProvider = this.providers[provider];
      if (!selectedProvider) {
        throw new Error(`Provider di geolocalizzazione non supportato: ${provider}`);
      }
      
      // Costruisci l'URL della richiesta
      let url = `${selectedProvider.baseUrl}${ip}`;
      const queryParams = new URLSearchParams(selectedProvider.queryParams).toString();
      if (queryParams) {
        url += `?${queryParams}`;
      }
      
      // Effettua la richiesta
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Errore nella richiesta di geolocalizzazione: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Normalizza i dati in base al provider
      const locationData = this._normalizeLocationData(data, provider);
      
      // Salva i dati nella cache
      if (this.cacheEnabled) {
        this.geoCache.set(cacheKey, {
          data: locationData,
          timestamp: Date.now()
        });
      }
      
      return locationData;
    } catch (error) {
      console.error('Errore durante la geolocalizzazione:', error);
      
      // In caso di errore, prova con un provider alternativo
      if (provider === this.defaultProvider) {
        const alternativeProvider = Object.keys(this.providers).find(p => p !== provider);
        if (alternativeProvider) {
          console.log(`Tentativo con provider alternativo: ${alternativeProvider}`);
          return this.getLocationByIp(ip, alternativeProvider);
        }
      }
      
      // Se tutti i tentativi falliscono, restituisci dati predefiniti
      return {
        ip,
        country_code: 'XX',
        country_name: 'Unknown',
        continent_code: 'XX',
        continent_name: 'Unknown',
        region_code: 'XX',
        region_name: 'Unknown',
        city: 'Unknown',
        latitude: 0,
        longitude: 0,
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Ottiene la posizione geografica di un utente in base alle coordinate
   * @param {Number} latitude - Latitudine
   * @param {Number} longitude - Longitudine
   * @returns {Promise<Object>} Informazioni sulla posizione geografica
   */
  async getLocationByCoordinates(latitude, longitude) {
    // Verifica se i dati sono nella cache
    const cacheKey = `coords_${latitude}_${longitude}`;
    if (this.cacheEnabled && this.geoCache.has(cacheKey)) {
      const cachedData = this.geoCache.get(cacheKey);
      if (Date.now() - cachedData.timestamp < this.cacheTTL) {
        return cachedData.data;
      }
      // Rimuovi i dati scaduti dalla cache
      this.geoCache.delete(cacheKey);
    }
    
    try {
      // Utilizza un servizio di reverse geocoding
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'HaxballClone/1.0'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Errore nella richiesta di reverse geocoding: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Estrai le informazioni sulla posizione
      const locationData = {
        latitude,
        longitude,
        country_code: data.address.country_code?.toUpperCase() || 'XX',
        country_name: data.address.country || 'Unknown',
        continent_code: this._getContinentCodeFromCountry(data.address.country_code?.toUpperCase()),
        continent_name: this._getContinentNameFromCode(this._getContinentCodeFromCountry(data.address.country_code?.toUpperCase())),
        region_code: data.address.state_code || 'XX',
        region_name: data.address.state || data.address.region || 'Unknown',
        city: data.address.city || data.address.town || data.address.village || 'Unknown',
        success: true
      };
      
      // Salva i dati nella cache
      if (this.cacheEnabled) {
        this.geoCache.set(cacheKey, {
          data: locationData,
          timestamp: Date.now()
        });
      }
      
      return locationData;
    } catch (error) {
      console.error('Errore durante il reverse geocoding:', error);
      
      // Se la richiesta fallisce, restituisci dati predefiniti
      return {
        latitude,
        longitude,
        country_code: 'XX',
        country_name: 'Unknown',
        continent_code: 'XX',
        continent_name: 'Unknown',
        region_code: 'XX',
        region_name: 'Unknown',
        city: 'Unknown',
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Ottiene il continente di un paese
   * @param {String} countryCode - Codice ISO del paese
   * @returns {String} Codice del continente
   */
  getCountryContinent(countryCode) {
    return this._getContinentCodeFromCountry(countryCode);
  }
  
  /**
   * Verifica se un utente si trova in un determinato paese
   * @param {String} ip - Indirizzo IP dell'utente
   * @param {String} countryCode - Codice ISO del paese
   * @returns {Promise<Boolean>} True se l'utente si trova nel paese specificato
   */
  async isUserInCountry(ip, countryCode) {
    const location = await this.getLocationByIp(ip);
    return location.country_code === countryCode.toUpperCase();
  }
  
  /**
   * Verifica se un utente si trova in un determinato continente
   * @param {String} ip - Indirizzo IP dell'utente
   * @param {String} continentCode - Codice del continente
   * @returns {Promise<Boolean>} True se l'utente si trova nel continente specificato
   */
  async isUserInContinent(ip, continentCode) {
    const location = await this.getLocationByIp(ip);
    return location.continent_code === continentCode.toUpperCase();
  }
  
  /**
   * Ottiene la distanza tra due coordinate geografiche
   * @param {Number} lat1 - Latitudine del primo punto
   * @param {Number} lon1 - Longitudine del primo punto
   * @param {Number} lat2 - Latitudine del secondo punto
   * @param {Number} lon2 - Longitudine del secondo punto
   * @returns {Number} Distanza in chilometri
   */
  getDistance(lat1, lon1, lat2, lon2) {
    // Implementazione della formula di Haversine
    const R = 6371; // Raggio della Terra in km
    const dLat = this._toRad(lat2 - lat1);
    const dLon = this._toRad(lon2 - lon1);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this._toRad(lat1)) * Math.cos(this._toRad(lat2)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return distance;
  }
  
  /**
   * Normalizza i dati di posizione in base al provider
   * @param {Object} data - Dati di posizione
   * @param {String} provider - Provider di geolocalizzazione
   * @returns {Object} Dati di posizione normalizzati
   * @private
   */
  _normalizeLocationData(data, provider) {
    switch (provider) {
      case 'ipstack':
        return {
          ip: data.ip,
          country_code: data.country_code,
          country_name: data.country_name,
          continent_code: data.continent_code,
          continent_name: data.continent_name,
          region_code: data.region_code,
          region_name: data.region_name,
          city: data.city,
          latitude: data.latitude,
          longitude: data.longitude,
          success: true
        };
      
      case 'ipapi':
        return {
          ip: data.ip,
          country_code: data.country_code,
          country_name: data.country_name,
          continent_code: this._getContinentCodeFromCountry(data.country_code),
          continent_name: this._getContinentNameFromCode(this._getContinentCodeFromCountry(data.country_code)),
          region_code: data.region_code,
          region_name: data.region,
          city: data.city,
          latitude: data.latitude,
          longitude: data.longitude,
          success: true
        };
      
      case 'ipinfo':
        const [latitude, longitude] = data.loc ? data.loc.split(',').map(parseFloat) : [0, 0];
        return {
          ip: data.ip,
          country_code: data.country,
          country_name: this._getCountryNameFromCode(data.country),
          continent_code: this._getContinentCodeFromCountry(data.country),
          continent_name: this._getContinentNameFromCode(this._getContinentCodeFromCountry(data.country)),
          region_code: data.region,
          region_name: data.region,
          city: data.city,
          latitude,
          longitude,
          success: true
        };
      
      default:
        return data;
    }
  }
  
  /**
   * Ottiene il codice del continente dal codice del paese
   * @param {String} countryCode - Codice ISO del paese
   * @returns {String} Codice del continente
   * @private
   */
  _getContinentCodeFromCountry(countryCode) {
    // Mappa dei paesi ai continenti
    const countryToContinentMap = {
      // Europa
      'AD': 'EU', 'AL': 'EU', 'AT': 'EU', 'BA': 'EU', 'BE': 'EU', 'BG': 'EU', 'BY': 'EU',
      'CH': 'EU', 'CY': 'EU', 'CZ': 'EU', 'DE': 'EU', 'DK': 'EU', 'EE': 'EU', 'ES': 'EU',
      'FI': 'EU', 'FR': 'EU', 'GB': 'EU', 'GR': 'EU', 'HR': 'EU', 'HU': 'EU', 'IE': 'EU',
      'IS': 'EU', 'IT': 'EU', 'LI': 'EU', 'LT': 'EU', 'LU': 'EU', 'LV': 'EU', 'MC': 'EU',
      'MD': 'EU', 'ME': 'EU', 'MK': 'EU', 'MT': 'EU', 'NL': 'EU', 'NO': 'EU', 'PL': 'EU',
      'PT': 'EU', 'RO': 'EU', 'RS': 'EU', 'RU': 'EU', 'SE': 'EU', 'SI': 'EU', 'SK': 'EU',
      'SM': 'EU', 'UA': 'EU', 'VA': 'EU', 'XK': 'EU',
      
      // Nord America
      'AG': 'NA', 'BB': 'NA', 'BS': 'NA', 'BZ': 'NA', 'CA': 'NA', 'CR': 'NA', 'CU': 'NA',
      'DM': 'NA', 'DO': 'NA', 'GD': 'NA', 'GT': 'NA', 'HN': 'NA', 'HT': 'NA', 'JM': 'NA',
      'KN': 'NA', 'LC': 'NA', 'MX': 'NA', 'NI': 'NA', 'PA': 'NA', 'SV': 'NA', 'US': 'NA',
      'VC': 'NA',
      
      // Sud America
      'AR': 'SA', 'BO': 'SA', 'BR': 'SA', 'CL': 'SA', 'CO': 'SA', 'EC': 'SA', 'GY': 'SA',
      'PE': 'SA', 'PY': 'SA', 'SR': 'SA', 'UY': 'SA', 'VE': 'SA',
      
      // Asia
      'AE': 'AS', 'AF': 'AS', 'AM': 'AS', 'AZ': 'AS', 'BD': 'AS', 'BH': 'AS', 'BN': 'AS',
      'BT': 'AS', 'CN': 'AS', 'GE': 'AS', 'HK': 'AS', 'ID': 'AS', 'IL': 'AS', 'IN': 'AS',
      'IQ': 'AS', 'IR': 'AS', 'JO': 'AS', 'JP': 'AS', 'KG': 'AS', 'KH': 'AS', 'KP': 'AS',
      'KR': 'AS', 'KW': 'AS', 'KZ': 'AS', 'LA': 'AS', 'LB': 'AS', 'LK': 'AS', 'MM': 'AS',
      'MN': 'AS', 'MO': 'AS', 'MV': 'AS', 'MY': 'AS', 'NP': 'AS', 'OM': 'AS', 'PH': 'AS',
      'PK': 'AS', 'PS': 'AS', 'QA': 'AS', 'SA': 'AS', 'SG': 'AS', 'SY': 'AS', 'TH': 'AS',
      'TJ': 'AS', 'TL': 'AS', 'TM': 'AS', 'TR': 'AS', 'TW': 'AS', 'UZ': 'AS', 'VN': 'AS',
      'YE': 'AS',
      
      // Africa
      'AO': 'AF', 'BF': 'AF', 'BI': 'AF', 'BJ': 'AF', 'BW': 'AF', 'CD': 'AF', 'CF': 'AF',
      'CG': 'AF', 'CI': 'AF', 'CM': 'AF', 'CV': 'AF', 'DJ': 'AF', 'DZ': 'AF', 'EG': 'AF',
      'ER': 'AF', 'ET': 'AF', 'GA': 'AF', 'GH': 'AF', 'GM': 'AF', 'GN': 'AF', 'GQ': 'AF',
      'GW': 'AF', 'KE': 'AF', 'LR': 'AF', 'LS': 'AF', 'LY': 'AF', 'MA': 'AF', 'MG': 'AF',
      'ML': 'AF', 'MR': 'AF', 'MU': 'AF', 'MW': 'AF', 'MZ': 'AF', 'NA': 'AF', 'NE': 'AF',
      'NG': 'AF', 'RW': 'AF', 'SC': 'AF', 'SD': 'AF', 'SL': 'AF', 'SN': 'AF', 'SO': 'AF',
      'SS': 'AF', 'ST': 'AF', 'SZ': 'AF', 'TD': 'AF', 'TG': 'AF', 'TN': 'AF', 'TZ': 'AF',
      'UG': 'AF', 'ZA': 'AF', 'ZM': 'AF', 'ZW': 'AF',
      
      // Oceania
      'AU': 'OC', 'FJ': 'OC', 'FM': 'OC', 'KI': 'OC', 'MH': 'OC', 'NR': 'OC', 'NZ': 'OC',
      'PG': 'OC', 'PW': 'OC', 'SB': 'OC', 'TO': 'OC', 'TV': 'OC', 'VU': 'OC', 'WS': 'OC',
      
      // Antartide
      'AQ': 'AN'
    };
    
    return countryToContinentMap[countryCode] || 'XX';
  }
  
  /**
   * Ottiene il nome del continente dal codice
   * @param {String} continentCode - Codice del continente
   * @returns {String} Nome del continente
   * @private
   */
  _getContinentNameFromCode(continentCode) {
    const continentNames = {
      'AF': 'Africa',
      'AN': 'Antarctica',
      'AS': 'Asia',
      'EU': 'Europe',
      'NA': 'North America',
      'OC': 'Oceania',
      'SA': 'South America',
      'XX': 'Unknown'
    };
    
    return continentNames[continentCode] || 'Unknown';
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
  
  /**
   * Converte gradi in radianti
   * @param {Number} degrees - Gradi
   * @returns {Number} Radianti
   * @private
   */
  _toRad(degrees) {
    return degrees * Math.PI / 180;
  }
}

// Esporta la classe
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GeoLocationService;
} else {
  window.GeoLocationService = GeoLocationService;
}
