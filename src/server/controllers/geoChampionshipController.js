/**
 * GeoChampionshipController.js - Controller per la gestione dei campionati geolocalizzati
 * 
 * Questo controller gestisce tutte le operazioni relative ai campionati nazionali,
 * continentali e internazionali basati sulla geolocalizzazione.
 */

const Tournament = require('../models/Tournament');
const { GeoChampionship, UserGeoLocation, REGION_TYPES, CONTINENTS } = require('../models/GeoLocation');
const User = require('../models/User');
const AdminLog = require('../models/AdminLog');
const Admin = require('../models/Admin');
const config = require('../config');
const { generateSlug, validateTournamentData } = require('../utils/tournamentUtils');
const geoip = require('geoip-lite');

/**
 * Controller per la gestione dei campionati geolocalizzati
 */
class GeoChampionshipController {
  /**
   * Crea un nuovo campionato nazionale
   * @param {Object} req - Richiesta HTTP
   * @param {Object} res - Risposta HTTP
   */
  async createNationalChampionship(req, res) {
    try {
      const userId = req.user.id;
      const { countryCode, name, description, format, mode, startDate, endDate, season, year } = req.body;
      
      // Verifica i permessi
      const isAdmin = await Admin.isAdmin(userId);
      if (!isAdmin) {
        return res.status(403).json({ 
          success: false, 
          message: 'Accesso negato. Solo gli amministratori possono creare campionati nazionali.' 
        });
      }
      
      const hasPermission = await Admin.hasPermission(userId, Admin.PERMISSIONS.CREATE_CHAMPIONSHIPS);
      if (!hasPermission) {
        return res.status(403).json({ 
          success: false, 
          message: 'Accesso negato. Non hai i permessi necessari.' 
        });
      }
      
      // Valida i dati del campionato
      if (!countryCode || !name || !startDate) {
        return res.status(400).json({ 
          success: false, 
          message: 'Dati del campionato non validi. Codice paese, nome e data di inizio sono obbligatori.' 
        });
      }
      
      // Genera uno slug unico
      const slug = await generateSlug(name);
      
      // Prepara i dati del torneo
      const tournamentData = {
        name,
        description,
        slug,
        format: format || Tournament.TOURNAMENT_FORMATS.MULTI_STAGE,
        mode: mode || Tournament.GAME_MODES.ONE_VS_ONE,
        type: Tournament.TOURNAMENT_TYPES.CHAMPIONSHIP,
        startDate,
        endDate,
        createdBy: userId,
        geoLocation: {
          type: REGION_TYPES.COUNTRY,
          countries: [countryCode]
        },
        visibility: 'public'
      };
      
      // Crea il torneo/campionato
      const tournament = new Tournament(tournamentData);
      await tournament.save();
      
      // Crea il record del campionato
      const championship = new GeoChampionship({
        name,
        type: REGION_TYPES.COUNTRY,
        countries: [countryCode],
        season,
        year,
        startDate,
        endDate,
        tournamentId: tournament._id,
        createdBy: userId
      });
      
      await championship.save();
      
      // Registra l'azione amministrativa
      const admin = await Admin.findByUserId(userId);
      await AdminLog.create({
        adminId: admin._id,
        action: 'create_national_championship',
        target: { type: 'tournament', id: tournament._id },
        details: { name, countryCode, season, year },
        result: { success: true },
        ipAddress: req.ip
      });
      
      return res.status(201).json({
        success: true,
        message: 'Campionato nazionale creato con successo.',
        championship: {
          id: championship._id,
          name: championship.name,
          type: championship.type,
          countries: championship.countries,
          season: championship.season,
          year: championship.year,
          tournamentId: championship.tournamentId,
          tournamentSlug: tournament.slug
        }
      });
    } catch (error) {
      console.error('Errore durante la creazione del campionato nazionale:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Errore durante la creazione del campionato nazionale.' 
      });
    }
  }
  
  /**
   * Crea un nuovo campionato continentale
   * @param {Object} req - Richiesta HTTP
   * @param {Object} res - Risposta HTTP
   */
  async createContinentalChampionship(req, res) {
    try {
      const userId = req.user.id;
      const { continent, name, description, format, mode, startDate, endDate, season, year } = req.body;
      
      // Verifica i permessi
      const isAdmin = await Admin.isAdmin(userId);
      if (!isAdmin) {
        return res.status(403).json({ 
          success: false, 
          message: 'Accesso negato. Solo gli amministratori possono creare campionati continentali.' 
        });
      }
      
      const hasPermission = await Admin.hasPermission(userId, Admin.PERMISSIONS.CREATE_CHAMPIONSHIPS);
      if (!hasPermission) {
        return res.status(403).json({ 
          success: false, 
          message: 'Accesso negato. Non hai i permessi necessari.' 
        });
      }
      
      // Valida i dati del campionato
      if (!continent || !name || !startDate) {
        return res.status(400).json({ 
          success: false, 
          message: 'Dati del campionato non validi. Continente, nome e data di inizio sono obbligatori.' 
        });
      }
      
      // Verifica che il continente sia valido
      if (!Object.values(CONTINENTS).includes(continent)) {
        return res.status(400).json({ 
          success: false, 
          message: 'Continente non valido.' 
        });
      }
      
      // Genera uno slug unico
      const slug = await generateSlug(name);
      
      // Prepara i dati del torneo
      const tournamentData = {
        name,
        description,
        slug,
        format: format || Tournament.TOURNAMENT_FORMATS.MULTI_STAGE,
        mode: mode || Tournament.GAME_MODES.ONE_VS_ONE,
        type: Tournament.TOURNAMENT_TYPES.CHAMPIONSHIP,
        startDate,
        endDate,
        createdBy: userId,
        geoLocation: {
          type: REGION_TYPES.CONTINENT,
          continent
        },
        visibility: 'public'
      };
      
      // Crea il torneo/campionato
      const tournament = new Tournament(tournamentData);
      await tournament.save();
      
      // Crea il record del campionato
      const championship = new GeoChampionship({
        name,
        type: REGION_TYPES.CONTINENT,
        continent,
        season,
        year,
        startDate,
        endDate,
        tournamentId: tournament._id,
        createdBy: userId
      });
      
      await championship.save();
      
      // Registra l'azione amministrativa
      const admin = await Admin.findByUserId(userId);
      await AdminLog.create({
        adminId: admin._id,
        action: 'create_continental_championship',
        target: { type: 'tournament', id: tournament._id },
        details: { name, continent, season, year },
        result: { success: true },
        ipAddress: req.ip
      });
      
      return res.status(201).json({
        success: true,
        message: 'Campionato continentale creato con successo.',
        championship: {
          id: championship._id,
          name: championship.name,
          type: championship.type,
          continent: championship.continent,
          season: championship.season,
          year: championship.year,
          tournamentId: championship.tournamentId,
          tournamentSlug: tournament.slug
        }
      });
    } catch (error) {
      console.error('Errore durante la creazione del campionato continentale:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Errore durante la creazione del campionato continentale.' 
      });
    }
  }
  
  /**
   * Crea un nuovo campionato internazionale
   * @param {Object} req - Richiesta HTTP
   * @param {Object} res - Risposta HTTP
   */
  async createInternationalChampionship(req, res) {
    try {
      const userId = req.user.id;
      const { name, description, format, mode, startDate, endDate, season, year } = req.body;
      
      // Verifica i permessi
      const isAdmin = await Admin.isAdmin(userId);
      if (!isAdmin) {
        return res.status(403).json({ 
          success: false, 
          message: 'Accesso negato. Solo gli amministratori possono creare campionati internazionali.' 
        });
      }
      
      const hasPermission = await Admin.hasPermission(userId, Admin.PERMISSIONS.CREATE_CHAMPIONSHIPS);
      if (!hasPermission) {
        return res.status(403).json({ 
          success: false, 
          message: 'Accesso negato. Non hai i permessi necessari.' 
        });
      }
      
      // Valida i dati del campionato
      if (!name || !startDate) {
        return res.status(400).json({ 
          success: false, 
          message: 'Dati del campionato non validi. Nome e data di inizio sono obbligatori.' 
        });
      }
      
      // Genera uno slug unico
      const slug = await generateSlug(name);
      
      // Prepara i dati del torneo
      const tournamentData = {
        name,
        description,
        slug,
        format: format || Tournament.TOURNAMENT_FORMATS.MULTI_STAGE,
        mode: mode || Tournament.GAME_MODES.ONE_VS_ONE,
        type: Tournament.TOURNAMENT_TYPES.CHAMPIONSHIP,
        startDate,
        endDate,
        createdBy: userId,
        geoLocation: {
          type: REGION_TYPES.INTERNATIONAL
        },
        visibility: 'public'
      };
      
      // Crea il torneo/campionato
      const tournament = new Tournament(tournamentData);
      await tournament.save();
      
      // Crea il record del campionato
      const championship = new GeoChampionship({
        name,
        type: REGION_TYPES.INTERNATIONAL,
        season,
        year,
        startDate,
        endDate,
        tournamentId: tournament._id,
        createdBy: userId
      });
      
      await championship.save();
      
      // Registra l'azione amministrativa
      const admin = await Admin.findByUserId(userId);
      await AdminLog.create({
        adminId: admin._id,
        action: 'create_international_championship',
        target: { type: 'tournament', id: tournament._id },
        details: { name, season, year },
        result: { success: true },
        ipAddress: req.ip
      });
      
      return res.status(201).json({
        success: true,
        message: 'Campionato internazionale creato con successo.',
        championship: {
          id: championship._id,
          name: championship.name,
          type: championship.type,
          season: championship.season,
          year: championship.year,
          tournamentId: championship.tournamentId,
          tournamentSlug: tournament.slug
        }
      });
    } catch (error) {
      console.error('Errore durante la creazione del campionato internazionale:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Errore durante la creazione del campionato internazionale.' 
      });
    }
  }
  
  /**
   * Aggiunge un torneo di qualificazione a un campionato
   * @param {Object} req - Richiesta HTTP
   * @param {Object} res - Risposta HTTP
   */
  async addQualificationTournament(req, res) {
    try {
      const userId = req.user.id;
      const { championshipId } = req.params;
      const { tournamentId, name, type, qualificationSpots } = req.body;
      
      // Verifica i permessi
      const isAdmin = await Admin.isAdmin(userId);
      if (!isAdmin) {
        return res.status(403).json({ 
          success: false, 
          message: 'Accesso negato. Solo gli amministratori possono aggiungere tornei di qualificazione.' 
        });
      }
      
      const hasPermission = await Admin.hasPermission(userId, Admin.PERMISSIONS.EDIT_CHAMPIONSHIPS);
      if (!hasPermission) {
        return res.status(403).json({ 
          success: false, 
          message: 'Accesso negato. Non hai i permessi necessari.' 
        });
      }
      
      // Verifica che il campionato esista
      const championship = await GeoChampionship.findById(championshipId);
      if (!championship) {
        return res.status(404).json({ 
          success: false, 
          message: 'Campionato non trovato.' 
        });
      }
      
      // Verifica che il torneo esista
      const tournament = await Tournament.findById(tournamentId);
      if (!tournament) {
        return res.status(404).json({ 
          success: false, 
          message: 'Torneo non trovato.' 
        });
      }
      
      // Verifica che il torneo non sia già un torneo di qualificazione per questo campionato
      const existingQualification = championship.qualificationTournaments.find(
        qt => qt.tournamentId.toString() === tournamentId
      );
      
      if (existingQualification) {
        return res.status(400).json({ 
          success: false, 
          message: 'Questo torneo è già un torneo di qualificazione per questo campionato.' 
        });
      }
      
      // Aggiungi il torneo di qualificazione
      championship.qualificationTournaments.push({
        tournamentId,
        name: name || tournament.name,
        type: type || 'qualification',
        qualificationSpots: qualificationSpots || 1
      });
      
      await championship.save();
      
      // Registra l'azione amministrativa
      const admin = await Admin.findByUserId(userId);
      await AdminLog.create({
        adminId: admin._id,
        action: 'add_qualification_tournament',
        target: { type: 'championship', id: championship._id },
        details: { 
          championshipName: championship.name, 
          tournamentId, 
          tournamentName: name || tournament.name,
          qualificationSpots
        },
        result: { success: true },
        ipAddress: req.ip
      });
      
      return res.status(200).json({
        success: true,
        message: 'Torneo di qualificazione aggiunto con successo.',
        qualificationTournament: championship.qualificationTournaments[
          championship.qualificationTournaments.length - 1
        ]
      });
    } catch (error) {
      console.error('Errore durante l\'aggiunta del torneo di qualificazione:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Errore durante l\'aggiunta del torneo di qualificazione.' 
      });
    }
  }
  
  /**
   * Imposta il campionato di fase successiva
   * @param {Object} req - Richiesta HTTP
   * @param {Object} res - Risposta HTTP
   */
  async setNextStageChampionship(req, res) {
    try {
      const userId = req.user.id;
      const { championshipId } = req.params;
      const { nextChampionshipId } = req.body;
      
      // Verifica i permessi
      const isAdmin = await Admin.isAdmin(userId);
      if (!isAdmin) {
        return res.status(403).json({ 
          success: false, 
          message: 'Accesso negato. Solo gli amministratori possono impostare il campionato di fase successiva.' 
        });
      }
      
      const hasPermission = await Admin.hasPermission(userId, Admin.PERMISSIONS.EDIT_CHAMPIONSHIPS);
      if (!hasPermission) {
        return res.status(403).json({ 
          success: false, 
          message: 'Accesso negato. Non hai i permessi necessari.' 
        });
      }
      
      // Verifica che il campionato esista
      const championship = await GeoChampionship.findById(championshipId);
      if (!championship) {
        return res.status(404).json({ 
          success: false, 
          message: 'Campionato non trovato.' 
        });
      }
      
      // Verifica che il campionato di fase successiva esista
      const nextChampionship = await GeoChampionship.findById(nextChampionshipId);
      if (!nextChampionship) {
        return res.status(404).json({ 
          success: false, 
          message: 'Campionato di fase successiva non trovato.' 
        });
      }
      
      // Verifica la gerarchia dei campionati
      if (championship.type === REGION_TYPES.INTERNATIONAL) {
        return res.status(400).json({ 
          success: false, 
          message: 'Un campionato internazionale non può avere un campionato di fase successiva.' 
        });
      }
      
      if (championship.type === REGION_TYPES.CONTINENT && nextChampionship.type !== REGION_TYPES.INTERNATIONAL) {
        return res.status(400).json({ 
          success: false, 
          message: 'Un campionato continentale può avere solo un campionato internazionale come fase successiva.' 
        });
      }
      
      if (championship.type === REGION_TYPES.COUNTRY && 
          nextChampionship.type !== REGION_TYPES.CONTINENT && 
          nextChampionship.type !== REGION_TYPES.INTERNATIONAL) {
        return res.status(400).json({ 
          success: false, 
          message: 'Un campionato nazionale può avere solo un campionato continentale o internazionale come fase successiva.' 
        });
      }
      
      // Imposta il campionato di fase successiva
      championship.nextStageChampionship = nextChampionshipId;
      await championship.save();
      
      // Registra l'azione amministrativa
      const admin = await Admin.findByUserId(userId);
      await AdminLog.create({
        adminId: admin._id,
        action: 'set_next_stage_championship',
        target: { type: 'championship', id: championship._id },
        details: { 
          championshipName: championship.name, 
          nextChampionshipId,
          nextChampionshipName: nextChampionship.name
        },
        result: { success: true },
        ipAddress: req.ip
      });
      
      return res.status(200).json({
        success: true,
        message: 'Campionato di fase successiva impostato con successo.',
        championship: {
          id: championship._id,
          name: championship.name,
          type: championship.type,
          nextStageChampionship: {
            id: nextChampionship._id,
            name: nextChampionship.name,
            type: nextChampionship.type
          }
        }
      });
    } catch (error) {
      console.error('Errore durante l\'impostazione del campionato di fase successiva:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Errore durante l\'impostazione del campionato di fase successiva.' 
      });
    }
  }
  
  /**
   * Ottiene i campionati per tipo
   * @param {Object} req - Richiesta HTTP
   * @param {Object} res - Risposta HTTP
   */
  async getChampionshipsByType(req, res) {
    try {
      const { type } = req.params;
      const { countryCode, continent, season, year } = req.query;
      
      // Verifica che il tipo sia valido
      if (!Object.values(REGION_TYPES).includes(type)) {
        return res.status(400).json({ 
          success: false, 
          message: 'Tipo di campionato non valido.' 
        });
      }
      
      let championships;
      
      switch (type) {
        case REGION_TYPES.COUNTRY:
          championships = await GeoChampionship.findNationalChampionships(countryCode);
          break;
        case REGION_TYPES.CONTINENT:
          championships = await GeoChampionship.findContinentalChampionships(continent);
          break;
        case REGION_TYPES.INTERNATIONAL:
          championships = await GeoChampionship.findInternationalChampionships();
          break;
      }
      
      // Filtra per stagione e anno se specificati
      if (season) {
        championships = championships.filter(c => c.season === season);
      }
      
      if (year) {
        championships = championships.filter(c => c.year === parseInt(year));
      }
      
      return res.status(200).json({
        success: true,
        championships
      });
    } catch (error) {
      console.error('Errore durante il recupero dei campionati:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Errore durante il recupero dei campionati.' 
      });
    }
  }
  
  /**
   * Ottiene i dettagli di un campionato
   * @param {Object} req - Richiesta HTTP
   * @param {Object} res - Risposta HTTP
   */
  async getChampionshipDetails(req, res) {
    try {
      const { championshipId } = req.params;
      
      // Ottieni il campionato
      const championship = await GeoChampionship.findById(championshipId)
        .populate('tournamentId')
        .populate('qualificationTournaments.tournamentId')
        .populate('nextStageChampionship')
        .populate('createdBy', 'nickname avatar');
      
      if (!championship) {
        return res.status(404).json({ 
          success: false, 
          message: 'Campionato non trovato.' 
        });
      }
      
      // Ottieni il torneo associato
      const tournament = await Tournament.findById(championship.tournamentId)
        .populate('participants.userId', 'nickname avatar');
      
      if (!tournament) {
        return res.status(404).json({ 
          success: false, 
          message: 'Torneo associato non trovato.' 
        });
      }
      
      return res.status(200).json({
        success: true,
        championship,
        tournament
      });
    } catch (error) {
      console.error('Errore durante il recupero dei dettagli del campionato:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Errore durante il recupero dei dettagli del campionato.' 
      });
    }
  }
  
  /**
   * Aggiorna la geolocalizzazione di un utente
   * @param {Object} req - Richiesta HTTP
   * @param {Object} res - Risposta HTTP
   */
  async updateUserGeoLocation(req, res) {
    try {
      const userId = req.user.id;
      const { country, countryCode, continent, region, city, manuallySet } = req.body;
      
      // Ottieni la geolocalizzazione attuale dell'utente
      let userGeoLocation = await UserGeoLocation.findByUserId(userId);
      
      // Se non esiste, creane una nuova
      if (!userGeoLocation) {
        userGeoLocation = new UserGeoLocation({
          userId,
          ipAddress: req.ip
        });
      }
      
      // Se l'aggiornamento è manuale, verifica i permessi
      if (manuallySet) {
        // Solo l'utente stesso o un amministratore può impostare manualmente la geolocalizzazione
        if (req.params.userId && req.params.userId !== userId) {
          const isAdmin = await Admin.isAdmin(userId);
          if (!isAdmin) {
            return res.status(403).json({ 
              success: false, 
              message: 'Accesso negato. Solo gli amministratori possono modificare la geolocalizzazione di altri utenti.' 
            });
          }
          
          const hasPermission = await Admin.hasPermission(userId, Admin.PERMISSIONS.EDIT_USER_GEOLOCATION);
          if (!hasPermission) {
            return res.status(403).json({ 
              success: false, 
              message: 'Accesso negato. Non hai i permessi necessari.' 
            });
          }
          
          userGeoLocation.userId = req.params.userId;
        }
        
        // Aggiorna i dati
        userGeoLocation.country = country;
        userGeoLocation.countryCode = countryCode;
        userGeoLocation.continent = continent;
        userGeoLocation.region = region;
        userGeoLocation.city = city;
        userGeoLocation.manuallySet = true;
        userGeoLocation.verificationStatus = 'pending';
      } else {
        // Aggiornamento automatico basato sull'IP
        const ip = req.ip;
        const geo = geoip.lookup(ip);
        
        if (geo) {
          userGeoLocation.country = geo.country;
          userGeoLocation.countryCode = geo.country;
          userGeoLocation.continent = geo.continent.toLowerCase();
          userGeoLocation.region = geo.region;
          userGeoLocation.city = geo.city;
          userGeoLocation.ipAddress = ip;
          userGeoLocation.manuallySet = false;
          userGeoLocation.verificationStatus = 'verified';
        } else {
          return res.status(400).json({ 
            success: false, 
            message: 'Impossibile determinare la geolocalizzazione dall\'indirizzo IP.' 
          });
        }
      }
      
      userGeoLocation.lastDetectedAt = new Date();
      await userGeoLocation.save();
      
      // Se l'aggiornamento è stato fatto da un amministratore, registra l'azione
      if (manuallySet && req.params.userId && req.params.userId !== userId) {
        const admin = await Admin.findByUserId(userId);
        await AdminLog.create({
          adminId: admin._id,
          action: 'update_user_geolocation',
          target: { type: 'user', id: req.params.userId },
          details: { 
            country,
            countryCode,
            continent,
            region,
            city
          },
          result: { success: true },
          ipAddress: req.ip
        });
      }
      
      return res.status(200).json({
        success: true,
        message: 'Geolocalizzazione aggiornata con successo.',
        userGeoLocation
      });
    } catch (error) {
      console.error('Errore durante l\'aggiornamento della geolocalizzazione:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Errore durante l\'aggiornamento della geolocalizzazione.' 
      });
    }
  }
  
  /**
   * Verifica la geolocalizzazione di un utente
   * @param {Object} req - Richiesta HTTP
   * @param {Object} res - Risposta HTTP
   */
  async verifyUserGeoLocation(req, res) {
    try {
      const adminId = req.user.id;
      const { userId } = req.params;
      
      // Verifica i permessi
      const isAdmin = await Admin.isAdmin(adminId);
      if (!isAdmin) {
        return res.status(403).json({ 
          success: false, 
          message: 'Accesso negato. Solo gli amministratori possono verificare la geolocalizzazione.' 
        });
      }
      
      const hasPermission = await Admin.hasPermission(adminId, Admin.PERMISSIONS.VERIFY_USER_GEOLOCATION);
      if (!hasPermission) {
        return res.status(403).json({ 
          success: false, 
          message: 'Accesso negato. Non hai i permessi necessari.' 
        });
      }
      
      // Ottieni la geolocalizzazione dell'utente
      const userGeoLocation = await UserGeoLocation.findByUserId(userId);
      
      if (!userGeoLocation) {
        return res.status(404).json({ 
          success: false, 
          message: 'Geolocalizzazione dell\'utente non trovata.' 
        });
      }
      
      // Verifica la geolocalizzazione
      await userGeoLocation.verify(adminId);
      
      // Registra l'azione amministrativa
      const admin = await Admin.findByUserId(adminId);
      await AdminLog.create({
        adminId: admin._id,
        action: 'verify_user_geolocation',
        target: { type: 'user', id: userId },
        details: { 
          country: userGeoLocation.country,
          countryCode: userGeoLocation.countryCode,
          continent: userGeoLocation.continent
        },
        result: { success: true },
        ipAddress: req.ip
      });
      
      return res.status(200).json({
        success: true,
        message: 'Geolocalizzazione verificata con successo.',
        userGeoLocation
      });
    } catch (error) {
      console.error('Errore durante la verifica della geolocalizzazione:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Errore durante la verifica della geolocalizzazione.' 
      });
    }
  }
}

module.exports = new GeoChampionshipController();
