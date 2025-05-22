// settings.js - Gestisce il menu impostazioni e la funzionalità di uscita

export class SettingsManager {
    constructor(userSettings, uiManager) {
        this.userSettings = userSettings || {
            graphics: {
                quality: 'high',
                particleEffects: true,
                dynamicShadows: true,
                antiAliasing: true,
                bloomEffect: true,
                motionBlur: false,
                vsync: true,
                fpsLimit: 144,
                renderDistance: 'high',
                textureQuality: 'high',
                shadowQuality: 'high'
            },
            audio: {
                soundEffects: true,
                volume: 80,
                musicVolume: 60,
                ambientVolume: 40,
                voiceVolume: 100,
                spatialAudio: true,
                reverb: true,
                equalizer: {
                    bass: 0,
                    mid: 0,
                    treble: 0
                }
            },
            gameplay: {
                showNicknames: true,
                autoReplays: true,
                possessionIndicator: true,
                ballTrail: true,
                playerTrail: false,
                showFPS: false,
                showPing: true,
                showCoordinates: false,
                autoSaveReplays: true,
                chatFilter: true,
                chatNotifications: true
            },
            controls: {
                sensitivity: 1.0,
                invertY: false,
                autoAim: false,
                vibration: true,
                keyBindings: {
                    moveUp: 'W',
                    moveDown: 'S',
                    moveLeft: 'A',
                    moveRight: 'D',
                    dash: 'SHIFT',
                    special: 'SPACE'
                }
            },
            accessibility: {
                colorBlindMode: 'none',
                highContrast: false,
                textSize: 'medium',
                screenShake: true,
                reducedMotion: false,
                subtitles: true,
                subtitleSize: 'medium'
            }
        };
        
        this.uiManager = uiManager;
        this.deviceSettings = this.detectDeviceCapabilities();
        this.initializeUI();
    }

    detectDeviceCapabilities() {
        return {
            isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
            hasTouch: 'ontouchstart' in window,
            hasVibration: 'vibrate' in navigator,
            hasWebGL: this.checkWebGLSupport(),
            hasAudioContext: 'AudioContext' in window || 'webkitAudioContext' in window,
            screenSize: {
                width: window.innerWidth,
                height: window.innerHeight
            }
        };
    }

    checkWebGLSupport() {
        try {
            const canvas = document.createElement('canvas');
            return !!(window.WebGLRenderingContext && 
                (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
        } catch (e) {
            return false;
        }
    }

    initializeUI() {
        this.initElements();
        this.setupEventListeners();
        this.updateUIFromSettings();
        this.applyDeviceSpecificSettings();
    }

    initElements() {
        console.log("Inizializzazione UI impostazioni");
        
        // Ottieni i riferimenti agli elementi DOM
        this.volumeSlider = document.getElementById('volume');
        this.volumeValue = document.getElementById('volume-value');
        this.qualitySelect = document.getElementById('graphics-quality');
        this.particleEffectsToggle = document.getElementById('particle-effects');
        this.dynamicShadowsToggle = document.getElementById('dynamic-shadows');
        this.showNicknamesToggle = document.getElementById('show-nicknames');
        this.autoReplaysToggle = document.getElementById('auto-replays');
        this.possessionIndicatorToggle = document.getElementById('possession-indicator');
        this.saveButton = document.getElementById('save-settings');
        this.resetButton = document.getElementById('reset-settings');
        
        // Nuovi elementi per le impostazioni avanzate
        this.antiAliasingToggle = document.getElementById('anti-aliasing');
        this.bloomEffectToggle = document.getElementById('bloom-effect');
        this.motionBlurToggle = document.getElementById('motion-blur');
        this.vsyncToggle = document.getElementById('vsync');
        this.fpsLimitInput = document.getElementById('fps-limit');
        this.renderDistanceSelect = document.getElementById('render-distance');
        this.textureQualitySelect = document.getElementById('texture-quality');
        this.shadowQualitySelect = document.getElementById('shadow-quality');

        // Elementi audio avanzati
        this.musicVolumeSlider = document.getElementById('music-volume');
        this.ambientVolumeSlider = document.getElementById('ambient-volume');
        this.voiceVolumeSlider = document.getElementById('voice-volume');
        this.spatialAudioToggle = document.getElementById('spatial-audio');
        this.reverbToggle = document.getElementById('reverb');
        this.equalizerBassSlider = document.getElementById('equalizer-bass');
        this.equalizerMidSlider = document.getElementById('equalizer-mid');
        this.equalizerTrebleSlider = document.getElementById('equalizer-treble');

        // Elementi gameplay avanzati
        this.ballTrailToggle = document.getElementById('ball-trail');
        this.playerTrailToggle = document.getElementById('player-trail');
        this.showFPSToggle = document.getElementById('show-fps');
        this.showPingToggle = document.getElementById('show-ping');
        this.showCoordinatesToggle = document.getElementById('show-coordinates');
        this.autoSaveReplaysToggle = document.getElementById('auto-save-replays');
        this.chatFilterToggle = document.getElementById('chat-filter');
        this.chatNotificationsToggle = document.getElementById('chat-notifications');

        // Elementi controlli
        this.sensitivitySlider = document.getElementById('sensitivity');
        this.invertYToggle = document.getElementById('invert-y');
        this.autoAimToggle = document.getElementById('auto-aim');
        this.vibrationToggle = document.getElementById('vibration');

        // Elementi accessibilità
        this.colorBlindModeSelect = document.getElementById('color-blind-mode');
        this.highContrastToggle = document.getElementById('high-contrast');
        this.textSizeSelect = document.getElementById('text-size');
        this.screenShakeToggle = document.getElementById('screen-shake');
        this.reducedMotionToggle = document.getElementById('reduced-motion');
        this.subtitlesToggle = document.getElementById('subtitles');
        this.subtitleSizeSelect = document.getElementById('subtitle-size');
        
        // Imposta i valori iniziali
        this.updateUIFromSettings();
        
        // Configura gli event listener
        this.setupEventListeners();
    }
    
    updateUIFromSettings() {
        // Aggiorna l'UI in base alle impostazioni correnti
        if (this.volumeSlider) {
            this.volumeSlider.value = this.userSettings.audio.volume;
        }
        
        if (this.volumeValue) {
            this.volumeValue.textContent = `${this.userSettings.audio.volume}%`;
        }
        
        if (this.qualitySelect) {
            this.qualitySelect.value = this.userSettings.graphics.quality;
        }
        
        if (this.particleEffectsToggle) {
            this.particleEffectsToggle.checked = this.userSettings.graphics.particleEffects;
        }
        
        if (this.dynamicShadowsToggle) {
            this.dynamicShadowsToggle.checked = this.userSettings.graphics.dynamicShadows;
        }
        
        if (this.showNicknamesToggle) {
            this.showNicknamesToggle.checked = this.userSettings.gameplay.showNicknames;
        }
        
        if (this.autoReplaysToggle) {
            this.autoReplaysToggle.checked = this.userSettings.gameplay.autoReplays;
        }
        
        if (this.possessionIndicatorToggle) {
            this.possessionIndicatorToggle.checked = this.userSettings.gameplay.possessionIndicator;
        }
        
        // Applica immediatamente le impostazioni
        this.applySettings();
    }
    
    setupEventListeners() {
        // Slider del volume
        if (this.volumeSlider) {
            this.volumeSlider.addEventListener('input', () => {
                const volume = parseInt(this.volumeSlider.value, 10);
                if (this.volumeValue) {
                    this.volumeValue.textContent = `${volume}%`;
                }
                this.userSettings.audio.volume = volume;
                
                // Applica immediatamente il volume
                this.applyVolumeSettings();
            });
        }
        
        // Selettore della qualità grafica
        if (this.qualitySelect) {
            this.qualitySelect.addEventListener('change', () => {
                this.userSettings.graphics.quality = this.qualitySelect.value;
            });
        }
        
        // Toggle per gli effetti particellari
        if (this.particleEffectsToggle) {
            this.particleEffectsToggle.addEventListener('change', () => {
                this.userSettings.graphics.particleEffects = this.particleEffectsToggle.checked;
            });
        }
        
        // Toggle per le ombre dinamiche
        if (this.dynamicShadowsToggle) {
            this.dynamicShadowsToggle.addEventListener('change', () => {
                this.userSettings.graphics.dynamicShadows = this.dynamicShadowsToggle.checked;
            });
        }
        
        // Toggle per mostrare i nickname
        if (this.showNicknamesToggle) {
            this.showNicknamesToggle.addEventListener('change', () => {
                this.userSettings.gameplay.showNicknames = this.showNicknamesToggle.checked;
            });
        }
        
        // Toggle per i replay automatici
        if (this.autoReplaysToggle) {
            this.autoReplaysToggle.addEventListener('change', () => {
                this.userSettings.gameplay.autoReplays = this.autoReplaysToggle.checked;
            });
        }
        
        // Toggle per l'indicatore di possesso
        if (this.possessionIndicatorToggle) {
            this.possessionIndicatorToggle.addEventListener('change', () => {
                this.userSettings.gameplay.possessionIndicator = this.possessionIndicatorToggle.checked;
            });
        }
        
        // Pulsante per salvare le impostazioni
        if (this.saveButton) {
            this.saveButton.addEventListener('click', () => {
                this.saveSettings();
                
                // Mostra una notifica di conferma
                if (this.uiManager) {
                    this.uiManager.showSuccess('Impostazioni salvate con successo');
                } else {
                    console.log('Impostazioni salvate con successo');
                }
            });
        }
        
        // Pulsante per ripristinare le impostazioni predefinite
        if (this.resetButton) {
            this.resetButton.addEventListener('click', () => {
                this.resetSettings();
                
                // Mostra una notifica di conferma
                if (this.uiManager) {
                    this.uiManager.showSuccess('Impostazioni ripristinate ai valori predefiniti');
                } else {
                    console.log('Impostazioni ripristinate ai valori predefiniti');
                }
            });
        }
    }
    
    applyVolumeSettings() {
        // Applica le impostazioni del volume
        console.log(`Volume impostato a ${this.userSettings.audio.volume}%`);
        
        // Simula l'applicazione del volume
        this.simulateVolumeChange(this.userSettings.audio.volume);
    }
    
    simulateVolumeChange(volume) {
        // Simula il cambiamento del volume
        // In un'implementazione reale, questo metodo modificherebbe il volume effettivo del gioco
        
        // Crea un elemento audio temporaneo per testare il volume
        const audioTest = document.createElement('audio');
        audioTest.volume = volume / 100;
        
        // Imposta l'attributo src a un file audio vuoto o a un file di test
        audioTest.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
        
        // Riproduci brevemente l'audio per testare il volume
        audioTest.play().catch(e => {
            // Ignora errori di riproduzione (comuni nei browser che richiedono interazione utente)
            console.log('Test audio non riuscito, ma il volume è stato impostato');
        });
        
        // Ferma l'audio dopo un breve periodo
        setTimeout(() => {
            audioTest.pause();
            audioTest.remove();
        }, 100);
    }
    
    applySettings() {
        this.applyVolumeSettings();
        this.applyGraphicsSettings();
        this.applyGameplaySettings();
        this.applyControlSettings();
        this.applyAccessibilitySettings();
        
        // Notifica l'utente delle modifiche
        this.showSettingsAppliedNotification();
    }
    
    applyGraphicsSettings() {
        // Applica le impostazioni grafiche
        const graphicsSettings = this.userSettings.graphics;
        
        // Log delle impostazioni applicate
        console.log('Applicazione impostazioni grafiche:', graphicsSettings);
        
        // Emetti evento per il renderer
        if (this.uiManager && this.uiManager.eventEmitter) {
            this.uiManager.eventEmitter.emit('graphicsSettingsChanged', graphicsSettings);
        }
    }
    
    applyGameplaySettings() {
        // Applica le impostazioni di gameplay
        const gameplaySettings = this.userSettings.gameplay;
        
        // Log delle impostazioni applicate
        console.log('Applicazione impostazioni gameplay:', gameplaySettings);
        
        // Emetti evento per il game manager
        if (this.uiManager && this.uiManager.eventEmitter) {
            this.uiManager.eventEmitter.emit('gameplaySettingsChanged', gameplaySettings);
        }
    }
    
    applyControlSettings() {
        // Applica le impostazioni dei controlli
        const controlSettings = this.userSettings.controls;
        
        // Log delle impostazioni applicate
        console.log('Applicazione impostazioni controlli:', controlSettings);
        
        // Emetti evento per l'input manager
        if (this.uiManager && this.uiManager.eventEmitter) {
            this.uiManager.eventEmitter.emit('controlSettingsChanged', controlSettings);
        }
    }
    
    applyAccessibilitySettings() {
        // Applica le impostazioni di accessibilità
        const accessibilitySettings = this.userSettings.accessibility;
        
        // Log delle impostazioni applicate
        console.log('Applicazione impostazioni accessibilità:', accessibilitySettings);
        
        // Emetti evento per l'UI manager
        if (this.uiManager && this.uiManager.eventEmitter) {
            this.uiManager.eventEmitter.emit('accessibilitySettingsChanged', accessibilitySettings);
        }
    }
    
    showSettingsAppliedNotification() {
        if (this.uiManager) {
            this.uiManager.showSuccess('Impostazioni applicate con successo', {
                duration: 2000,
                position: 'top-right',
                showProgress: true
            });
        }
    }
    
    saveSettings() {
        // Salva le impostazioni
        console.log("Salvataggio impostazioni:", this.userSettings);
        
        // Salva le impostazioni nel localStorage
        localStorage.setItem('haxball_settings', JSON.stringify(this.userSettings));
        
        // Applica le impostazioni
        this.applySettings();
    }
    
    loadSettings() {
        // Carica le impostazioni dal localStorage
        const savedSettings = localStorage.getItem('haxball_settings');
        if (savedSettings) {
            try {
                const parsedSettings = JSON.parse(savedSettings);
                
                // Merge delle impostazioni salvate con quelle predefinite
                this.userSettings = {
                    graphics: {
                        ...this.userSettings.graphics,
                        ...(parsedSettings.graphics || {})
                    },
                    audio: {
                        ...this.userSettings.audio,
                        ...(parsedSettings.audio || {})
                    },
                    gameplay: {
                        ...this.userSettings.gameplay,
                        ...(parsedSettings.gameplay || {})
                    },
                    controls: {
                        ...this.userSettings.controls,
                        ...(parsedSettings.controls || {})
                    },
                    accessibility: {
                        ...this.userSettings.accessibility,
                        ...(parsedSettings.accessibility || {})
                    }
                };
                
                console.log("Impostazioni caricate:", this.userSettings);
            } catch (error) {
                console.error("Errore nel caricamento delle impostazioni:", error);
            }
        }
    }
    
    resetSettings() {
        // Ripristina le impostazioni predefinite
        this.userSettings = {
            graphics: {
                quality: 'high',
                particleEffects: true,
                dynamicShadows: true,
                antiAliasing: true,
                bloomEffect: true,
                motionBlur: false,
                vsync: true,
                fpsLimit: 144,
                renderDistance: 'high',
                textureQuality: 'high',
                shadowQuality: 'high'
            },
            audio: {
                soundEffects: true,
                volume: 80,
                musicVolume: 60,
                ambientVolume: 40,
                voiceVolume: 100,
                spatialAudio: true,
                reverb: true,
                equalizer: {
                    bass: 0,
                    mid: 0,
                    treble: 0
                }
            },
            gameplay: {
                showNicknames: true,
                autoReplays: true,
                possessionIndicator: true,
                ballTrail: true,
                playerTrail: false,
                showFPS: false,
                showPing: true,
                showCoordinates: false,
                autoSaveReplays: true,
                chatFilter: true,
                chatNotifications: true
            },
            controls: {
                sensitivity: 1.0,
                invertY: false,
                autoAim: false,
                vibration: true,
                keyBindings: {
                    moveUp: 'W',
                    moveDown: 'S',
                    moveLeft: 'A',
                    moveRight: 'D',
                    dash: 'SHIFT',
                    special: 'SPACE'
                }
            },
            accessibility: {
                colorBlindMode: 'none',
                highContrast: false,
                textSize: 'medium',
                screenShake: true,
                reducedMotion: false,
                subtitles: true,
                subtitleSize: 'medium'
            }
        };
        
        // Aggiorna l'UI
        this.updateUIFromSettings();
        
        // Salva le impostazioni predefinite
        this.saveSettings();
    }

    applyDeviceSpecificSettings() {
        if (this.deviceSettings.isMobile) {
            // Disabilita alcune opzioni su dispositivi mobili
            this.disableMobileUnsupportedFeatures();
            // Applica impostazioni ottimizzate per mobile
            this.optimizeForMobile();
        }

        if (!this.deviceSettings.hasWebGL) {
            // Disabilita opzioni grafiche avanzate
            this.disableAdvancedGraphics();
        }

        if (!this.deviceSettings.hasAudioContext) {
            // Disabilita opzioni audio avanzate
            this.disableAdvancedAudio();
        }

        if (!this.deviceSettings.hasVibration) {
            // Disabilita opzioni di vibrazione
            this.disableVibration();
        }
    }

    disableMobileUnsupportedFeatures() {
        const mobileUnsupported = [
            this.motionBlurToggle,
            this.vsyncToggle,
            this.fpsLimitInput,
            this.spatialAudioToggle
        ];

        mobileUnsupported.forEach(element => {
            if (element) {
                element.disabled = true;
                element.parentElement.classList.add('disabled');
            }
        });
    }

    optimizeForMobile() {
        // Imposta qualità grafica predefinita più bassa su mobile
        this.userSettings.graphics.quality = 'medium';
        this.userSettings.graphics.particleEffects = false;
        this.userSettings.graphics.dynamicShadows = false;
        this.userSettings.graphics.antiAliasing = false;
        this.userSettings.graphics.bloomEffect = false;
        
        // Ottimizza controlli per touch
        this.userSettings.controls.sensitivity = 0.8;
        this.userSettings.controls.autoAim = true;
    }

    disableAdvancedGraphics() {
        const advancedGraphics = [
            this.antiAliasingToggle,
            this.bloomEffectToggle,
            this.motionBlurToggle,
            this.vsyncToggle,
            this.fpsLimitInput
        ];

        advancedGraphics.forEach(element => {
            if (element) {
                element.disabled = true;
                element.parentElement.classList.add('disabled');
            }
        });
    }

    disableAdvancedAudio() {
        const advancedAudio = [
            this.spatialAudioToggle,
            this.reverbToggle,
            this.equalizerBassSlider,
            this.equalizerMidSlider,
            this.equalizerTrebleSlider
        ];

        advancedAudio.forEach(element => {
            if (element) {
                element.disabled = true;
                element.parentElement.classList.add('disabled');
            }
        });
    }

    disableVibration() {
        if (this.vibrationToggle) {
            this.vibrationToggle.disabled = true;
            this.vibrationToggle.parentElement.classList.add('disabled');
        }
    }
}
