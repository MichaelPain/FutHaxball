// middleware/auth.js - Middleware per l'autenticazione

const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
    // Ottieni il token dall'header
    const token = req.header('x-auth-token');
    
    // Verifica se il token esiste
    if (!token) {
        return res.status(401).json({ message: 'Accesso negato. Token mancante.' });
    }
    
    try {
        // Verifica il token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Aggiungi l'utente alla richiesta
        req.user = decoded.user;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Token non valido' });
    }
};
