import { AuthManager } from '../authManager';

describe('AuthManager', () => {
    let authManager;
    let mockUiManager;
    let localStorageStore;

    beforeEach(() => {
        mockUiManager = {
            showNotification: jest.fn(),
        };

        // Mock localStorage
        localStorageStore = {};
        Object.defineProperty(window, 'localStorage', {
            value: {
                getItem: jest.fn(key => localStorageStore[key] || null),
                setItem: jest.fn((key, value) => { localStorageStore[key] = value.toString(); }),
                removeItem: jest.fn(key => { delete localStorageStore[key]; }),
                clear: jest.fn(() => { localStorageStore = {}; })
            },
            writable: true // Ensure it can be reassigned if needed, though direct assignment is usually fine
        });
        
        authManager = new AuthManager(mockUiManager);
        // Reset login attempts map for each test to ensure isolation
        authManager.loginAttempts = {};
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.useRealTimers(); // Reset timers if fake timers were used
        localStorageStore = {}; // Clear the store manually
    });

    describe('validateEmail', () => {
        it('should return true for valid emails', () => {
            expect(authManager.validateEmail('test@example.com')).toBe(true);
            expect(authManager.validateEmail('user.name@sub.example.co.uk')).toBe(true);
        });
        it('should return false for invalid emails', () => {
            expect(authManager.validateEmail('testexample.com')).toBe(false);
            expect(authManager.validateEmail('test@')).toBe(false);
            expect(authManager.validateEmail('@example.com')).toBe(false);
            expect(authManager.validateEmail('test@example.')).toBe(false);
            expect(authManager.validateEmail('')).toBe(false);
        });
    });

    describe('validatePassword', () => {
        const strongPassword = 'StrongP@ss1';
        it('should return isValid: true for a strong password', () => {
            const result = authManager.validatePassword(strongPassword);
            expect(result.isValid).toBe(true);
            expect(result.errors.length).toBe(0);
        });

        it('should fail for password less than 8 characters', () => {
            const result = authManager.validatePassword('Short1@');
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('La password deve essere lunga almeno 8 caratteri');
        });

        it('should fail if no uppercase letter', () => {
            const result = authManager.validatePassword('noupper@1');
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('La password deve contenere almeno una lettera maiuscola');
        });

        it('should fail if no lowercase letter', () => {
            const result = authManager.validatePassword('NOLOWER@1');
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('La password deve contenere almeno una lettera minuscola');
        });

        it('should fail if no number', () => {
            const result = authManager.validatePassword('NoNumber@A');
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('La password deve contenere almeno un numero');
        });

        it('should fail if no special character', () => {
            const result = authManager.validatePassword('NoSpecial1A');
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('La password deve contenere almeno un carattere speciale');
        });

        it('should fail for multiple criteria', () => {
            const result = authManager.validatePassword('weak');
            expect(result.isValid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(1);
        });
    });

    describe('Client-Side Lockout Logic', () => {
        const email = 'locktest@example.com';

        it('should not lock user before max attempts', () => {
            for (let i = 0; i < authManager.maxLoginAttempts - 1; i++) {
                authManager.recordLoginAttempt(email, false);
            }
            expect(authManager.isUserLocked(email)).toBe(false);
        });

        it('should lock user after max failed attempts', () => {
            for (let i = 0; i < authManager.maxLoginAttempts; i++) {
                authManager.recordLoginAttempt(email, false);
            }
            expect(authManager.isUserLocked(email)).toBe(true);
        });

        it('should reset attempts on successful login', () => {
            for (let i = 0; i < authManager.maxLoginAttempts -1 ; i++) {
                authManager.recordLoginAttempt(email, false);
            }
            expect(authManager.loginAttempts[email].count).toBe(authManager.maxLoginAttempts -1);
            authManager.recordLoginAttempt(email, true); // Successful attempt
            expect(authManager.loginAttempts[email]).toBeUndefined();
            expect(authManager.isUserLocked(email)).toBe(false);
        });
        
        it('should unlock user after lockoutDuration', () => {
            jest.useFakeTimers();
            for (let i = 0; i < authManager.maxLoginAttempts; i++) {
                authManager.recordLoginAttempt(email, false);
            }
            expect(authManager.isUserLocked(email)).toBe(true);

            // Advance time by lockoutDuration + 1ms
            jest.advanceTimersByTime(authManager.lockoutDuration + 1);
            expect(authManager.isUserLocked(email)).toBe(false);
            // Check if attempts are cleared after lockout period has passed and isUserLocked is called
            expect(authManager.loginAttempts[email]).toBeUndefined(); 
            jest.useRealTimers();
        });

        it('should still be locked if checked before lockoutDuration ends', () => {
            jest.useFakeTimers();
            for (let i = 0; i < authManager.maxLoginAttempts; i++) {
                authManager.recordLoginAttempt(email, false);
            }
            expect(authManager.isUserLocked(email)).toBe(true);
            
            jest.advanceTimersByTime(authManager.lockoutDuration - 1000); // 1 second before lockout ends
            expect(authManager.isUserLocked(email)).toBe(true);
            expect(authManager.loginAttempts[email].count).toBe(authManager.maxLoginAttempts);
            jest.useRealTimers();
        });
    });

    describe('login method', () => {
        const email = 'test@example.com';
        const password = 'Password123!';

        it('should successfully login with valid credentials and set token/user', async () => {
            await authManager.login(email, password, false);
            expect(authManager.isLoggedIn()).toBe(true);
            expect(authManager.getUser()).not.toBeNull();
            expect(authManager.getUser().email).toBe(email);
            expect(authManager.getToken()).toMatch(/^JWT_.*/);
            expect(mockUiManager.showNotification).toHaveBeenCalledWith('Login effettuato con successo', 'success');
            expect(localStorage.setItem).not.toHaveBeenCalled();
        });

        it('should store token in localStorage if rememberMe is true', async () => {
            await authManager.login(email, password, true);
            expect(localStorage.setItem).toHaveBeenCalledWith('authToken', authManager.getToken());
            expect(localStorage.setItem).toHaveBeenCalledWith('tokenExpiry', expect.any(String));
        });

        it('should fail login with invalid credentials (simulated)', async () => {
            // In the current mock, any non-empty email/password is valid.
            // Let's test the rejection path by providing empty credentials, which the internal validation catches.
            try {
                await authManager.login('', '');
            } catch (error) {
                expect(error.message).toBe('Email e password sono richieste');
            }
            expect(authManager.isLoggedIn()).toBe(false);
            expect(authManager.getUser()).toBeNull();
            expect(authManager.getToken()).toBeNull();
        });
        
        it('should reject if email format is invalid', async () => {
             try {
                await authManager.login('invalidemail', password);
            } catch (error) {
                expect(error.message).toBe('Formato email non valido');
            }
            expect(authManager.isLoggedIn()).toBe(false);
        });

        it('should reject if user is locked', async () => {
            jest.useFakeTimers();
            for (let i = 0; i < authManager.maxLoginAttempts; i++) {
                authManager.recordLoginAttempt(email, false);
            }
            try {
                await authManager.login(email, password);
            } catch (error) {
                expect(error.message).toMatch(/Account temporaneamente bloccato. Riprova tra \d+ minuti/);
            }
            jest.useRealTimers();
        });
    });

    describe('logout method', () => {
        it('should clear token, user, and remove from localStorage', async () => {
            // First, simulate a login
            await authManager.login('test@example.com', 'Password123!', true);
            expect(authManager.isLoggedIn()).toBe(true);
            expect(localStorage.getItem('authToken')).not.toBeNull();

            await authManager.logout();
            expect(authManager.isLoggedIn()).toBe(false);
            expect(authManager.getUser()).toBeNull();
            expect(authManager.getToken()).toBeNull();
            expect(localStorage.removeItem).toHaveBeenCalledWith('authToken');
            expect(mockUiManager.showNotification).toHaveBeenCalledWith('Logout effettuato con successo', 'success');
        });
    });

    describe('register method', () => {
        const nickname = 'tester';
        const email = 'register@example.com';
        const strongPassword = 'StrongP@ss1';

        it('should resolve successfully with valid inputs (simulated)', async () => {
            const response = await authManager.register(nickname, email, strongPassword);
            expect(response.success).toBe(true);
            expect(response.message).toBe('Registrazione completata! Controlla la tua email per verificare l\'account.');
        });

        it('should reject if email is invalid', async () => {
            try {
                await authManager.register(nickname, 'invalidemail', strongPassword);
            } catch (error) {
                expect(error.message).toBe('Formato email non valido');
            }
        });

        it('should reject if password is weak', async () => {
            try {
                await authManager.register(nickname, email, 'weak');
            } catch (error) {
                expect(error.message).toContain('La password deve essere lunga almeno 8 caratteri');
            }
        });
        
        it('should reject if any field is empty', async () => {
            try {
                await authManager.register('', email, strongPassword);
            } catch (error) {
                expect(error.message).toBe('Tutti i campi sono obbligatori');
            }
        });
    });

    describe('isLoggedIn method', () => {
        it('should return true when user is logged in', async () => {
            await authManager.login('test@example.com', 'Password123!');
            expect(authManager.isLoggedIn()).toBe(true);
        });

        it('should return false when user is not logged in (initially)', () => {
            expect(authManager.isLoggedIn()).toBe(false);
        });

        it('should return false after logout', async () => {
            await authManager.login('test@example.com', 'Password123!');
            await authManager.logout();
            expect(authManager.isLoggedIn()).toBe(false);
        });
    });

    describe('checkSavedToken', () => {
        it('should set token and user if a valid token is in localStorage (simulated)', (done) => {
            const mockToken = 'saved_JWT_mockToken';
            localStorageStore['authToken'] = mockToken; // Pre-populate our mock store
            
            // Re-initialize authManager to trigger checkSavedToken in constructor
            authManager = new AuthManager(mockUiManager); 
            
            // validateToken is async, so we need to wait for it
            // A simple way is to wait for the notification it's supposed to show
            // Or, if validateToken was more complex, we'd mock it and check its call.
            // For this test, let's rely on the setTimeout within validateToken
            
            setTimeout(() => {
                expect(authManager.getToken()).toBe(mockToken);
                expect(authManager.getUser()).not.toBeNull();
                expect(authManager.getUser().nickname).toMatch(/^Giocatore\d+/);
                expect(mockUiManager.showNotification).toHaveBeenCalledWith(expect.stringContaining('Bentornato,'), 'success');
                done();
            }, 600); // A bit more than validateToken's internal setTimeout
        });

        it('should not set token or user if no token in localStorage', () => {
             localStorageStore = {}; // Ensure store is empty
             authManager = new AuthManager(mockUiManager);
             expect(authManager.getToken()).toBeNull();
             expect(authManager.getUser()).toBeNull();
        });
    });
});
