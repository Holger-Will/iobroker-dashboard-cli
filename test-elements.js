import IoBrokerClient from './iobroker-client.js';
import LayoutEngine from './layout-engine.js';
import SmoothRenderer from './smooth-renderer.js';
import { createElement, createElements } from './dashboard-elements.js';

console.log('Creating ioBroker client...');
const client = new IoBrokerClient({
    url: 'http://192.168.178.38:8082'
});

console.log('Creating layout engine...');
const layout = new LayoutEngine({
    groupWidth: 35,
    groupPaddingX: 1,
    groupPaddingY: 1
});

console.log('Creating renderer...');
const renderer = new SmoothRenderer();

// Create dashboard elements with real state IDs from your ioBroker
const solarElements = createElements([
    { 
        id: 'pv-power', 
        type: 'gauge', 
        caption: 'PV Power', 
        stateId: 'javascript.0.solar.produktion',
        unit: 'W'
    },
    { 
        id: 'battery', 
        type: 'gauge', 
        caption: 'Battery', 
        stateId: 'javascript.0.solar.batterie',
        unit: 'W'
    },
    { 
        id: 'export', 
        type: 'gauge', 
        caption: 'Export', 
        stateId: 'javascript.0.solar.einspeisung',
        unit: 'W'
    },
    { 
        id: 'system-state', 
        type: 'indicator', 
        caption: 'System Running', 
        stateId: 'javascript.0.solar.systemState'
    }
]);

const modbusPowerElements = createElements([
    {
        id: 'dc-power-1',
        type: 'gauge',
        caption: 'DC Power 1',
        stateId: 'modbus.0.inputRegisters.5016_Total_DC_Power',
        unit: 'W'
    },
    {
        id: 'dc-power-2', 
        type: 'gauge',
        caption: 'DC Power 2',
        stateId: 'modbus.1.inputRegisters.5016_Total_DC_Power',
        unit: 'W'
    },
    {
        id: 'load-power',
        type: 'gauge', 
        caption: 'Load Power',
        stateId: 'modbus.1.inputRegisters.13007_load_power',
        unit: 'W'
    }
]);

const systemElements = createElements([
    {
        id: 'web-adapter',
        type: 'indicator',
        caption: 'Web Adapter',
        stateId: 'system.adapter.web.0.alive'
    },
    {
        id: 'modbus-adapter',
        type: 'indicator', 
        caption: 'Modbus Adapter',
        stateId: 'system.adapter.modbus.2.alive'
    },
    {
        id: 'kiwi-adapter',
        type: 'indicator',
        caption: 'Kiwi MCP',
        stateId: 'system.adapter.kiwi.0.alive'
    }
]);

// Add groups with real elements
layout.addGroup({
    id: 'solar',
    title: 'Solar System',
    elements: solarElements
});

layout.addGroup({
    id: 'power',
    title: 'Power Meters', 
    elements: modbusPowerElements
});

layout.addGroup({
    id: 'system',
    title: 'System Status',
    elements: systemElements
});

// Debounced rendering to prevent cursor jumping
let renderTimeout = null;
function debouncedRender() {
    if (renderTimeout) {
        clearTimeout(renderTimeout);
    }
    renderTimeout = setTimeout(() => {
        renderDashboard();
        renderTimeout = null;
    }, 100); // Wait 100ms after last change
}

// Set up event handlers
client.on('connected', () => {
    console.log('✅ Connected to ioBroker');
    
    // Connect all elements to the ioBroker client
    const allElements = [...solarElements, ...modbusPowerElements, ...systemElements];
    allElements.forEach(element => {
        element.connect(client);
        
        // Listen for value changes with debounced rendering
        element.on('valueChanged', (data) => {
            debouncedRender();
        });
    });
    
    // Subscribe to all state changes
    client.subscribeStates('*');
    
    // Initial render
    renderDashboard();
});

client.on('disconnected', (reason) => {
    console.log('❌ Disconnected from ioBroker:', reason);
});

client.on('error', (error) => {
    console.error('💥 Error:', error.message);
});

function renderDashboard() {
    const currentLayout = layout.getLayout();
    renderer.updateRender(currentLayout, '> ', 'Connected - Live Data');
}

// Connect to ioBroker
console.log('Connecting to ioBroker...');
try {
    await client.connect();
} catch (error) {
    console.error('Failed to connect:', error.message);
    process.exit(1);
}

// No need for interval rendering - we have real-time updates now

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n👋 Shutting down...');
    client.disconnect();
    process.exit(0);
});