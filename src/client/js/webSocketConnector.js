// webSocketConnector.js - Manages WebSocket connection lifecycle

export class WebSocketConnector extends EventTarget {
    constructor(serverUrl, ioInstance) {
        super();
        this.serverUrl = serverUrl;
        this.socket = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.io = ioInstance; // Pass the io instance, e.g., from import { io } from "socket.io-client";
        this.connectionTimeout = 10000; // Milliseconds
        this.isManuallyDisconnected = false;
    }

    connect() {
        this.isManuallyDisconnected = false;
        console.log("WebSocketConnector: Initializing connection to", this.serverUrl);
        
        try {
            this.socket = this.io(this.serverUrl, {
                transports: ['websocket'],
                reconnection: false, // We handle reconnection manually for more control and events
                timeout: this.connectionTimeout,
                autoConnect: false, // We call connect() explicitly
                forceNew: true, // Ensures a new connection
                // Socket.IO specific options that might be useful
                // upgrade: true, // Allows transport upgrades, typically from polling to websocket
                // rememberUpgrade: true,
                // perMessageDeflate: true // Optional: enable compression
            });

            this.socket.on('connect', () => {
                console.log('WebSocketConnector: Successfully connected to server.');
                this.reconnectAttempts = 0; // Reset attempts on successful connection
                this.dispatchEvent(new CustomEvent('connected'));
            });

            this.socket.on('disconnect', (reason) => {
                console.log(`WebSocketConnector: Disconnected from server. Reason: ${reason}`);
                this.dispatchEvent(new CustomEvent('disconnected', { detail: { reason } }));
                
                // Only attempt to reconnect if it wasn't a manual disconnect
                // and not a server-side "io server disconnect" which means the server initiated it gracefully.
                if (!this.isManuallyDisconnected && reason !== 'io server disconnect') {
                    this.attemptReconnect();
                }
            });

            this.socket.on('error', (error) => {
                console.error('WebSocketConnector: Connection error:', error);
                this.dispatchEvent(new CustomEvent('error', { detail: { error } }));
                // Errors can sometimes lead to disconnects, which will then trigger reconnection logic.
                // If the error doesn't cause a disconnect, we might still want to try reconnecting.
                if (!this.socket.connected && !this.isManuallyDisconnected) {
                     this.attemptReconnect();
                }
            });
            
            // For NetworkManager to attach its application-specific listeners
            // this.socket.onAny((eventName, ...args) => {
            //     this.dispatchEvent(new CustomEvent('messageReceived', { detail: { eventName, args } }));
            // });

            console.log("WebSocketConnector: Attempting to connect...");
            this.socket.connect();

        } catch (error) {
            console.error("WebSocketConnector: Error during connection setup:", error);
            this.dispatchEvent(new CustomEvent('error', { detail: { error } }));
            if (!this.isManuallyDisconnected) {
                this.attemptReconnect();
            }
        }
    }

    attemptReconnect() {
        if (this.isManuallyDisconnected) {
            console.log("WebSocketConnector: Manual disconnect, not attempting reconnect.");
            return;
        }

        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            // Exponential backoff, but cap at 30 seconds
            const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts -1), 30000);
            console.log(`WebSocketConnector: Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
            
            setTimeout(() => {
                if (!this.isManuallyDisconnected && (!this.socket || !this.socket.connected)) {
                    console.log("WebSocketConnector: Executing scheduled reconnect attempt.");
                    this.connect();
                } else {
                    console.log("WebSocketConnector: Reconnect attempt aborted (already connected or manually disconnected).");
                }
            }, delay);
        } else {
            console.error('WebSocketConnector: Maximum reconnection attempts reached.');
            this.dispatchEvent(new CustomEvent('connection_failed', { detail: { error: 'Max reconnection attempts reached' } }));
        }
    }

    // Send raw message (event)
    emit(eventName, data) {
        if (this.socket && this.socket.connected) {
            this.socket.emit(eventName, data);
        } else {
            console.warn(`WebSocketConnector: Socket not connected. Message "${eventName}" not sent.`, data);
            // NetworkManager should handle queuing if necessary
        }
    }

    // Send message with acknowledgement callback
    emitWithAck(eventName, data, ackCallback) {
        if (this.socket && this.socket.connected) {
            this.socket.emit(eventName, data, ackCallback);
        } else {
            console.warn(`WebSocketConnector: Socket not connected. Message "${eventName}" with ack not sent.`, data);
            if (typeof ackCallback === 'function') {
                // Call the ack with an error if the socket isn't connected
                try {
                    ackCallback(new Error("Socket not connected"));
                } catch (e) {
                    console.error("WebSocketConnector: Error in ackCallback for unconnected socket:", e);
                }
            }
        }
    }

    disconnect() {
        this.isManuallyDisconnected = true; // Mark that this disconnect is intentional
        this.reconnectAttempts = this.maxReconnectAttempts; // Prevent automatic reconnections
        if (this.socket) {
            console.log('WebSocketConnector: Manually disconnecting socket.');
            this.socket.disconnect();
            // Ensure all listeners are removed to prevent memory leaks if this instance is reused (though typically it won't be)
            // this.socket.removeAllListeners(); 
            // this.socket = null; // Or set to null after disconnect event fires
        }
    }

    isConnected() {
        return this.socket ? this.socket.connected : false;
    }

    // Provides direct access to the socket for NetworkManager to add specific event handlers
    getSocket() {
        return this.socket;
    }
    
    // Utility to add event listeners to this connector instance (connected, disconnected, error, etc.)
    // Inherited from EventTarget: addEventListener, removeEventListener, dispatchEvent
}
