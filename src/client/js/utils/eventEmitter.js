// eventEmitter.js - Event handling utility

export class EventEmitter {
    constructor() {
        this.events = new Map();
    }

    on(event, listener) {
        if (!this.events.has(event)) {
            this.events.set(event, []);
        }
        this.events.get(event).push(listener);
        return this;
    }

    off(event, listener) {
        if (!this.events.has(event)) return this;
        
        const listeners = this.events.get(event);
        const index = listeners.indexOf(listener);
        
        if (index !== -1) {
            listeners.splice(index, 1);
        }
        
        return this;
    }

    emit(event, ...args) {
        if (!this.events.has(event)) return false;
        
        const listeners = this.events.get(event);
        listeners.forEach(listener => {
            try {
                listener.apply(this, args);
            } catch (error) {
                console.error(`Error in event listener for ${event}:`, error);
            }
        });
        
        return true;
    }

    once(event, listener) {
        const onceWrapper = (...args) => {
            this.off(event, onceWrapper);
            listener.apply(this, args);
        };
        
        return this.on(event, onceWrapper);
    }

    removeAllListeners(event) {
        if (event) {
            this.events.delete(event);
        } else {
            this.events.clear();
        }
        return this;
    }

    listenerCount(event) {
        if (!this.events.has(event)) return 0;
        return this.events.get(event).length;
    }

    listeners(event) {
        if (!this.events.has(event)) return [];
        return [...this.events.get(event)];
    }
} 