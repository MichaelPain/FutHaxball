// models/User.js - Schema del modello utente per MongoDB

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
    nickname: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 3,
        maxlength: 20
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    verificationToken: String,
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    createdAt: {
        type: Date,
        default: Date.now
    },
    lastLogin: Date,
    stats: {
        gamesPlayed: {
            type: Number,
            default: 0
        },
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
        goals: {
            type: Number,
            default: 0
        },
        assists: {
            type: Number,
            default: 0
        },
        cleanSheets: {
            type: Number,
            default: 0
        }
    },
    ranking: {
        solo: {
            mmr: {
                type: Number,
                default: 1000
            },
            rank: {
                type: Number,
                default: 0
            },
            gamesPlayed: {
                type: Number,
                default: 0
            },
            wins: {
                type: Number,
                default: 0
            },
            losses: {
                type: Number,
                default: 0
            }
        },
        doubles: {
            mmr: {
                type: Number,
                default: 1000
            },
            rank: {
                type: Number,
                default: 0
            },
            gamesPlayed: {
                type: Number,
                default: 0
            },
            wins: {
                type: Number,
                default: 0
            },
            losses: {
                type: Number,
                default: 0
            }
        },
        team: {
            mmr: {
                type: Number,
                default: 1000
            },
            rank: {
                type: Number,
                default: 0
            },
            gamesPlayed: {
                type: Number,
                default: 0
            },
            wins: {
                type: Number,
                default: 0
            },
            losses: {
                type: Number,
                default: 0
            }
        }
    },
    penalties: {
        isSuspended: {
            type: Boolean,
            default: false
        },
        suspensionEndDate: Date,
        suspensionReason: String,
        warnings: {
            type: Number,
            default: 0
        },
        disconnects: {
            type: Number,
            default: 0
        }
    }
});

// Pre-save hook per hashare la password
UserSchema.pre('save', async function(next) {
    // Solo se la password è stata modificata o è nuova
    if (!this.isModified('password')) return next();
    
    try {
        // Genera un salt
        const salt = await bcrypt.genSalt(10);
        // Hasha la password con il salt
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Metodo per verificare la password
UserSchema.methods.comparePassword = async function(candidatePassword) {
    try {
        return await bcrypt.compare(candidatePassword, this.password);
    } catch (error) {
        throw error;
    }
};

// Metodo per aggiornare le statistiche dopo una partita
UserSchema.methods.updateStats = function(gameResult) {
    // Aggiorna le statistiche generali
    this.stats.gamesPlayed++;
    
    if (gameResult.result === 'win') {
        this.stats.wins++;
    } else if (gameResult.result === 'loss') {
        this.stats.losses++;
    } else {
        this.stats.draws++;
    }
    
    this.stats.goals += gameResult.goals || 0;
    this.stats.assists += gameResult.assists || 0;
    
    if (gameResult.cleanSheet) {
        this.stats.cleanSheets++;
    }
    
    // Aggiorna le statistiche di ranking in base alla modalità
    const rankingMode = gameResult.mode === '1v1' ? 'solo' : 
                        gameResult.mode === '2v2' ? 'doubles' : 'team';
    
    this.ranking[rankingMode].gamesPlayed++;
    
    if (gameResult.result === 'win') {
        this.ranking[rankingMode].wins++;
    } else if (gameResult.result === 'loss') {
        this.ranking[rankingMode].losses++;
    }
    
    // Aggiorna l'MMR
    this.ranking[rankingMode].mmr += gameResult.mmrChange || 0;
    
    return this.save();
};

// Metodo per registrare una disconnessione
UserSchema.methods.registerDisconnect = function(wasRanked) {
    this.penalties.disconnects++;
    
    // Se ci sono troppe disconnessioni, applica una sospensione
    if (this.penalties.disconnects >= 3 && wasRanked) {
        this.penalties.isSuspended = true;
        this.penalties.suspensionEndDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 ore
        this.penalties.suspensionReason = 'Troppe disconnessioni da partite ranked';
    }
    
    return this.save();
};

module.exports = mongoose.model('User', UserSchema);
