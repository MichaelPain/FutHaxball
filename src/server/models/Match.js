// server/models/Match.js - Modello per i match competitivi

const mongoose = require('mongoose');

const MatchSchema = new mongoose.Schema({
  mode: {
    type: String,
    enum: ['1v1', '2v2', '3v3'],
    required: true
  },
  players: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    team: {
      type: Number,
      enum: [0, 1], // 0 = Rosso, 1 = Blu
      required: true
    },
    startingMmr: {
      type: Number,
      required: true
    },
    endingMmr: {
      type: Number
    },
    mmrChange: {
      type: Number
    },
    goals: {
      type: Number,
      default: 0
    },
    assists: {
      type: Number,
      default: 0
    },
    ownGoals: {
      type: Number,
      default: 0
    },
    touches: {
      type: Number,
      default: 0
    },
    kicks: {
      type: Number,
      default: 0
    },
    possession: {
      type: Number,
      default: 0
    },
    disconnected: {
      type: Boolean,
      default: false
    }
  }],
  teamScores: {
    0: { // Rosso
      type: Number,
      default: 0
    },
    1: { // Blu
      type: Number,
      default: 0
    }
  },
  winningTeam: {
    type: Number,
    enum: [0, 1, null], // 0 = Rosso, 1 = Blu, null = Pareggio
    default: null
  },
  duration: {
    type: Number, // Durata in secondi
    default: 0
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  cancelReason: {
    type: String,
    enum: ['player_disconnected', 'server_error', 'admin_cancelled']
  },
  map: {
    type: String,
    default: 'standard'
  },
  replayUrl: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  startedAt: {
    type: Date
  },
  endedAt: {
    type: Date
  }
});

// Indici per migliorare le performance delle query
MatchSchema.index({ mode: 1, status: 1 });
MatchSchema.index({ 'players.user': 1 });
MatchSchema.index({ createdAt: -1 });

// Metodo per calcolare le statistiche del match
MatchSchema.methods.calculateStats = function() {
  // Calcola la durata del match
  if (this.startedAt && this.endedAt) {
    this.duration = Math.floor((this.endedAt - this.startedAt) / 1000);
  }

  // Calcola il team vincente
  if (this.teamScores[0] > this.teamScores[1]) {
    this.winningTeam = 0;
  } else if (this.teamScores[1] > this.teamScores[0]) {
    this.winningTeam = 1;
  } else {
    this.winningTeam = null;
  }

  return this;
};

// Metodo per aggiornare l'MMR dei giocatori
MatchSchema.methods.updatePlayerMmr = async function(mmrCalculator) {
  // Raggruppa i giocatori per team
  const teams = [
    this.players.filter(p => p.team === 0),
    this.players.filter(p => p.team === 1)
  ];

  // Calcola l'MMR medio di ogni team
  const teamMmrs = teams.map(team => 
    team.reduce((sum, player) => sum + player.startingMmr, 0) / team.length
  );

  // Determina il risultato per ogni team (1 = vittoria, 0.5 = pareggio, 0 = sconfitta)
  let results;
  if (this.winningTeam === 0) {
    results = [1, 0];
  } else if (this.winningTeam === 1) {
    results = [0, 1];
  } else {
    results = [0.5, 0.5];
  }

  // Aggiorna l'MMR di ogni giocatore
  for (let t = 0; t < teams.length; t++) {
    for (let i = 0; i < teams[t].length; i++) {
      const player = teams[t][i];
      const opponentTeamMmr = teamMmrs[1 - t];
      const result = results[t];

      // Calcola la variazione di MMR
      const mmrChange = mmrCalculator.calculateMmrChange(
        player.startingMmr,
        opponentTeamMmr,
        result,
        this.mode
      );

      // Aggiorna i valori nel documento
      player.mmrChange = mmrChange;
      player.endingMmr = player.startingMmr + mmrChange;
    }
  }

  return this;
};

// Metodo per ottenere un riepilogo del match
MatchSchema.methods.getSummary = function() {
  return {
    id: this._id,
    mode: this.mode,
    teams: {
      0: {
        score: this.teamScores[0],
        players: this.players
          .filter(p => p.team === 0)
          .map(p => ({
            id: p.user,
            goals: p.goals,
            assists: p.assists,
            mmrChange: p.mmrChange
          }))
      },
      1: {
        score: this.teamScores[1],
        players: this.players
          .filter(p => p.team === 1)
          .map(p => ({
            id: p.user,
            goals: p.goals,
            assists: p.assists,
            mmrChange: p.mmrChange
          }))
      }
    },
    winningTeam: this.winningTeam,
    duration: this.duration,
    createdAt: this.createdAt,
    startedAt: this.startedAt,
    endedAt: this.endedAt
  };
};

module.exports = mongoose.model('Match', MatchSchema);
