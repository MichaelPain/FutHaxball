/**
 * Configurazione per il sistema di tornei
 */

module.exports = {
  // Configurazione del database
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/haxball-clone',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true
    }
  },
  
  // Configurazione JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'your_jwt_secret',
    expiresIn: '7d'
  },
  
  // Configurazione email
  email: {
    service: process.env.EMAIL_SERVICE || 'gmail',
    user: process.env.EMAIL_USER || 'test@example.com',
    password: process.env.EMAIL_PASSWORD || 'password',
    from: process.env.EMAIL_FROM || 'HaxBall Clone <noreply@haxballclone.com>'
  },
  
  // Configurazione del sistema di tornei
  tournaments: {
    // Formati di torneo supportati
    formats: ['single_elimination', 'double_elimination', 'round_robin', 'swiss', 'multi_stage'],
    
    // Tipi di torneo supportati
    types: ['standard', 'event', 'championship'],
    
    // Configurazione delle ricompense
    rewards: {
      types: ['badge', 'title', 'cosmetic', 'points', 'currency', 'custom'],
      rarities: ['common', 'uncommon', 'rare', 'epic', 'legendary']
    },
    
    // Configurazione della geolocalizzazione
    geolocation: {
      apiKey: process.env.GEOLOCATION_API_KEY || 'your_geolocation_api_key',
      defaultCountry: 'IT',
      continents: ['EU', 'NA', 'SA', 'AS', 'AF', 'OC', 'AN']
    }
  },
  
  // Configurazione del test
  test: {
    dbUri: 'mongodb://localhost:27017/haxball-clone-test'
  }
};
