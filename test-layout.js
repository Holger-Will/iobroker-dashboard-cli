import LayoutEngine from './layout-engine.js';
import TerminalRenderer from './terminal-renderer.js';

// Create layout engine
const layout = new LayoutEngine({
    groupWidth: 35,
    groupPaddingX: 3,
    groupPaddingY: 1,
    terminalWidth: 120,
    terminalHeight: 30
});

// Create renderer
const renderer = new TerminalRenderer();

// Add sample groups with elements
layout.addGroup({
    id: 'solar',
    title: 'Solar System',
    elements: [
        { id: 'pv-power', type: 'gauge', caption: 'PV Power', value: 791, stateId: 'javascript.0.solar.produktion' },
        { id: 'battery', type: 'gauge', caption: 'Battery', value: 0, stateId: 'javascript.0.solar.batterie' },
        { id: 'export', type: 'gauge', caption: 'Export', value: 121, stateId: 'javascript.0.solar.einspeisung' },
        { id: 'system-state', type: 'indicator', caption: 'System', value: true, stateId: 'javascript.0.solar.systemState' }
    ]
});

layout.addGroup({
    id: 'lights',
    title: 'Lighting',
    elements: [
        { id: 'living-room', type: 'switch', caption: 'Living Room', value: false },
        { id: 'kitchen', type: 'switch', caption: 'Kitchen', value: true }
    ]
});

layout.addGroup({
    id: 'heating',
    title: 'Heating System',
    elements: [
        { id: 'temp-living', type: 'gauge', caption: 'Living Room', value: 22.5 },
        { id: 'temp-bedroom', type: 'gauge', caption: 'Bedroom', value: 20.1 },
        { id: 'temp-kitchen', type: 'gauge', caption: 'Kitchen', value: 23.2 },
        { id: 'heating-on', type: 'indicator', caption: 'Heating Active', value: true },
        { id: 'boost-mode', type: 'button', caption: 'Boost Mode' }
    ]
});

layout.addGroup({
    id: 'security',
    title: 'Security',
    elements: [
        { id: 'alarm-state', type: 'indicator', caption: 'Alarm Armed', value: false },
        { id: 'front-door', type: 'indicator', caption: 'Front Door', value: false },
        { id: 'motion-sensor', type: 'indicator', caption: 'Motion Detected', value: false }
    ]
});

layout.addGroup({
    id: 'weather',
    title: 'Weather',
    elements: [
        { id: 'temperature', type: 'gauge', caption: 'Temperature', value: 18.5 },
        { id: 'humidity', type: 'gauge', caption: 'Humidity', value: 65 },
        { id: 'wind-speed', type: 'sparkline', caption: 'Wind Speed' }
    ]
});

layout.addGroup({
    id: 'media',
    title: 'Media Center',
    elements: [
        { id: 'tv-power', type: 'switch', caption: 'TV Power', value: true },
        { id: 'volume', type: 'gauge', caption: 'Volume', value: 45 },
        { id: 'current-channel', type: 'text', caption: 'Channel', value: 'ARD HD' }
    ]
});

// Calculate and debug layout
const currentLayout = layout.getLayout();
layout.debugLayout();

console.log('\n--- Rendering Dashboard ---\n');

// Clear screen and render
renderer.clearScreen();
renderer.render(currentLayout, '> ', 'help');

// Keep process alive for a moment to see the result
setTimeout(() => {
    console.log('\n\n--- Layout Test Complete ---');
    process.exit(0);
}, 1000);