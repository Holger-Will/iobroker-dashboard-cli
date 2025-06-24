import IoBrokerClient from './iobroker-client.js';

// Test the ioBroker connection
const client = new IoBrokerClient({
    url: 'http://192.168.178.38:8082'
});

// Set up event listeners
client.on('connected', () => {
    console.log('✅ Connected to ioBroker');
    
    // Subscribe to all state changes
    client.subscribeStates('*');
    console.log('📡 Subscribed to state changes');
});

client.on('disconnected', (reason) => {
    console.log('❌ Disconnected from ioBroker:', reason);
});

client.on('reconnected', (attemptNumber) => {
    console.log('🔄 Reconnected to ioBroker (attempt:', attemptNumber, ')');
});

client.on('stateChange', (data) => {
    console.log('📊 State change:', data.id, '=', data.state?.val);
});

client.on('error', (error) => {
    console.error('💥 Error:', error.message);
});

// Connect to ioBroker
try {
    await client.connect();
} catch (error) {
    console.error('Failed to connect:', error.message);
    process.exit(1);
}

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n👋 Shutting down...');
    client.disconnect();
    process.exit(0);
});