#!/usr/bin/env node

/**
 * Test border rendering issue
 * Run with: node test-border-rendering.js
 */

import SmoothRenderer from './smooth-renderer.js';

// Mock layout object
const mockLayout = {
    terminalWidth: process.stdout.columns || 80,
    terminalHeight: process.stdout.rows || 24,
    groups: []
};

const renderer = new SmoothRenderer();

console.log('Testing border rendering...');
console.log(`Terminal size: ${mockLayout.terminalWidth}x${mockLayout.terminalHeight}`);

// Test message area rendering
const testMessages = [
    { text: 'Test message 1', type: 'info' },
    { text: 'Test message 2 with a longer text that might cause issues', type: 'success' },
    { text: 'Short msg', type: 'warning' }
];

// Clear screen and test
process.stdout.write('\x1b[2J\x1b[H');

renderer.renderMessageArea(mockLayout, testMessages, 0, true); // Command mode
renderer.renderInputField(mockLayout, '[test] > ', 'test input');

// Show cursor
process.stdout.write('\x1b[?25h');

setTimeout(() => {
    console.log('\n\nPress Ctrl+C to exit. Check if right border is properly displayed.');
}, 100);

process.on('SIGINT', () => {
    process.stdout.write('\x1b[2J\x1b[H\x1b[?25h');
    process.exit(0);
});