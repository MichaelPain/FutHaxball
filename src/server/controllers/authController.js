// controllers/authController.js - Controller per l'autenticazione

const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { validationResult } = require('express-validator');
const { 
    AuthenticationError, 
    NotFoundError, 
    ConflictError, 
    AppError 
} = require('../middleware/errorHandler'); // Or directly from '../utils/customErrors'

// Configurazione per l'invio di email
const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

// Registrazione utente
exports.register = async (req, res, next) => {
    try {
        // Validazione input
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            // Note: express-validator errors are typically handled by a dedicated middleware
            // or by directly using the custom ValidationError. For this task, let's assume
            // the existing structure for validationResult is fine, but other errors will use custom classes.
            return res.status(400).json({ errors: errors.array() });
        }

        const { nickname, email, password } = req.body;

        // Verifica se l'email è già in uso
        let user = await User.findOne({ email });
        if (user) {
            throw new ConflictError('Email già in uso');
        }

        // Verifica se il nickname è già in uso
        user = await User.findOne({ nickname });
        if (user) {
            throw new ConflictError('Nickname già in uso');
        }

        // Crea token di verifica
        const verificationToken = crypto.randomBytes(20).toString('hex');

        // Crea nuovo utente
        user = new User({
            nickname,
            email,
            password,
            verificationToken
        });

        await user.save();

        // Invia email di verifica
        const verificationUrl = `${req.protocol}://${req.get('host')}/api/auth/verify/${verificationToken}`;
        
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: 'Verifica il tuo account HaxBall Clone',
            html: `
                <h1>Benvenuto su HaxBall Clone!</h1>
                <p>Grazie per esserti registrato. Per favore, verifica il tuo account cliccando sul link seguente:</p>
                <a href="${verificationUrl}">Verifica Account</a>
                <p>Se non hai richiesto questa registrazione, ignora questa email.</p>
            `
        };

        transporter.sendMail(mailOptions);

        res.status(201).json({ 
            message: 'Utente registrato con successo. Controlla la tua email per verificare l\'account.' 
        });
    } catch (error) {
        console.error('Errore nella registrazione:', error);
        next(error);
    }
};

// Verifica email
exports.verifyEmail = async (req, res, next) => {
    try {
        const { token } = req.params;

        // Trova l'utente con il token di verifica
        const user = await User.findOne({ verificationToken: token });

        if (!user) {
            throw new AuthenticationError('Token di verifica non valido o scaduto');
        }

        // Aggiorna lo stato di verifica dell'utente
        user.isVerified = true;
        user.verificationToken = undefined;
        await user.save();

        res.status(200).json({ message: 'Account verificato con successo. Ora puoi effettuare il login.' });
    } catch (error) {
        console.error('Errore nella verifica email:', error);
        next(error);
    }
};

// Login
exports.login = async (req, res, next) => {
    try {
        // Validazione input
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password } = req.body;

        // Trova l'utente
        const user = await User.findOne({ email });
        if (!user) {
            throw new AuthenticationError('Credenziali non valide');
        }

        // Verifica la password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            throw new AuthenticationError('Credenziali non valide');
        }

        // Verifica se l'account è stato verificato
        if (!user.isVerified) {
            throw new AuthenticationError('Account non verificato. Controlla la tua email.');
        }

        // Verifica se l'utente è sospeso
        if (user.penalties.isSuspended) {
            const now = new Date();
            if (user.penalties.suspensionEndDate > now) {
                throw new AppError(
                    `Account sospeso: ${user.penalties.suspensionReason || 'N/A'}. Termina il: ${user.penalties.suspensionEndDate.toLocaleDateString()}`, 
                    403
                );
            } else {
                // Rimuovi la sospensione se è scaduta
                user.penalties.isSuspended = false;
                user.penalties.suspensionReason = undefined;
                user.penalties.suspensionEndDate = undefined;
                await user.save();
            }
        }

        // Aggiorna l'ultimo login
        user.lastLogin = Date.now();
        await user.save();

        // Crea e firma il JWT
        const payload = {
            user: {
                id: user.id,
                nickname: user.nickname
            }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '7d' },
            (err, token) => {
                if (err) return next(err); // Pass JWT errors to the error handler
                res.json({ 
                    token,
                    user: {
                        id: user.id,
                        nickname: user.nickname,
                        email: user.email,
                        stats: user.stats,
                        ranking: user.ranking
                    }
                });
            }
        );
    } catch (error) {
        console.error('Errore nel login:', error);
        next(error);
    }
};

// Richiesta reset password
exports.forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;

        // Trova l'utente
        const user = await User.findOne({ email });
        if (!user) {
            throw new NotFoundError('Utente non trovato con questa email');
        }

        // Crea token di reset
        const resetToken = crypto.randomBytes(20).toString('hex');
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 ora
        await user.save();

        // Invia email di reset
        const resetUrl = `${req.protocol}://${req.get('host')}/reset-password/${resetToken}`;
        
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: 'Reset Password HaxBall Clone',
            html: `
                <h1>Reset Password</h1>
                <p>Hai richiesto il reset della password. Clicca sul link seguente per procedere:</p>
                <a href="${resetUrl}">Reset Password</a>
                <p>Se non hai richiesto questo reset, ignora questa email.</p>
                <p>Il link scadrà tra un'ora.</p>
            `
        };

        transporter.sendMail(mailOptions);

        res.status(200).json({ message: 'Email di reset password inviata' });
    } catch (error) {
        console.error('Errore nel reset password:', error);
        next(error);
    }
};

// Reset password
exports.resetPassword = async (req, res, next) => {
    try {
        const { token } = req.params;
        const { password } = req.body;

        // Trova l'utente con il token di reset
        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            throw new AuthenticationError('Token di reset non valido o scaduto');
        }

        // Aggiorna la password
        user.password = password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.status(200).json({ message: 'Password aggiornata con successo' });
    } catch (error) {
        console.error('Errore nel reset password:', error);
        next(error);
    }
};

// Cambio password
exports.changePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;

        // Trova l'utente
        const user = await User.findById(req.user.id);
        if (!user) {
            // This case should ideally not be reached if auth middleware is effective
            throw new NotFoundError('Utente non trovato');
        }

        // Verifica la password attuale
        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            throw new AuthenticationError('Password attuale non corretta');
        }

        // Aggiorna la password
        user.password = newPassword;
        await user.save();

        res.status(200).json({ message: 'Password aggiornata con successo' });
    } catch (error) {
        console.error('Errore nel cambio password:', error);
        next(error);
    }
};

// Ottieni profilo utente
exports.getProfile = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            // This case should ideally not be reached if auth middleware is effective
            throw new NotFoundError('Utente non trovato');
        }

        res.json(user);
    } catch (error) {
        console.error('Errore nel recupero profilo:', error);
        next(error);
    }
};

// Aggiorna profilo utente
exports.updateProfile = async (req, res, next) => {
    try {
        const { nickname } = req.body;

        // Verifica se il nickname è già in uso
        if (nickname) {
            const existingUser = await User.findOne({ nickname });
            if (existingUser && existingUser.id !== req.user.id) {
                throw new ConflictError('Nickname già in uso');
            }
        }

        // Aggiorna il profilo
        const user = await User.findByIdAndUpdate(
            req.user.id,
            { nickname }, // Only nickname is updatable here as per current code
            { new: true }
        ).select('-password');
        
        if (!user) { // Should not happen if req.user.id is valid
            throw new NotFoundError('Utente non trovato durante l\'aggiornamento');
        }

        res.json(user);
    } catch (error) {
        console.error('Errore nell\'aggiornamento profilo:', error);
        next(error);
    }
};
