// test/testConfig.js - Configurazione per i test

module.exports = {
  // Configurazione del database di test
  dbConfig: {
    url: 'mongodb://localhost:27017/haxball-clone-test',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true
    }
  },
  
  // Configurazione del server di test
  serverConfig: {
    port: 3001
  },
  
  // Utenti di test
  testUsers: [
    {
      nickname: 'TestPlayer1',
      email: 'test1@example.com',
      password: 'password123'
    },
    {
      nickname: 'TestPlayer2',
      email: 'test2@example.com',
      password: 'password123'
    },
    {
      nickname: 'TestPlayer3',
      email: 'test3@example.com',
      password: 'password123'
    },
    {
      nickname: 'TestPlayer4',
      email: 'test4@example.com',
      password: 'password123'
    }
  ]
};
