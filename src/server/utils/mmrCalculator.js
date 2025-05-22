// server/utils/mmrCalculator.js - Utility per il calcolo delle variazioni di MMR

/**
 * Classe per il calcolo delle variazioni di MMR nei match competitivi
 * Utilizza una variante del sistema Elo adattata per i giochi a squadre
 */
class MmrCalculator {
  constructor() {
    // Fattori K per le diverse modalità (determina quanto velocemente cambia l'MMR)
    this.kFactors = {
      '1v1': 32,
      '2v2': 24,
      '3v3': 20
    };
    
    // MMR minimo e massimo
    this.minMmr = 500;
    this.maxMmr = 4000;
    
    // Fattore di protezione per i nuovi giocatori (< 10 partite)
    this.newPlayerProtectionFactor = 0.5;
  }
  
  /**
   * Calcola la variazione di MMR per un giocatore
   * @param {number} playerMmr - MMR attuale del giocatore
   * @param {number} opponentMmr - MMR medio degli avversari
   * @param {number} result - Risultato (1 = vittoria, 0.5 = pareggio, 0 = sconfitta)
   * @param {string} mode - Modalità di gioco ('1v1', '2v2', '3v3')
   * @param {number} gamesPlayed - Numero di partite giocate dal giocatore
   * @return {number} - Variazione di MMR (positiva o negativa)
   */
  calculateMmrChange(playerMmr, opponentMmr, result, mode, gamesPlayed = 10) {
    // Ottieni il fattore K appropriato per la modalità
    const kFactor = this.kFactors[mode] || this.kFactors['1v1'];
    
    // Calcola la probabilità di vittoria attesa
    const expectedResult = this.getExpectedResult(playerMmr, opponentMmr);
    
    // Calcola la variazione di MMR base
    let mmrChange = kFactor * (result - expectedResult);
    
    // Applica il fattore di protezione per i nuovi giocatori
    if (gamesPlayed < 10) {
      // Aumenta il guadagno di MMR per le vittorie e riduce la perdita per le sconfitte
      if (mmrChange > 0) {
        mmrChange *= (1 + this.newPlayerProtectionFactor);
      } else {
        mmrChange *= (1 - this.newPlayerProtectionFactor);
      }
    }
    
    // Arrotonda a un numero intero
    mmrChange = Math.round(mmrChange);
    
    // Assicura che l'MMR finale sia entro i limiti
    const newMmr = playerMmr + mmrChange;
    if (newMmr < this.minMmr) {
      mmrChange = this.minMmr - playerMmr;
    } else if (newMmr > this.maxMmr) {
      mmrChange = this.maxMmr - playerMmr;
    }
    
    return mmrChange;
  }
  
  /**
   * Calcola il risultato atteso in base alla differenza di MMR
   * @param {number} playerMmr - MMR del giocatore
   * @param {number} opponentMmr - MMR dell'avversario
   * @return {number} - Probabilità di vittoria (tra 0 e 1)
   */
  getExpectedResult(playerMmr, opponentMmr) {
    return 1 / (1 + Math.pow(10, (opponentMmr - playerMmr) / 400));
  }
  
  /**
   * Calcola l'MMR iniziale per un nuovo giocatore
   * @param {number} performanceRating - Valutazione delle prestazioni nelle partite di posizionamento
   * @return {number} - MMR iniziale
   */
  calculateInitialMmr(performanceRating) {
    // performanceRating dovrebbe essere un valore tra 0 e 10
    // 0 = pessimo, 10 = eccellente
    
    // MMR base per un nuovo giocatore
    const baseMmr = 1000;
    
    // Calcola l'MMR iniziale in base alle prestazioni
    const initialMmr = baseMmr + (performanceRating - 5) * 50;
    
    // Assicura che l'MMR sia entro i limiti
    return Math.max(this.minMmr, Math.min(this.maxMmr, initialMmr));
  }
  
  /**
   * Calcola il rango in base all'MMR
   * @param {number} mmr - MMR del giocatore
   * @return {Object} - Oggetto contenente nome del rango, tier e colore
   */
  calculateRank(mmr) {
    if (mmr < 1000) return { name: 'Bronzo', tier: 1, color: '#cd7f32' };
    if (mmr < 1200) return { name: 'Bronzo', tier: 2, color: '#cd7f32' };
    if (mmr < 1400) return { name: 'Bronzo', tier: 3, color: '#cd7f32' };
    if (mmr < 1600) return { name: 'Argento', tier: 1, color: '#c0c0c0' };
    if (mmr < 1800) return { name: 'Argento', tier: 2, color: '#c0c0c0' };
    if (mmr < 2000) return { name: 'Argento', tier: 3, color: '#c0c0c0' };
    if (mmr < 2200) return { name: 'Oro', tier: 1, color: '#ffd700' };
    if (mmr < 2400) return { name: 'Oro', tier: 2, color: '#ffd700' };
    if (mmr < 2600) return { name: 'Oro', tier: 3, color: '#ffd700' };
    if (mmr < 2800) return { name: 'Platino', tier: 1, color: '#e5e4e2' };
    if (mmr < 3000) return { name: 'Platino', tier: 2, color: '#e5e4e2' };
    if (mmr < 3200) return { name: 'Platino', tier: 3, color: '#e5e4e2' };
    if (mmr < 3400) return { name: 'Diamante', tier: 1, color: '#b9f2ff' };
    if (mmr < 3600) return { name: 'Diamante', tier: 2, color: '#b9f2ff' };
    if (mmr < 3800) return { name: 'Diamante', tier: 3, color: '#b9f2ff' };
    return { name: 'Campione', tier: 1, color: '#ff4500' };
  }
}

module.exports = new MmrCalculator();
