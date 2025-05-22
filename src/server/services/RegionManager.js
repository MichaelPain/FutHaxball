/**
 * RegionManager.js - Gestore per l'organizzazione dei paesi in regioni e continenti
 * 
 * Questo componente gestisce l'organizzazione dei paesi in regioni e continenti,
 * facilitando la creazione di campionati geografici.
 */

const GeoLocationService = require('./GeoLocationService');

class RegionManager {
  /**
   * Costruttore
   * @param {Object} config - Configurazione del gestore
   */
  constructor(config = {}) {
    this.geoLocationService = config.geoLocationService || new GeoLocationService(config);
    
    // Mappa dei continenti
    this.continents = {
      'AF': {
        code: 'AF',
        name: 'Africa',
        countries: []
      },
      'AN': {
        code: 'AN',
        name: 'Antarctica',
        countries: []
      },
      'AS': {
        code: 'AS',
        name: 'Asia',
        countries: []
      },
      'EU': {
        code: 'EU',
        name: 'Europe',
        countries: []
      },
      'NA': {
        code: 'NA',
        name: 'North America',
        countries: []
      },
      'OC': {
        code: 'OC',
        name: 'Oceania',
        countries: []
      },
      'SA': {
        code: 'SA',
        name: 'South America',
        countries: []
      }
    };
    
    // Inizializza le regioni
    this._initializeRegions();
  }
  
  /**
   * Ottiene tutti i continenti
   * @returns {Array} Lista dei continenti
   */
  getAllContinents() {
    return Object.values(this.continents);
  }
  
  /**
   * Ottiene un continente specifico
   * @param {String} continentCode - Codice del continente
   * @returns {Object} Informazioni sul continente
   */
  getContinent(continentCode) {
    return this.continents[continentCode] || null;
  }
  
  /**
   * Ottiene tutti i paesi di un continente
   * @param {String} continentCode - Codice del continente
   * @returns {Array} Lista dei paesi
   */
  getCountriesInContinent(continentCode) {
    const continent = this.getContinent(continentCode);
    return continent ? continent.countries : [];
  }
  
  /**
   * Ottiene le informazioni su un paese
   * @param {String} countryCode - Codice ISO del paese
   * @returns {Object} Informazioni sul paese
   */
  getCountry(countryCode) {
    for (const continent of Object.values(this.continents)) {
      const country = continent.countries.find(c => c.code === countryCode);
      if (country) {
        return country;
      }
    }
    return null;
  }
  
  /**
   * Ottiene il continente di un paese
   * @param {String} countryCode - Codice ISO del paese
   * @returns {Object} Informazioni sul continente
   */
  getCountryContinent(countryCode) {
    const continentCode = this.geoLocationService.getCountryContinent(countryCode);
    return this.getContinent(continentCode);
  }
  
  /**
   * Ottiene i paesi vicini a un paese specifico
   * @param {String} countryCode - Codice ISO del paese
   * @param {Number} limit - Numero massimo di paesi da restituire
   * @returns {Array} Lista dei paesi vicini
   */
  getNeighboringCountries(countryCode, limit = 5) {
    const country = this.getCountry(countryCode);
    if (!country) return [];
    
    const continent = this.getCountryContinent(countryCode);
    if (!continent) return [];
    
    // Ottieni tutti i paesi dello stesso continente
    const continentCountries = continent.countries.filter(c => c.code !== countryCode);
    
    // Ordina i paesi per vicinanza (in un'implementazione reale si utilizzerebbe una mappa di adiacenza)
    // Per semplicità, restituiamo semplicemente i primi N paesi del continente
    return continentCountries.slice(0, limit);
  }
  
  /**
   * Ottiene i paesi che possono partecipare a un campionato nazionale
   * @param {String} countryCode - Codice ISO del paese
   * @returns {Array} Lista dei paesi
   */
  getCountriesForNationalChampionship(countryCode) {
    const country = this.getCountry(countryCode);
    return country ? [country] : [];
  }
  
  /**
   * Ottiene i paesi che possono partecipare a un campionato continentale
   * @param {String} continentCode - Codice del continente
   * @returns {Array} Lista dei paesi
   */
  getCountriesForContinentalChampionship(continentCode) {
    return this.getCountriesInContinent(continentCode);
  }
  
  /**
   * Ottiene i paesi che possono partecipare a un campionato internazionale
   * @returns {Array} Lista dei paesi
   */
  getCountriesForInternationalChampionship() {
    const allCountries = [];
    for (const continent of Object.values(this.continents)) {
      allCountries.push(...continent.countries);
    }
    return allCountries;
  }
  
  /**
   * Ottiene i continenti che possono partecipare a un campionato internazionale
   * @returns {Array} Lista dei continenti
   */
  getContinentsForInternationalChampionship() {
    // Escludi l'Antartide dai campionati internazionali
    return Object.values(this.continents).filter(c => c.code !== 'AN');
  }
  
  /**
   * Ottiene le regioni di un continente
   * @param {String} continentCode - Codice del continente
   * @returns {Array} Lista delle regioni
   */
  getRegionsInContinent(continentCode) {
    const continent = this.getContinent(continentCode);
    return continent ? continent.regions || [] : [];
  }
  
  /**
   * Ottiene i paesi di una regione
   * @param {String} continentCode - Codice del continente
   * @param {String} regionCode - Codice della regione
   * @returns {Array} Lista dei paesi
   */
  getCountriesInRegion(continentCode, regionCode) {
    const continent = this.getContinent(continentCode);
    if (!continent) return [];
    
    const region = (continent.regions || []).find(r => r.code === regionCode);
    return region ? region.countries : [];
  }
  
  /**
   * Inizializza le regioni e i paesi
   * @private
   */
  _initializeRegions() {
    // Inizializza i paesi per ogni continente
    this._initializeCountries();
    
    // Inizializza le regioni per ogni continente
    this._initializeEuropeRegions();
    this._initializeNorthAmericaRegions();
    this._initializeSouthAmericaRegions();
    this._initializeAsiaRegions();
    this._initializeAfricaRegions();
    this._initializeOceaniaRegions();
  }
  
  /**
   * Inizializza i paesi per ogni continente
   * @private
   */
  _initializeCountries() {
    // Mappa dei paesi ai continenti
    const countryToContinentMap = {
      // Europa
      'AD': { code: 'AD', name: 'Andorra', continent: 'EU' },
      'AL': { code: 'AL', name: 'Albania', continent: 'EU' },
      'AT': { code: 'AT', name: 'Austria', continent: 'EU' },
      'BA': { code: 'BA', name: 'Bosnia and Herzegovina', continent: 'EU' },
      'BE': { code: 'BE', name: 'Belgium', continent: 'EU' },
      'BG': { code: 'BG', name: 'Bulgaria', continent: 'EU' },
      'BY': { code: 'BY', name: 'Belarus', continent: 'EU' },
      'CH': { code: 'CH', name: 'Switzerland', continent: 'EU' },
      'CY': { code: 'CY', name: 'Cyprus', continent: 'EU' },
      'CZ': { code: 'CZ', name: 'Czech Republic', continent: 'EU' },
      'DE': { code: 'DE', name: 'Germany', continent: 'EU' },
      'DK': { code: 'DK', name: 'Denmark', continent: 'EU' },
      'EE': { code: 'EE', name: 'Estonia', continent: 'EU' },
      'ES': { code: 'ES', name: 'Spain', continent: 'EU' },
      'FI': { code: 'FI', name: 'Finland', continent: 'EU' },
      'FR': { code: 'FR', name: 'France', continent: 'EU' },
      'GB': { code: 'GB', name: 'United Kingdom', continent: 'EU' },
      'GR': { code: 'GR', name: 'Greece', continent: 'EU' },
      'HR': { code: 'HR', name: 'Croatia', continent: 'EU' },
      'HU': { code: 'HU', name: 'Hungary', continent: 'EU' },
      'IE': { code: 'IE', name: 'Ireland', continent: 'EU' },
      'IS': { code: 'IS', name: 'Iceland', continent: 'EU' },
      'IT': { code: 'IT', name: 'Italy', continent: 'EU' },
      'LI': { code: 'LI', name: 'Liechtenstein', continent: 'EU' },
      'LT': { code: 'LT', name: 'Lithuania', continent: 'EU' },
      'LU': { code: 'LU', name: 'Luxembourg', continent: 'EU' },
      'LV': { code: 'LV', name: 'Latvia', continent: 'EU' },
      'MC': { code: 'MC', name: 'Monaco', continent: 'EU' },
      'MD': { code: 'MD', name: 'Moldova', continent: 'EU' },
      'ME': { code: 'ME', name: 'Montenegro', continent: 'EU' },
      'MK': { code: 'MK', name: 'North Macedonia', continent: 'EU' },
      'MT': { code: 'MT', name: 'Malta', continent: 'EU' },
      'NL': { code: 'NL', name: 'Netherlands', continent: 'EU' },
      'NO': { code: 'NO', name: 'Norway', continent: 'EU' },
      'PL': { code: 'PL', name: 'Poland', continent: 'EU' },
      'PT': { code: 'PT', name: 'Portugal', continent: 'EU' },
      'RO': { code: 'RO', name: 'Romania', continent: 'EU' },
      'RS': { code: 'RS', name: 'Serbia', continent: 'EU' },
      'RU': { code: 'RU', name: 'Russia', continent: 'EU' },
      'SE': { code: 'SE', name: 'Sweden', continent: 'EU' },
      'SI': { code: 'SI', name: 'Slovenia', continent: 'EU' },
      'SK': { code: 'SK', name: 'Slovakia', continent: 'EU' },
      'SM': { code: 'SM', name: 'San Marino', continent: 'EU' },
      'UA': { code: 'UA', name: 'Ukraine', continent: 'EU' },
      'VA': { code: 'VA', name: 'Vatican City', continent: 'EU' },
      
      // Nord America
      'AG': { code: 'AG', name: 'Antigua and Barbuda', continent: 'NA' },
      'BB': { code: 'BB', name: 'Barbados', continent: 'NA' },
      'BS': { code: 'BS', name: 'Bahamas', continent: 'NA' },
      'BZ': { code: 'BZ', name: 'Belize', continent: 'NA' },
      'CA': { code: 'CA', name: 'Canada', continent: 'NA' },
      'CR': { code: 'CR', name: 'Costa Rica', continent: 'NA' },
      'CU': { code: 'CU', name: 'Cuba', continent: 'NA' },
      'DM': { code: 'DM', name: 'Dominica', continent: 'NA' },
      'DO': { code: 'DO', name: 'Dominican Republic', continent: 'NA' },
      'GD': { code: 'GD', name: 'Grenada', continent: 'NA' },
      'GT': { code: 'GT', name: 'Guatemala', continent: 'NA' },
      'HN': { code: 'HN', name: 'Honduras', continent: 'NA' },
      'HT': { code: 'HT', name: 'Haiti', continent: 'NA' },
      'JM': { code: 'JM', name: 'Jamaica', continent: 'NA' },
      'KN': { code: 'KN', name: 'Saint Kitts and Nevis', continent: 'NA' },
      'LC': { code: 'LC', name: 'Saint Lucia', continent: 'NA' },
      'MX': { code: 'MX', name: 'Mexico', continent: 'NA' },
      'NI': { code: 'NI', name: 'Nicaragua', continent: 'NA' },
      'PA': { code: 'PA', name: 'Panama', continent: 'NA' },
      'SV': { code: 'SV', name: 'El Salvador', continent: 'NA' },
      'US': { code: 'US', name: 'United States', continent: 'NA' },
      'VC': { code: 'VC', name: 'Saint Vincent and the Grenadines', continent: 'NA' },
      
      // Sud America
      'AR': { code: 'AR', name: 'Argentina', continent: 'SA' },
      'BO': { code: 'BO', name: 'Bolivia', continent: 'SA' },
      'BR': { code: 'BR', name: 'Brazil', continent: 'SA' },
      'CL': { code: 'CL', name: 'Chile', continent: 'SA' },
      'CO': { code: 'CO', name: 'Colombia', continent: 'SA' },
      'EC': { code: 'EC', name: 'Ecuador', continent: 'SA' },
      'GY': { code: 'GY', name: 'Guyana', continent: 'SA' },
      'PE': { code: 'PE', name: 'Peru', continent: 'SA' },
      'PY': { code: 'PY', name: 'Paraguay', continent: 'SA' },
      'SR': { code: 'SR', name: 'Suriname', continent: 'SA' },
      'UY': { code: 'UY', name: 'Uruguay', continent: 'SA' },
      'VE': { code: 'VE', name: 'Venezuela', continent: 'SA' },
      
      // Asia
      'AE': { code: 'AE', name: 'United Arab Emirates', continent: 'AS' },
      'AF': { code: 'AF', name: 'Afghanistan', continent: 'AS' },
      'AM': { code: 'AM', name: 'Armenia', continent: 'AS' },
      'AZ': { code: 'AZ', name: 'Azerbaijan', continent: 'AS' },
      'BD': { code: 'BD', name: 'Bangladesh', continent: 'AS' },
      'BH': { code: 'BH', name: 'Bahrain', continent: 'AS' },
      'BN': { code: 'BN', name: 'Brunei', continent: 'AS' },
      'BT': { code: 'BT', name: 'Bhutan', continent: 'AS' },
      'CN': { code: 'CN', name: 'China', continent: 'AS' },
      'GE': { code: 'GE', name: 'Georgia', continent: 'AS' },
      'HK': { code: 'HK', name: 'Hong Kong', continent: 'AS' },
      'ID': { code: 'ID', name: 'Indonesia', continent: 'AS' },
      'IL': { code: 'IL', name: 'Israel', continent: 'AS' },
      'IN': { code: 'IN', name: 'India', continent: 'AS' },
      'IQ': { code: 'IQ', name: 'Iraq', continent: 'AS' },
      'IR': { code: 'IR', name: 'Iran', continent: 'AS' },
      'JO': { code: 'JO', name: 'Jordan', continent: 'AS' },
      'JP': { code: 'JP', name: 'Japan', continent: 'AS' },
      'KG': { code: 'KG', name: 'Kyrgyzstan', continent: 'AS' },
      'KH': { code: 'KH', name: 'Cambodia', continent: 'AS' },
      'KP': { code: 'KP', name: 'North Korea', continent: 'AS' },
      'KR': { code: 'KR', name: 'South Korea', continent: 'AS' },
      'KW': { code: 'KW', name: 'Kuwait', continent: 'AS' },
      'KZ': { code: 'KZ', name: 'Kazakhstan', continent: 'AS' },
      'LA': { code: 'LA', name: 'Laos', continent: 'AS' },
      'LB': { code: 'LB', name: 'Lebanon', continent: 'AS' },
      'LK': { code: 'LK', name: 'Sri Lanka', continent: 'AS' },
      'MM': { code: 'MM', name: 'Myanmar', continent: 'AS' },
      'MN': { code: 'MN', name: 'Mongolia', continent: 'AS' },
      'MO': { code: 'MO', name: 'Macau', continent: 'AS' },
      'MV': { code: 'MV', name: 'Maldives', continent: 'AS' },
      'MY': { code: 'MY', name: 'Malaysia', continent: 'AS' },
      'NP': { code: 'NP', name: 'Nepal', continent: 'AS' },
      'OM': { code: 'OM', name: 'Oman', continent: 'AS' },
      'PH': { code: 'PH', name: 'Philippines', continent: 'AS' },
      'PK': { code: 'PK', name: 'Pakistan', continent: 'AS' },
      'PS': { code: 'PS', name: 'Palestine', continent: 'AS' },
      'QA': { code: 'QA', name: 'Qatar', continent: 'AS' },
      'SA': { code: 'SA', name: 'Saudi Arabia', continent: 'AS' },
      'SG': { code: 'SG', name: 'Singapore', continent: 'AS' },
      'SY': { code: 'SY', name: 'Syria', continent: 'AS' },
      'TH': { code: 'TH', name: 'Thailand', continent: 'AS' },
      'TJ': { code: 'TJ', name: 'Tajikistan', continent: 'AS' },
      'TL': { code: 'TL', name: 'Timor-Leste', continent: 'AS' },
      'TM': { code: 'TM', name: 'Turkmenistan', continent: 'AS' },
      'TR': { code: 'TR', name: 'Turkey', continent: 'AS' },
      'TW': { code: 'TW', name: 'Taiwan', continent: 'AS' },
      'UZ': { code: 'UZ', name: 'Uzbekistan', continent: 'AS' },
      'VN': { code: 'VN', name: 'Vietnam', continent: 'AS' },
      'YE': { code: 'YE', name: 'Yemen', continent: 'AS' },
      
      // Africa
      'AO': { code: 'AO', name: 'Angola', continent: 'AF' },
      'BF': { code: 'BF', name: 'Burkina Faso', continent: 'AF' },
      'BI': { code: 'BI', name: 'Burundi', continent: 'AF' },
      'BJ': { code: 'BJ', name: 'Benin', continent: 'AF' },
      'BW': { code: 'BW', name: 'Botswana', continent: 'AF' },
      'CD': { code: 'CD', name: 'Democratic Republic of the Congo', continent: 'AF' },
      'CF': { code: 'CF', name: 'Central African Republic', continent: 'AF' },
      'CG': { code: 'CG', name: 'Republic of the Congo', continent: 'AF' },
      'CI': { code: 'CI', name: 'Ivory Coast', continent: 'AF' },
      'CM': { code: 'CM', name: 'Cameroon', continent: 'AF' },
      'CV': { code: 'CV', name: 'Cape Verde', continent: 'AF' },
      'DJ': { code: 'DJ', name: 'Djibouti', continent: 'AF' },
      'DZ': { code: 'DZ', name: 'Algeria', continent: 'AF' },
      'EG': { code: 'EG', name: 'Egypt', continent: 'AF' },
      'ER': { code: 'ER', name: 'Eritrea', continent: 'AF' },
      'ET': { code: 'ET', name: 'Ethiopia', continent: 'AF' },
      'GA': { code: 'GA', name: 'Gabon', continent: 'AF' },
      'GH': { code: 'GH', name: 'Ghana', continent: 'AF' },
      'GM': { code: 'GM', name: 'Gambia', continent: 'AF' },
      'GN': { code: 'GN', name: 'Guinea', continent: 'AF' },
      'GQ': { code: 'GQ', name: 'Equatorial Guinea', continent: 'AF' },
      'GW': { code: 'GW', name: 'Guinea-Bissau', continent: 'AF' },
      'KE': { code: 'KE', name: 'Kenya', continent: 'AF' },
      'LR': { code: 'LR', name: 'Liberia', continent: 'AF' },
      'LS': { code: 'LS', name: 'Lesotho', continent: 'AF' },
      'LY': { code: 'LY', name: 'Libya', continent: 'AF' },
      'MA': { code: 'MA', name: 'Morocco', continent: 'AF' },
      'MG': { code: 'MG', name: 'Madagascar', continent: 'AF' },
      'ML': { code: 'ML', name: 'Mali', continent: 'AF' },
      'MR': { code: 'MR', name: 'Mauritania', continent: 'AF' },
      'MU': { code: 'MU', name: 'Mauritius', continent: 'AF' },
      'MW': { code: 'MW', name: 'Malawi', continent: 'AF' },
      'MZ': { code: 'MZ', name: 'Mozambique', continent: 'AF' },
      'NA': { code: 'NA', name: 'Namibia', continent: 'AF' },
      'NE': { code: 'NE', name: 'Niger', continent: 'AF' },
      'NG': { code: 'NG', name: 'Nigeria', continent: 'AF' },
      'RW': { code: 'RW', name: 'Rwanda', continent: 'AF' },
      'SC': { code: 'SC', name: 'Seychelles', continent: 'AF' },
      'SD': { code: 'SD', name: 'Sudan', continent: 'AF' },
      'SL': { code: 'SL', name: 'Sierra Leone', continent: 'AF' },
      'SN': { code: 'SN', name: 'Senegal', continent: 'AF' },
      'SO': { code: 'SO', name: 'Somalia', continent: 'AF' },
      'SS': { code: 'SS', name: 'South Sudan', continent: 'AF' },
      'ST': { code: 'ST', name: 'São Tomé and Príncipe', continent: 'AF' },
      'SZ': { code: 'SZ', name: 'Eswatini', continent: 'AF' },
      'TD': { code: 'TD', name: 'Chad', continent: 'AF' },
      'TG': { code: 'TG', name: 'Togo', continent: 'AF' },
      'TN': { code: 'TN', name: 'Tunisia', continent: 'AF' },
      'TZ': { code: 'TZ', name: 'Tanzania', continent: 'AF' },
      'UG': { code: 'UG', name: 'Uganda', continent: 'AF' },
      'ZA': { code: 'ZA', name: 'South Africa', continent: 'AF' },
      'ZM': { code: 'ZM', name: 'Zambia', continent: 'AF' },
      'ZW': { code: 'ZW', name: 'Zimbabwe', continent: 'AF' },
      
      // Oceania
      'AU': { code: 'AU', name: 'Australia', continent: 'OC' },
      'FJ': { code: 'FJ', name: 'Fiji', continent: 'OC' },
      'FM': { code: 'FM', name: 'Micronesia', continent: 'OC' },
      'KI': { code: 'KI', name: 'Kiribati', continent: 'OC' },
      'MH': { code: 'MH', name: 'Marshall Islands', continent: 'OC' },
      'NR': { code: 'NR', name: 'Nauru', continent: 'OC' },
      'NZ': { code: 'NZ', name: 'New Zealand', continent: 'OC' },
      'PG': { code: 'PG', name: 'Papua New Guinea', continent: 'OC' },
      'PW': { code: 'PW', name: 'Palau', continent: 'OC' },
      'SB': { code: 'SB', name: 'Solomon Islands', continent: 'OC' },
      'TO': { code: 'TO', name: 'Tonga', continent: 'OC' },
      'TV': { code: 'TV', name: 'Tuvalu', continent: 'OC' },
      'VU': { code: 'VU', name: 'Vanuatu', continent: 'OC' },
      'WS': { code: 'WS', name: 'Samoa', continent: 'OC' },
      
      // Antartide
      'AQ': { code: 'AQ', name: 'Antarctica', continent: 'AN' }
    };
    
    // Aggiungi i paesi ai continenti
    for (const [code, country] of Object.entries(countryToContinentMap)) {
      const continent = this.continents[country.continent];
      if (continent) {
        continent.countries.push({
          code,
          name: country.name
        });
      }
    }
  }
  
  /**
   * Inizializza le regioni dell'Europa
   * @private
   */
  _initializeEuropeRegions() {
    this.continents['EU'].regions = [
      {
        code: 'EU_WEST',
        name: 'Western Europe',
        countries: ['BE', 'FR', 'IE', 'LU', 'MC', 'NL', 'GB']
      },
      {
        code: 'EU_EAST',
        name: 'Eastern Europe',
        countries: ['BG', 'BY', 'CZ', 'HU', 'MD', 'PL', 'RO', 'RU', 'SK', 'UA']
      },
      {
        code: 'EU_NORTH',
        name: 'Northern Europe',
        countries: ['DK', 'EE', 'FI', 'IS', 'LV', 'LT', 'NO', 'SE']
      },
      {
        code: 'EU_SOUTH',
        name: 'Southern Europe',
        countries: ['AD', 'AL', 'BA', 'CY', 'ES', 'GR', 'HR', 'IT', 'ME', 'MK', 'MT', 'PT', 'RS', 'SI', 'SM', 'VA']
      },
      {
        code: 'EU_CENTRAL',
        name: 'Central Europe',
        countries: ['AT', 'CH', 'DE', 'LI']
      }
    ];
  }
  
  /**
   * Inizializza le regioni del Nord America
   * @private
   */
  _initializeNorthAmericaRegions() {
    this.continents['NA'].regions = [
      {
        code: 'NA_NORTH',
        name: 'Northern America',
        countries: ['CA', 'US']
      },
      {
        code: 'NA_CENTRAL',
        name: 'Central America',
        countries: ['BZ', 'CR', 'GT', 'HN', 'MX', 'NI', 'PA', 'SV']
      },
      {
        code: 'NA_CARIBBEAN',
        name: 'Caribbean',
        countries: ['AG', 'BB', 'BS', 'CU', 'DM', 'DO', 'GD', 'HT', 'JM', 'KN', 'LC', 'VC']
      }
    ];
  }
  
  /**
   * Inizializza le regioni del Sud America
   * @private
   */
  _initializeSouthAmericaRegions() {
    this.continents['SA'].regions = [
      {
        code: 'SA_NORTH',
        name: 'Northern South America',
        countries: ['CO', 'EC', 'GY', 'SR', 'VE']
      },
      {
        code: 'SA_CENTRAL',
        name: 'Central South America',
        countries: ['BO', 'BR', 'PE']
      },
      {
        code: 'SA_SOUTH',
        name: 'Southern South America',
        countries: ['AR', 'CL', 'PY', 'UY']
      }
    ];
  }
  
  /**
   * Inizializza le regioni dell'Asia
   * @private
   */
  _initializeAsiaRegions() {
    this.continents['AS'].regions = [
      {
        code: 'AS_EAST',
        name: 'East Asia',
        countries: ['CN', 'HK', 'JP', 'KP', 'KR', 'MO', 'MN', 'TW']
      },
      {
        code: 'AS_SOUTH',
        name: 'South Asia',
        countries: ['AF', 'BD', 'BT', 'IN', 'LK', 'MV', 'NP', 'PK']
      },
      {
        code: 'AS_SOUTHEAST',
        name: 'Southeast Asia',
        countries: ['BN', 'ID', 'KH', 'LA', 'MM', 'MY', 'PH', 'SG', 'TH', 'TL', 'VN']
      },
      {
        code: 'AS_WEST',
        name: 'Western Asia',
        countries: ['AE', 'AM', 'AZ', 'BH', 'GE', 'IL', 'IQ', 'IR', 'JO', 'KW', 'LB', 'OM', 'PS', 'QA', 'SA', 'SY', 'TR', 'YE']
      },
      {
        code: 'AS_CENTRAL',
        name: 'Central Asia',
        countries: ['KG', 'KZ', 'TJ', 'TM', 'UZ']
      }
    ];
  }
  
  /**
   * Inizializza le regioni dell'Africa
   * @private
   */
  _initializeAfricaRegions() {
    this.continents['AF'].regions = [
      {
        code: 'AF_NORTH',
        name: 'Northern Africa',
        countries: ['DZ', 'EG', 'LY', 'MA', 'SD', 'TN']
      },
      {
        code: 'AF_WEST',
        name: 'Western Africa',
        countries: ['BF', 'BJ', 'CI', 'CV', 'GM', 'GH', 'GN', 'GW', 'LR', 'ML', 'MR', 'NE', 'NG', 'SL', 'SN', 'TG']
      },
      {
        code: 'AF_CENTRAL',
        name: 'Central Africa',
        countries: ['AO', 'CD', 'CF', 'CG', 'CM', 'GA', 'GQ', 'ST', 'TD']
      },
      {
        code: 'AF_EAST',
        name: 'Eastern Africa',
        countries: ['BI', 'DJ', 'ER', 'ET', 'KE', 'MG', 'MW', 'MZ', 'RW', 'SC', 'SO', 'SS', 'TZ', 'UG']
      },
      {
        code: 'AF_SOUTH',
        name: 'Southern Africa',
        countries: ['BW', 'LS', 'MU', 'NA', 'SZ', 'ZA', 'ZM', 'ZW']
      }
    ];
  }
  
  /**
   * Inizializza le regioni dell'Oceania
   * @private
   */
  _initializeOceaniaRegions() {
    this.continents['OC'].regions = [
      {
        code: 'OC_AUSTRALIA',
        name: 'Australia and New Zealand',
        countries: ['AU', 'NZ']
      },
      {
        code: 'OC_MELANESIA',
        name: 'Melanesia',
        countries: ['FJ', 'PG', 'SB', 'VU']
      },
      {
        code: 'OC_MICRONESIA',
        name: 'Micronesia',
        countries: ['FM', 'KI', 'MH', 'NR', 'PW']
      },
      {
        code: 'OC_POLYNESIA',
        name: 'Polynesia',
        countries: ['TO', 'TV', 'WS']
      }
    ];
  }
}

// Esporta la classe
module.exports = RegionManager;
