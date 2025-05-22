// utils/tournamentUtils.js - Utilità per la gestione dei tornei

/**
 * Funzioni di utilità per la gestione dei tornei nel clone di HaxBall
 */

/**
 * Genera un bracket per un torneo ad eliminazione diretta
 * @param {Array} participants - Array di partecipanti
 * @returns {Object} Struttura del bracket
 */
exports.generateBracket = (participants) => {
    const numParticipants = participants.length;
    const rounds = Math.ceil(Math.log2(numParticipants));
    const totalMatches = Math.pow(2, rounds) - 1;
    
    // Inizializza il bracket
    const bracket = {
        rounds: rounds,
        matches: []
    };
    
    // Crea le partite del primo round
    const firstRoundMatches = Math.pow(2, rounds - 1);
    const byes = Math.pow(2, rounds) - numParticipants;
    
    for (let i = 0; i < firstRoundMatches; i++) {
        if (i < byes) {
            // Bye (partecipante passa automaticamente al round successivo)
            bracket.matches.push({
                round: 1,
                match: i + 1,
                participant1: i < numParticipants ? participants[i] : null,
                participant2: null,
                winner: i < numParticipants ? participants[i] : null,
                isBye: true
            });
        } else {
            // Partita normale
            bracket.matches.push({
                round: 1,
                match: i + 1,
                participant1: i < numParticipants ? participants[i] : null,
                participant2: (totalMatches - i) < numParticipants ? participants[totalMatches - i] : null,
                winner: null,
                isBye: false
            });
        }
    }
    
    // Crea le partite dei round successivi
    let matchIndex = firstRoundMatches;
    for (let round = 2; round <= rounds; round++) {
        const roundMatches = Math.pow(2, rounds - round);
        for (let i = 0; i < roundMatches; i++) {
            bracket.matches.push({
                round: round,
                match: i + 1,
                participant1: null,
                participant2: null,
                winner: null,
                isBye: false
            });
            matchIndex++;
        }
    }
    
    return bracket;
};

/**
 * Aggiorna il bracket dopo una partita
 * @param {Object} bracket - Struttura del bracket
 * @param {Number} round - Numero del round
 * @param {Number} match - Numero della partita
 * @param {Object} winner - Vincitore della partita
 * @returns {Object} Bracket aggiornato
 */
exports.updateBracket = (bracket, round, match, winner) => {
    // Trova la partita corrente
    const currentMatch = bracket.matches.find(m => m.round === round && m.match === match);
    if (!currentMatch) return bracket;
    
    // Aggiorna il vincitore
    currentMatch.winner = winner;
    
    // Se non è l'ultima partita, aggiorna la partita successiva
    if (round < bracket.rounds) {
        const nextRound = round + 1;
        const nextMatch = Math.ceil(match / 2);
        const nextMatchIndex = bracket.matches.findIndex(m => m.round === nextRound && m.match === nextMatch);
        
        if (nextMatchIndex !== -1) {
            // Determina se il vincitore va in participant1 o participant2
            if (match % 2 === 1) {
                bracket.matches[nextMatchIndex].participant1 = winner;
            } else {
                bracket.matches[nextMatchIndex].participant2 = winner;
            }
        }
    }
    
    return bracket;
};

/**
 * Genera un calendario per un torneo a gironi
 * @param {Array} groups - Array di gruppi, ciascuno con un array di partecipanti
 * @returns {Object} Calendario delle partite
 */
exports.generateGroupSchedule = (groups) => {
    const schedule = [];
    
    groups.forEach((group, groupIndex) => {
        const participants = group.participants;
        const numParticipants = participants.length;
        
        // Algoritmo round-robin per generare le partite
        for (let round = 0; round < numParticipants - 1; round++) {
            const roundMatches = [];
            
            for (let i = 0; i < numParticipants / 2; i++) {
                const participant1 = i;
                const participant2 = numParticipants - 1 - i;
                
                // Evita partite con se stessi
                if (participant1 !== participant2) {
                    roundMatches.push({
                        group: groupIndex + 1,
                        round: round + 1,
                        participant1: participants[participant1],
                        participant2: participants[participant2],
                        result: null
                    });
                }
            }
            
            schedule.push({
                round: round + 1,
                matches: roundMatches
            });
            
            // Ruota i partecipanti per il prossimo round (il primo rimane fisso)
            participants.splice(1, 0, participants.pop());
        }
    });
    
    return schedule;
};

/**
 * Calcola la classifica di un girone
 * @param {Array} matches - Array di partite del girone
 * @param {Array} participants - Array di partecipanti
 * @returns {Array} Classifica ordinata
 */
exports.calculateGroupStandings = (matches, participants) => {
    const standings = participants.map(participant => ({
        participant: participant,
        points: 0,
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0
    }));
    
    // Calcola i punti per ogni partecipante
    matches.forEach(match => {
        if (match.result) {
            const { participant1, participant2, result } = match;
            const p1Index = standings.findIndex(s => s.participant.id === participant1.id);
            const p2Index = standings.findIndex(s => s.participant.id === participant2.id);
            
            if (p1Index !== -1 && p2Index !== -1) {
                // Aggiorna le statistiche del primo partecipante
                standings[p1Index].played++;
                standings[p1Index].goalsFor += result.score1;
                standings[p1Index].goalsAgainst += result.score2;
                
                // Aggiorna le statistiche del secondo partecipante
                standings[p2Index].played++;
                standings[p2Index].goalsFor += result.score2;
                standings[p2Index].goalsAgainst += result.score1;
                
                if (result.score1 > result.score2) {
                    // Vittoria del primo partecipante
                    standings[p1Index].points += 3;
                    standings[p1Index].wins++;
                    standings[p2Index].losses++;
                } else if (result.score1 < result.score2) {
                    // Vittoria del secondo partecipante
                    standings[p2Index].points += 3;
                    standings[p2Index].wins++;
                    standings[p1Index].losses++;
                } else {
                    // Pareggio
                    standings[p1Index].points += 1;
                    standings[p2Index].points += 1;
                    standings[p1Index].draws++;
                    standings[p2Index].draws++;
                }
            }
        }
    });
    
    // Calcola la differenza reti
    standings.forEach(standing => {
        standing.goalDifference = standing.goalsFor - standing.goalsAgainst;
    });
    
    // Ordina la classifica
    return standings.sort((a, b) => {
        // Ordina per punti
        if (a.points !== b.points) return b.points - a.points;
        
        // Se i punti sono uguali, ordina per differenza reti
        if (a.goalDifference !== b.goalDifference) return b.goalDifference - a.goalDifference;
        
        // Se la differenza reti è uguale, ordina per gol fatti
        if (a.goalsFor !== b.goalsFor) return b.goalsFor - a.goalsFor;
        
        // Se tutto è uguale, ordina alfabeticamente
        return a.participant.name.localeCompare(b.participant.name);
    });
};
