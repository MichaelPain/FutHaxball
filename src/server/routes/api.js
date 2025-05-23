// routes/api.js - Configurazione delle rotte API

const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const authController = require('../controllers/authController');
const matchmakingController = require('../controllers/matchmakingController');
const rankingController = require('../controllers/rankingController');
const auth = require('../middleware/auth');

// Middleware per la validazione dell'input
const passwordComplexityRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).*$/;
const passwordErrorMessage = 'La password deve essere lunga almeno 6 caratteri e contenere maiuscole, minuscole, numeri e caratteri speciali';

const registerValidation = [
    check('nickname', 'Il nickname è obbligatorio').not().isEmpty(),
    check('nickname', 'Il nickname deve essere lungo almeno 3 caratteri').isLength({ min: 3 }),
    check('email', 'Inserisci un\'email valida').isEmail().normalizeEmail(),
    check('password', passwordErrorMessage).isLength({ min: 6 }).matches(passwordComplexityRegex)
];

const loginValidation = [
    check('email', 'Inserisci un\'email valida').isEmail().normalizeEmail(), // Added normalizeEmail for consistency
    check('password', 'La password è obbligatoria').exists()
];

const forgotPasswordValidation = [
    check('email', 'Inserisci un\'email valida').isEmail().normalizeEmail()
];

const resetPasswordValidation = [
    check('password', passwordErrorMessage).isLength({ min: 6 }).matches(passwordComplexityRegex)
];

const changePasswordValidation = [
    check('currentPassword', 'La password attuale è obbligatoria').exists().not().isEmpty(),
    check('newPassword', passwordErrorMessage).isLength({ min: 6 }).matches(passwordComplexityRegex)
];

const updateProfileValidation = [
    check('nickname', 'Il nickname deve essere lungo tra 3 e 20 caratteri').optional().isLength({ min: 3, max: 20 })
    // Add other fields as necessary, e.g.:
    // check('email', 'Inserisci un\'email valida').optional().isEmail().normalizeEmail()
];


// Rotte per l'autenticazione
router.post('/auth/register', registerValidation, authController.register);
router.get('/auth/verify/:token', authController.verifyEmail); // No input body to validate typically
router.post('/auth/login', loginValidation, authController.login);
router.post('/auth/forgot-password', forgotPasswordValidation, authController.forgotPassword);
router.post('/auth/reset-password/:token', resetPasswordValidation, authController.resetPassword);
router.post('/auth/change-password', auth, changePasswordValidation, authController.changePassword);
router.get('/auth/profile', auth, authController.getProfile); // No input body to validate
router.put('/auth/profile', auth, updateProfileValidation, authController.updateProfile);

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
