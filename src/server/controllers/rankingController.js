// controllers/rankingController.js - Controller per le classifiche competitive

const User = require('../models/User');
const Match = require('../models/Match');

// Costanti per il calcolo dell'MMR
const K_FACTOR = 32; // Fattore K per l'algoritmo Elo
const BASE_MMR = 1000; // MMR di base per i nuovi giocatori
const MIN_GAMES_FOR_RANK = 10; // Numero minimo di partite per essere classificati

// Ottieni la classifica per una modalità specifica
exports.getRanking = async (req, res) => {
    try {
        const { mode } = req.params;
        
        // Verifica che la modalità sia valida
        if (!['solo', 'doubles', 'team'].includes(mode)) {
            return res.status(400).json({ message: 'Modalità non valida' });
        }
        
        // Ottieni i primi 100 giocatori classificati
        const users = await User.find({
            [`ranking.${mode}.gamesPlayed`]: { $gte: MIN_GAMES_FOR_RANK }
        })
        .sort({ [`ranking.${mode}.mmr`]: -1 })
        .limit(100)
        .select(`nickname ranking.${mode}`);
        
        // Formatta i risultati
        const rankings = users.map((user, index) => ({
            rank: index + 1,
            nickname: user.nickname,
            mmr: user.ranking[mode].mmr,
            gamesPlayed: user.ranking[mode].gamesPlayed,
            wins: user.ranking[mode].wins,
            losses: user.ranking[mode].losses,
            winRate: user.ranking[mode].gamesPlayed > 0 
                ? (user.ranking[mode].wins / user.ranking[mode].gamesPlayed * 100).toFixed(1) 
                : 0
        }));
        
        res.status(200).json(rankings);
    } catch (error) {
        console.error('Errore nel recupero della classifica:', error);
        res.status(500).json({ message: 'Errore del server' });
    }
};

// Ottieni la posizione in classifica di un giocatore specifico
exports.getPlayerRanking = async (req, res) => {
    try {
        const { userId, mode } = req.params;
        
        // Verifica che la modalità sia valida
        if (!['solo', 'doubles', 'team'].includes(mode)) {
            return res.status(400).json({ message: 'Modalità non valida' });
        }
        
        // Ottieni l'utente
        const user = await User.findById(userId).select(`nickname ranking.${mode}`);
        if (!user) {
            return res.status(404).json({ message: 'Utente non trovato' });
        }
        
        // Verifica se l'utente ha giocato abbastanza partite
        if (user.ranking[mode].gamesPlayed < MIN_GAMES_FOR_RANK) {
            return res.status(200).json({
                nickname: user.nickname,
                mmr: user.ranking[mode].mmr,
                gamesPlayed: user.ranking[mode].gamesPlayed,
                wins: user.ranking[mode].wins,
                losses: user.ranking[mode].losses,
                winRate: user.ranking[mode].gamesPlayed > 0 
                    ? (user.ranking[mode].wins / user.ranking[mode].gamesPlayed * 100).toFixed(1) 
                    : 0,
                rank: null,
                message: `Sono necessarie almeno ${MIN_GAMES_FOR_RANK} partite per essere classificati`
            });
        }
        
        // Conta quanti giocatori hanno un MMR più alto
        const higherRankedCount = await User.countDocuments({
            [`ranking.${mode}.mmr`]: { $gt: user.ranking[mode].mmr },
            [`ranking.${mode}.gamesPlayed`]: { $gte: MIN_GAMES_FOR_RANK }
        });
        
        // La posizione è il numero di giocatori con MMR più alto + 1
        const rank = higherRankedCount + 1;
        
        res.status(200).json({
            nickname: user.nickname,
            mmr: user.ranking[mode].mmr,
            gamesPlayed: user.ranking[mode].gamesPlayed,
            wins: user.ranking[mode].wins,
            losses: user.ranking[mode].losses,
            winRate: user.ranking[mode].gamesPlayed > 0 
                ? (user.ranking[mode].wins / user.ranking[mode].gamesPlayed * 100).toFixed(1) 
                : 0,
            rank
        });
    } catch (error) {
        console.error('Errore nel recupero della posizione in classifica:', error);
        res.status(500).json({ message: 'Errore del server' });
    }
};

// Ottieni le statistiche di un giocatore
exports.getPlayerStats = async (req, res) => {
    try {
        const { userId } = req.params;
        
        // Ottieni l'utente
        const user = await User.findById(userId).select('nickname stats ranking');
        if (!user) {
            return res.status(404).json({ message: 'Utente non trovato' });
        }
        
        // Ottieni le ultime 10 partite del giocatore
        const recentMatches = await Match.find({
            $or: [
                { 'redTeam.userId': userId },
                { 'blueTeam.userId': userId }
            ],
            status: 'completed'
        })
        .sort({ endTime: -1 })
        .limit(10)
        .select('mode type score winner redTeam blueTeam startTime endTime');
        
        // Formatta le partite recenti
        const formattedMatches = recentMatches.map(match => {
            // Determina in quale squadra era il giocatore
            const inRedTeam = match.redTeam.some(p => p.userId.toString() === userId);
            const team = inRedTeam ? 'red' : 'blue';
            const opposingTeam = inRedTeam ? 'blue' : 'red';
            
            // Determina se ha vinto
            const result = match.winner === team ? 'win' : match.winner === opposingTeam ? 'loss' : 'draw';
            
            // Trova i dati del giocatore
            const playerData = inRedTeam 
                ? match.redTeam.find(p => p.userId.toString() === userId)
                : match.blueTeam.find(p => p.userId.toString() === userId);
            
            return {
                matchId: match._id,
                mode: match.mode,
                type: match.type,
                result,
                score: {
                    team: inRedTeam ? match.score.red : match.score.blue,
                    opponent: inRedTeam ? match.score.blue : match.score.red
                },
                stats: {
                    goals: playerData.goals || 0,
                    assists: playerData.assists || 0,
                    mmrChange: playerData.mmrChange || 0
                },
                date: match.endTime
            };
        });
        
        // Calcola le statistiche aggiuntive
        const winRate = user.stats.gamesPlayed > 0 
            ? (user.stats.wins / user.stats.gamesPlayed * 100).toFixed(1) 
            : 0;
        
        const soloWinRate = user.ranking.solo.gamesPlayed > 0 
            ? (user.ranking.solo.wins / user.ranking.solo.gamesPlayed * 100).toFixed(1) 
            : 0;
        
        const doublesWinRate = user.ranking.doubles.gamesPlayed > 0 
            ? (user.ranking.doubles.wins / user.ranking.doubles.gamesPlayed * 100).toFixed(1) 
            : 0;
        
        const teamWinRate = user.ranking.team.gamesPlayed > 0 
            ? (user.ranking.team.wins / user.ranking.team.gamesPlayed * 100).toFixed(1) 
            : 0;
        
        res.status(200).json({
            nickname: user.nickname,
            stats: {
                ...user.stats,
                winRate
            },
            ranking: {
                solo: {
                    ...user.ranking.solo,
                    winRate: soloWinRate
                },
                doubles: {
                    ...user.ranking.doubles,
                    winRate: doublesWinRate
                },
                team: {
                    ...user.ranking.team,
                    winRate: teamWinRate
                }
            },
            recentMatches: formattedMatches
        });
    } catch (error) {
        console.error('Errore nel recupero delle statistiche:', error);
        res.status(500).json({ message: 'Errore del server' });
    }
};

// Aggiorna l'MMR dopo una partita
exports.updateMMR = async (matchId) => {
    try {
        // Ottieni la partita
        const match = await Match.findOne({ matchId });
        if (!match || match.status !== 'completed') {
            return;
        }
        
        // Determina la modalità di ranking
        let rankingMode;
        switch (match.mode) {
            case '1v1':
                rankingMode = 'solo';
                break;
            case '2v2':
                rankingMode = 'doubles';
                break;
            default:
                rankingMode = 'team';
        }
        
        // Calcola l'MMR medio di ogni squadra
        const redTeamMMR = match.redTeam.reduce((sum, player) => sum + player.mmrBefore, 0) / match.redTeam.length;
        const blueTeamMMR = match.blueTeam.reduce((sum, player) => sum + player.mmrBefore, 0) / match.blueTeam.length;
        
        // Calcola il risultato (1 per vittoria, 0.5 per pareggio, 0 per sconfitta)
        let redTeamResult, blueTeamResult;
        
        if (match.winner === 'red') {
            redTeamResult = 1;
            blueTeamResult = 0;
        } else if (match.winner === 'blue') {
            redTeamResult = 0;
            blueTeamResult = 1;
        } else {
            redTeamResult = 0.5;
            blueTeamResult = 0.5;
        }
        
        // Calcola la probabilità di vittoria attesa
        const redTeamExpected = 1 / (1 + Math.pow(10, (blueTeamMMR - redTeamMMR) / 400));
        const blueTeamExpected = 1 / (1 + Math.pow(10, (redTeamMMR - blueTeamMMR) / 400));
        
        // Calcola la variazione di MMR
        const redTeamMMRChange = Math.round(K_FACTOR * (redTeamResult - redTeamExpected));
        const blueTeamMMRChange = Math.round(K_FACTOR * (blueTeamResult - blueTeamExpected));
        
        // Aggiorna l'MMR di ogni giocatore
        for (const player of match.redTeam) {
            const user = await User.findById(player.userId);
            if (user) {
                // Aggiorna l'MMR
                user.ranking[rankingMode].mmr += redTeamMMRChange;
                
                // Aggiorna le statistiche
                user.ranking[rankingMode].gamesPlayed++;
                if (match.winner === 'red') {
                    user.ranking[rankingMode].wins++;
                } else if (match.winner === 'blue') {
                    user.ranking[rankingMode].losses++;
                }
                
                // Salva le modifiche
                await user.save();
                
                // Aggiorna i dati della partita
                player.mmrAfter = user.ranking[rankingMode].mmr;
                player.mmrChange = redTeamMMRChange;
            }
        }
        
        for (const player of match.blueTeam) {
            const user = await User.findById(player.userId);
            if (user) {
                // Aggiorna l'MMR
                user.ranking[rankingMode].mmr += blueTeamMMRChange;
                
                // Aggiorna le statistiche
                user.ranking[rankingMode].gamesPlayed++;
                if (match.winner === 'blue') {
                    user.ranking[rankingMode].wins++;
                } else if (match.winner === 'red') {
                    user.ranking[rankingMode].losses++;
                }
                
                // Salva le modifiche
                await user.save();
                
                // Aggiorna i dati della partita
                player.mmrAfter = user.ranking[rankingMode].mmr;
                player.mmrChange = blueTeamMMRChange;
            }
        }
        
        // Salva le modifiche alla partita
        await match.save();
    } catch (error) {
        console.error('Errore nell\'aggiornamento dell\'MMR:', error);
    }
};

// Esporta le classifiche in formato CSV/JSON
exports.exportRankings = async (req, res) => {
    try {
        const { format, mode } = req.params;
        
        // Verifica che la modalità sia valida
        if (!['solo', 'doubles', 'team'].includes(mode)) {
            return res.status(400).json({ message: 'Modalità non valida' });
        }
        
        // Verifica che il formato sia valido
        if (!['csv', 'json'].includes(format)) {
            return res.status(400).json({ message: 'Formato non valido' });
        }
        
        // Ottieni tutti i giocatori classificati
        const users = await User.find({
            [`ranking.${mode}.gamesPlayed`]: { $gte: MIN_GAMES_FOR_RANK }
        })
        .sort({ [`ranking.${mode}.mmr`]: -1 })
        .select(`nickname ranking.${mode}`);
        
        // Formatta i risultati
        const rankings = users.map((user, index) => ({
            rank: index + 1,
            nickname: user.nickname,
            mmr: user.ranking[mode].mmr,
            gamesPlayed: user.ranking[mode].gamesPlayed,
            wins: user.ranking[mode].wins,
            losses: user.ranking[mode].losses,
            winRate: user.ranking[mode].gamesPlayed > 0 
                ? (user.ranking[mode].wins / user.ranking[mode].gamesPlayed * 100).toFixed(1) 
                : 0
        }));
        
        if (format === 'json') {
            // Restituisci i dati in formato JSON
            res.status(200).json(rankings);
        } else {
            // Restituisci i dati in formato CSV
            const fields = ['rank', 'nickname', 'mmr', 'gamesPlayed', 'wins', 'losses', 'winRate'];
            const csv = [
                fields.join(','),
                ...rankings.map(r => fields.map(f => r[f]).join(','))
            ].join('\n');
            
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=rankings_${mode}_${Date.now()}.csv`);
            res.status(200).send(csv);
        }
    } catch (error) {
        console.error('Errore nell\'esportazione delle classifiche:', error);
        res.status(500).json({ message: 'Errore del server' });
    }
};

// Aggiorna le posizioni in classifica di tutti i giocatori
exports.updateRankings = async () => {
    try {
        const modes = ['solo', 'doubles', 'team'];
        
        for (const mode of modes) {
            // Ottieni tutti i giocatori classificati
            const users = await User.find({
                [`ranking.${mode}.gamesPlayed`]: { $gte: MIN_GAMES_FOR_RANK }
            })
            .sort({ [`ranking.${mode}.mmr`]: -1 });
            
            // Aggiorna la posizione in classifica di ogni giocatore
            for (let i = 0; i < users.length; i++) {
                const user = users[i];
                user.ranking[mode].rank = i + 1;
                await user.save();
            }
        }
    } catch (error) {
        console.error('Errore nell\'aggiornamento delle classifiche:', error);
    }
};

// Aggiorna le classifiche ogni giorno
setInterval(exports.updateRankings, 24 * 60 * 60 * 1000);
