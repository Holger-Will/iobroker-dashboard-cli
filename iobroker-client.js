import io from 'socket.io-client';
import { EventEmitter } from 'events';

class IoBrokerClient extends EventEmitter {
    constructor(config = {}) {
        super();
        
        this.config = {
            url: config.url || 'http://localhost:8084',
            auth: config.auth || null,
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 5,
            ...config
        };
        
        this.socket = null;
        this.connected = false;
        this.states = new Map(); // Cache of current states
    }

    async connect() {
        try {
            this.socket = io(this.config.url, {
                auth: this.config.auth,
                reconnection: this.config.reconnection,
                reconnectionDelay: this.config.reconnectionDelay,
                reconnectionAttempts: this.config.reconnectionAttempts,
                transports: ['websocket', 'polling']
            });

            this.setupEventListeners();
            
            return new Promise((resolve, reject) => {
                this.socket.on('connect', () => {
                    this.connected = true;
                    this.emit('connected');
                    resolve();
                });

                this.socket.on('connect_error', (error) => {
                    reject(error);
                });
            });
            
        } catch (error) {
            this.emit('error', error);
            throw error;
        }
    }

    setupEventListeners() {
        this.socket.on('disconnect', (reason) => {
            this.connected = false;
            this.emit('disconnected', reason);
        });

        this.socket.on('reconnect', (attemptNumber) => {
            this.connected = true;
            this.emit('reconnected', attemptNumber);
        });

        this.socket.on('reconnect_error', (error) => {
            this.emit('reconnect_error', error);
        });

        // Listen for state changes from ioBroker
        this.socket.on('stateChange', (id, state) => {
            this.handleStateChange(id, state);
        });
    }

    handleStateChange(id, state) {
        // Update local state cache
        this.states.set(id, state);
        
        // Emit state change event for dashboard to handle
        this.emit('stateChange', {
            id,
            state,
            timestamp: Date.now()
        });
    }

    // Subscribe to state changes for specific object IDs
    subscribeStates(pattern = '*') {
        if (!this.connected) {
            throw new Error('Not connected to ioBroker');
        }
        
        this.socket.emit('subscribe', pattern);
    }

    // Unsubscribe from state changes
    unsubscribeStates(pattern = '*') {
        if (!this.connected) {
            throw new Error('Not connected to ioBroker');
        }
        
        this.socket.emit('unsubscribe', pattern);
    }

    // Get current state value
    async getState(id) {
        return new Promise((resolve, reject) => {
            if (!this.connected) {
                reject(new Error('Not connected to ioBroker'));
                return;
            }

            this.socket.emit('getState', id, (error, state) => {
                if (error) {
                    reject(error);
                } else {
                    this.states.set(id, state);
                    resolve(state);
                }
            });
        });
    }

    // Get object metadata (type, role, common properties)
    async getObject(id) {
        return new Promise((resolve, reject) => {
            if (!this.connected) {
                reject(new Error('Not connected to ioBroker'));
                return;
            }

            this.socket.emit('getObject', id, (error, obj) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(obj);
                }
            });
        });
    }

    // Set state value
    async setState(id, value, ack = false) {
        return new Promise((resolve, reject) => {
            if (!this.connected) {
                reject(new Error('Not connected to ioBroker'));
                return;
            }

            this.socket.emit('setState', id, { val: value, ack }, (error) => {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        });
    }

    // Disconnect from ioBroker
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.connected = false;
        }
    }

    // Get cached state without server request
    getCachedState(id) {
        return this.states.get(id);
    }

    // Check if connected
    isConnected() {
        return this.connected;
    }
}

export default IoBrokerClient;