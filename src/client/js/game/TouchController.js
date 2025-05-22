// TouchController.js - Mobile touch controls implementation
export class TouchController {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            joystickSize: 150,
            joystickKnobSize: 60,
            buttonSize: 80,
            buttonSpacing: 20,
            ...options
        };

        this.joystick = {
            active: false,
            position: { x: 0, y: 0 },
            center: { x: 0, y: 0 },
            current: { x: 0, y: 0 },
            direction: { x: 0, y: 0 }
        };

        this.buttons = {
            kick: { active: false, position: { x: 0, y: 0 } },
            sprint: { active: false, position: { x: 0, y: 0 } },
            tackle: { active: false, position: { x: 0, y: 0 } }
        };

        this.touchIds = new Map();
        this.onMove = null;
        this.onKick = null;
        this.onSprint = null;
        this.onTackle = null;

        this.init();
    }

    init() {
        // Create container for touch controls
        this.controlsContainer = document.createElement('div');
        this.controlsContainer.className = 'touch-controls';
        this.controlsContainer.style.cssText = `
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 100%;
            pointer-events: none;
            z-index: 1000;
        `;

        // Create joystick
        this.createJoystick();

        // Create action buttons
        this.createActionButtons();

        // Add to container
        this.container.appendChild(this.controlsContainer);

        // Add event listeners
        this.addEventListeners();
    }

    createJoystick() {
        const joystickContainer = document.createElement('div');
        joystickContainer.className = 'joystick-container';
        joystickContainer.style.cssText = `
            position: absolute;
            bottom: ${this.options.buttonSize + this.options.buttonSpacing}px;
            left: ${this.options.buttonSize + this.options.buttonSpacing}px;
            width: ${this.options.joystickSize}px;
            height: ${this.options.joystickSize}px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 50%;
            pointer-events: auto;
        `;

        const joystickKnob = document.createElement('div');
        joystickKnob.className = 'joystick-knob';
        joystickKnob.style.cssText = `
            position: absolute;
            width: ${this.options.joystickKnobSize}px;
            height: ${this.options.joystickKnobSize}px;
            background: rgba(255, 255, 255, 0.4);
            border-radius: 50%;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            pointer-events: none;
        `;

        joystickContainer.appendChild(joystickKnob);
        this.controlsContainer.appendChild(joystickContainer);

        this.joystick.element = joystickContainer;
        this.joystick.knob = joystickKnob;
        this.joystick.center = {
            x: joystickContainer.offsetLeft + this.options.joystickSize / 2,
            y: joystickContainer.offsetTop + this.options.joystickSize / 2
        };
    }

    createActionButtons() {
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'action-buttons';
        buttonContainer.style.cssText = `
            position: absolute;
            bottom: ${this.options.buttonSpacing}px;
            right: ${this.options.buttonSpacing}px;
            display: flex;
            flex-direction: column;
            gap: ${this.options.buttonSpacing}px;
            pointer-events: auto;
        `;

        // Create kick button
        const kickButton = this.createButton('kick', 'Kick');
        buttonContainer.appendChild(kickButton);

        // Create sprint button
        const sprintButton = this.createButton('sprint', 'Sprint');
        buttonContainer.appendChild(sprintButton);

        // Create tackle button
        const tackleButton = this.createButton('tackle', 'Tackle');
        buttonContainer.appendChild(tackleButton);

        this.controlsContainer.appendChild(buttonContainer);
    }

    createButton(type, label) {
        const button = document.createElement('button');
        button.className = `touch-button ${type}-button`;
        button.textContent = label;
        button.style.cssText = `
            width: ${this.options.buttonSize}px;
            height: ${this.options.buttonSize}px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.2);
            border: none;
            color: white;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            user-select: none;
            -webkit-user-select: none;
            touch-action: manipulation;
        `;

        this.buttons[type].element = button;
        return button;
    }

    addEventListeners() {
        // Touch events for joystick
        this.joystick.element.addEventListener('touchstart', this.handleJoystickStart.bind(this));
        this.joystick.element.addEventListener('touchmove', this.handleJoystickMove.bind(this));
        this.joystick.element.addEventListener('touchend', this.handleJoystickEnd.bind(this));
        this.joystick.element.addEventListener('touchcancel', this.handleJoystickEnd.bind(this));

        // Touch events for buttons
        Object.values(this.buttons).forEach(button => {
            button.element.addEventListener('touchstart', (e) => this.handleButtonStart(e, button));
            button.element.addEventListener('touchend', (e) => this.handleButtonEnd(e, button));
            button.element.addEventListener('touchcancel', (e) => this.handleButtonEnd(e, button));
        });
    }

    handleJoystickStart(e) {
        e.preventDefault();
        const touch = e.touches[0];
        this.touchIds.set('joystick', touch.identifier);
        this.joystick.active = true;
        this.updateJoystickPosition(touch);
    }

    handleJoystickMove(e) {
        e.preventDefault();
        const touch = Array.from(e.touches).find(t => t.identifier === this.touchIds.get('joystick'));
        if (touch) {
            this.updateJoystickPosition(touch);
        }
    }

    handleJoystickEnd(e) {
        e.preventDefault();
        this.joystick.active = false;
        this.joystick.direction = { x: 0, y: 0 };
        this.joystick.knob.style.transform = 'translate(-50%, -50%)';
        this.touchIds.delete('joystick');
        if (this.onMove) this.onMove(0, 0);
    }

    updateJoystickPosition(touch) {
        const rect = this.joystick.element.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const deltaX = touch.clientX - centerX;
        const deltaY = touch.clientY - centerY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const maxDistance = this.options.joystickSize / 2;

        if (distance > maxDistance) {
            const angle = Math.atan2(deltaY, deltaX);
            this.joystick.current.x = centerX + Math.cos(angle) * maxDistance;
            this.joystick.current.y = centerY + Math.sin(angle) * maxDistance;
        } else {
            this.joystick.current.x = touch.clientX;
            this.joystick.current.y = touch.clientY;
        }

        const knobX = this.joystick.current.x - centerX;
        const knobY = this.joystick.current.y - centerY;
        this.joystick.knob.style.transform = `translate(calc(-50% + ${knobX}px), calc(-50% + ${knobY}px))`;

        // Calculate normalized direction
        this.joystick.direction = {
            x: knobX / maxDistance,
            y: knobY / maxDistance
        };

        if (this.onMove) {
            this.onMove(this.joystick.direction.x, this.joystick.direction.y);
        }
    }

    handleButtonStart(e, button) {
        e.preventDefault();
        const touch = e.touches[0];
        this.touchIds.set(button.type, touch.identifier);
        button.active = true;
        button.element.style.background = 'rgba(255, 255, 255, 0.4)';

        switch (button.type) {
            case 'kick':
                if (this.onKick) this.onKick(true);
                break;
            case 'sprint':
                if (this.onSprint) this.onSprint(true);
                break;
            case 'tackle':
                if (this.onTackle) this.onTackle(true);
                break;
        }
    }

    handleButtonEnd(e, button) {
        e.preventDefault();
        button.active = false;
        button.element.style.background = 'rgba(255, 255, 255, 0.2)';
        this.touchIds.delete(button.type);

        switch (button.type) {
            case 'kick':
                if (this.onKick) this.onKick(false);
                break;
            case 'sprint':
                if (this.onSprint) this.onSprint(false);
                break;
            case 'tackle':
                if (this.onTackle) this.onTackle(false);
                break;
        }
    }

    setCallbacks(callbacks) {
        this.onMove = callbacks.onMove;
        this.onKick = callbacks.onKick;
        this.onSprint = callbacks.onSprint;
        this.onTackle = callbacks.onTackle;
    }

    destroy() {
        // Remove event listeners
        this.joystick.element.removeEventListener('touchstart', this.handleJoystickStart);
        this.joystick.element.removeEventListener('touchmove', this.handleJoystickMove);
        this.joystick.element.removeEventListener('touchend', this.handleJoystickEnd);
        this.joystick.element.removeEventListener('touchcancel', this.handleJoystickEnd);

        Object.values(this.buttons).forEach(button => {
            button.element.removeEventListener('touchstart', (e) => this.handleButtonStart(e, button));
            button.element.removeEventListener('touchend', (e) => this.handleButtonEnd(e, button));
            button.element.removeEventListener('touchcancel', (e) => this.handleButtonEnd(e, button));
        });

        // Remove elements
        this.controlsContainer.remove();
    }
} 