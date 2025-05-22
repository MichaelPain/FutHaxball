// routes/api.js - Configurazione delle rotte API

const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const authController = require('../controllers/authController');
const matchmakingController = require('../controllers/matchmakingController');
const rankingController = require('../controllers/rankingController');
const auth = require('../middleware/auth');

// Middleware per la validazione dell'input
const registerValidation = [
    check('nickname', 'Il nickname è obbligatorio').not().isEmpty(),
    check('nickname', 'Il nickname deve essere lungo almeno 3 caratteri').isLength({ min: 3 }),
    check('email', 'Inserisci un\'email valida').isEmail(),
    check('password', 'La password deve essere lunga almeno 6 caratteri').isLength({ min: 6 })
];

const loginValidation = [
    check('email', 'Inserisci un\'email valida').isEmail(),
    check('password', 'La password è obbligatoria').exists()
];

// Rotte per l'autenticazione
router.post('/auth/register', registerValidation, authController.register);
router.get('/auth/verify/:token', authController.verifyEmail);
router.post('/auth/login', loginValidation, authController.login);
router.post('/auth/forgot-password', authController.forgotPassword);
router.post('/auth/reset-password/:token', authController.resetPassword);
router.post('/auth/change-password', auth, authController.changePassword);
router.get('/auth/profile', auth, authController.getProfile);
router.put('/auth/profile', auth, authController.updateProfile);

// Rotte per il matchmaking
router.post('/matchmaking/join', auth, matchmakingController.joinQueue);
router.post('/matchmaking/leave', auth, matchmakingController.leaveQueue);
// Commento temporaneo della rotta status che causa errori
// router.get('/matchmaking/status', auth, matchmakingController.getQueueStatus);

// Rotte per le classifiche
router.get('/rankings/:mode', rankingController.getRanking);
router.get('/rankings/:mode/player/:userId', rankingController.getPlayerRanking);
router.get('/players/:userId/stats', rankingController.getPlayerStats);
router.get('/rankings/:mode/export/:format', rankingController.exportRankings);

module.exports = router;
