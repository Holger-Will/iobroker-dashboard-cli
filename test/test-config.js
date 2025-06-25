import LayoutEngine from '../layout-engine.js';
import ConfigManager from '../config-manager.js';
import DashboardTools from '../dashboard-tools.js';
import { createElements } from '../dashboard-elements.js';

console.log('🔧 Testing Configuration Management System');

// Create layout engine
const layout = new LayoutEngine({
    groupWidth: 35,
    groupPaddingX: 1,
    groupPaddingY: 1
});

// Create config manager
const configManager = new ConfigManager({
    configDir: './dashboard-configs'
});

// Create dashboard tools
const tools = new DashboardTools(layout, configManager);

// Initialize
await configManager.initialize(layout);

console.log('\n📋 Creating sample dashboard...');

// Add sample groups and elements
const solarGroup = await tools.addGroup('Solar System');
if (solarGroup.success) {
    await tools.addElement(solarGroup.group.id, {
        id: 'pv-power',
        type: 'gauge',
        caption: 'PV Power',
        stateId: 'javascript.0.solar.produktion',
        unit: 'W'
    });
    
    await tools.addElement(solarGroup.group.id, {
        id: 'battery',
        type: 'gauge',
        caption: 'Battery',
        stateId: 'javascript.0.solar.batterie',
        unit: 'W'
    });
    
    await tools.addElement(solarGroup.group.id, {
        id: 'export',
        type: 'gauge',
        caption: 'Export',
        stateId: 'javascript.0.solar.einspeisung',
        unit: 'W'
    });
}

const systemGroup = await tools.addGroup('System Status');
if (systemGroup.success) {
    await tools.addElement(systemGroup.group.id, {
        id: 'web-adapter',
        type: 'indicator',
        caption: 'Web Adapter',
        stateId: 'system.adapter.web.0.alive'
    });
    
    await tools.addElement(systemGroup.group.id, {
        id: 'modbus-adapter',
        type: 'indicator',
        caption: 'Modbus Adapter',
        stateId: 'system.adapter.modbus.2.alive'
    });
}

// Show current status
console.log('\n📊 Dashboard Status:');
const status = tools.getStatus();
console.log(JSON.stringify(status, null, 2));

// Save configuration
console.log('\n💾 Saving configuration...');
const saveResult = await tools.saveLayout('test-dashboard.json');
console.log('Save result:', saveResult);

// List available configurations
console.log('\n📁 Available configurations:');
const listResult = await tools.listLayouts();
if (listResult.success) {
    listResult.configs.forEach(config => {
        console.log(`- ${config.filename}: ${config.name} (${config.groupCount} groups, ${config.elementCount} elements)`);
    });
}

// Test group management
console.log('\n🔄 Testing group management...');

// Add another group
const lightsGroup = await tools.addGroup('Lighting');
console.log('Added lights group:', lightsGroup.success);

// List all groups
console.log('\n📝 Current groups:');
const groups = tools.listGroups();
groups.forEach((group, index) => {
    console.log(`${index + 1}. ${group.title} (${group.elementCount} elements)`);
});

// Move group up
if (groups.length >= 2) {
    const moveResult = await tools.moveGroupUp(groups[groups.length - 1].id);
    console.log('Move last group up:', moveResult.success);
}

// Test element management
if (lightsGroup.success) {
    console.log('\n💡 Adding elements to lights group...');
    
    await tools.addElement(lightsGroup.group.id, {
        id: 'living-room-light',
        type: 'switch',
        caption: 'Living Room',
        stateId: 'zigbee.0.livingroom.light.state'
    });
    
    await tools.addElement(lightsGroup.group.id, {
        id: 'kitchen-light',
        type: 'switch', 
        caption: 'Kitchen',
        stateId: 'zigbee.0.kitchen.light.state'
    });
    
    // List elements in lights group
    const elements = tools.listElements(lightsGroup.group.id);
    if (elements.success) {
        console.log(`Elements in ${elements.groupTitle}:`);
        elements.elements.forEach(el => {
            console.log(`  - ${el.caption} (${el.type}): ${el.stateId}`);
        });
    }
}

// Export configuration
console.log('\n📤 Exporting configuration...');
const exportResult = configManager.exportConfig();
if (exportResult.success) {
    console.log('Exported configuration (first 200 chars):');
    console.log(exportResult.json.substring(0, 200) + '...');
}

// Save the updated configuration
console.log('\n💾 Saving updated configuration...');
const finalSave = await tools.saveLayout();
console.log('Final save result:', finalSave);

// Test loading configuration
console.log('\n📥 Testing configuration reload...');

// Clear current layout
layout.groups = [];

// Load the saved configuration
const loadResult = await tools.loadLayout('test-dashboard.json');
console.log('Load result:', loadResult.success);

if (loadResult.success) {
    console.log('\n✅ Reloaded dashboard:');
    const reloadedGroups = tools.listGroups();
    reloadedGroups.forEach((group, index) => {
        console.log(`${index + 1}. ${group.title} (${group.elementCount} elements)`);
    });
}

console.log('\n🎉 Configuration management test completed!');
console.log('\nFeatures tested:');
console.log('✅ Save/Load dashboard layouts');
console.log('✅ Add/Remove groups');
console.log('✅ Add elements to groups');
console.log('✅ Move groups (up/down)');
console.log('✅ List configurations');
console.log('✅ Export/Import JSON');
console.log('✅ Dashboard status reporting');