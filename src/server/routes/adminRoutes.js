/**
 * AdminRoutes.js - Definizione delle rotte per il pannello di amministrazione
 * 
 * Questo file definisce tutte le rotte API per il pannello di amministrazione,
 * incluse le rotte per l'autenticazione, la gestione degli utenti, la moderazione e la configurazione.
 */

const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { checkPermission, PERMISSIONS } = require('../controllers/adminController');
const authMiddleware = require('../middleware/auth');

// Middleware per verificare l'autenticazione
router.use(authMiddleware.verifyToken);

// Rotte per l'accesso al pannello di amministrazione
router.get('/access', adminController.checkAdminAccess);

// Rotte per la dashboard
router.get('/dashboard', checkPermission(PERMISSIONS.VIEW_ADMIN_PANEL), adminController.getDashboardData);

// Rotte per la gestione degli utenti
router.get('/users', checkPermission(PERMISSIONS.VIEW_USERS), adminController.getUsers);
router.get('/users/:id', checkPermission(PERMISSIONS.VIEW_USERS), adminController.getUserDetails);
router.put('/users/:id', checkPermission(PERMISSIONS.UPDATE_USER), adminController.updateUser);
router.post('/users/:id/ban', checkPermission(PERMISSIONS.BAN_USER), adminController.banUser);
router.post('/users/:id/unban', checkPermission(PERMISSIONS.UNBAN_USER), adminController.unbanUser);
router.post('/users/:id/reset-stats', checkPermission(PERMISSIONS.RESET_USER_STATS), adminController.resetUserStats);

// Rotte per la gestione degli amministratori
router.post('/admins', checkPermission(PERMISSIONS.MANAGE_ADMINS), adminController.addAdmin);
router.put('/admins/:id', checkPermission(PERMISSIONS.MANAGE_ADMINS), adminController.updateAdmin);
router.delete('/admins/:id', checkPermission(PERMISSIONS.MANAGE_ADMINS), adminController.removeAdmin);

// Rotte per l'autenticazione a due fattori
router.post('/2fa/setup', checkPermission(PERMISSIONS.SETUP_2FA), adminController.setupTwoFactor);
router.post('/2fa/verify', checkPermission(PERMISSIONS.VIEW_ADMIN_PANEL), adminController.verifyTwoFactor);
router.post('/2fa/disable', checkPermission(PERMISSIONS.VIEW_ADMIN_PANEL), adminController.disableTwoFactor);

// Rotte per i log amministrativi
router.get('/logs', checkPermission(PERMISSIONS.VIEW_LOGS), adminController.getLogs);

module.exports = router;
