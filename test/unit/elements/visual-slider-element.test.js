import { expect } from 'chai';
import sinon from 'sinon';
import { createTestUserDataDir, cleanupTestDir } from '../../helpers/test-setup.js';
import { VisualSliderElement } from '../../../dashboard-elements.js';

describe('VisualSliderElement', function() {
    let element;
    let mockIoBrokerClient;
    let testDataDir;

    beforeEach(async function() {
        testDataDir = await createTestUserDataDir();
        
        // Create mock ioBroker client
        mockIoBrokerClient = {
            on: sinon.spy(),
            getState: sinon.stub().resolves({ val: 50 }),
            setState: sinon.stub().resolves()
        };

        // Create visual slider element
        element = new VisualSliderElement({
            id: 'test-slider',
            caption: 'Brightness',
            stateId: 'zigbee.0.light.brightness',
            min: 0,
            max: 100,
            unit: '%',
            interactive: true
        });
    });

    afterEach(async function() {
        await cleanupTestDir(testDataDir);
    });

    describe('initialization', function() {
        it('should initialize with correct properties', function() {
            expect(element.type).to.equal('slider');
            expect(element.caption).to.equal('Brightness');
            expect(element.min).to.equal(0);
            expect(element.max).to.equal(100);
            expect(element.unit).to.equal('%');
            expect(element.interactive).to.be.true;
        });

        it('should have default min/max values', function() {
            const defaultElement = new VisualSliderElement({
                id: 'default-slider',
                caption: 'Test'
            });
            
            expect(defaultElement.min).to.equal(0);
            expect(defaultElement.max).to.equal(100);
        });
    });

    describe('visual representation', function() {
        it('should render slider bar with correct fill percentage', function() {
            element.updateValue(75); // 75%
            
            const rendered = element.render(40);
            
            // Should contain visual slider bar
            expect(rendered).to.include('█'); // Filled part
            expect(rendered).to.include('░'); // Empty part
            expect(rendered).to.include('75%'); // Value display
            expect(rendered).to.include('Brightness'); // Caption
        });

        it('should show empty slider for zero value', function() {
            element.updateValue(0);
            
            const rendered = element.render(40);
            
            // Should be mostly empty blocks
            const emptyBlocks = (rendered.match(/░/g) || []).length;
            const filledBlocks = (rendered.match(/█/g) || []).length;
            
            expect(filledBlocks).to.equal(0);
            expect(emptyBlocks).to.be.greaterThan(0);
        });

        it('should show full slider for maximum value', function() {
            element.updateValue(100);
            
            const rendered = element.render(40);
            
            // Should be mostly filled blocks
            const filledBlocks = (rendered.match(/█/g) || []).length;
            expect(filledBlocks).to.be.greaterThan(0);
        });

        it('should adapt slider length to available width', function() {
            element.updateValue(50);
            
            const narrow = element.render(20);
            const wide = element.render(60);
            
            // Wide version should have longer slider bar
            const narrowSliderLength = (narrow.match(/[█░]/g) || []).length;
            const wideSliderLength = (wide.match(/[█░]/g) || []).length;
            
            expect(wideSliderLength).to.be.greaterThan(narrowSliderLength);
        });
    });

    describe('value handling', function() {
        it('should clamp values to min/max range', function() {
            element.updateValue(-10);
            expect(element.getClampedValue()).to.equal(0);
            
            element.updateValue(150);
            expect(element.getClampedValue()).to.equal(100);
            
            element.updateValue(50);
            expect(element.getClampedValue()).to.equal(50);
        });

        it('should calculate percentage correctly', function() {
            element.updateValue(25);
            expect(element.getPercentage()).to.equal(25);
            
            element.updateValue(0);
            expect(element.getPercentage()).to.equal(0);
            
            element.updateValue(100);
            expect(element.getPercentage()).to.equal(100);
        });

        it('should handle custom min/max ranges', function() {
            const customElement = new VisualSliderElement({
                id: 'custom',
                caption: 'Temperature',
                min: 16,
                max: 30,
                unit: '°C'
            });
            
            customElement.updateValue(23); // 23°C = 50% between 16-30
            expect(customElement.getPercentage()).to.equal(50);
        });
    });

    describe('interactivity', function() {
        it('should support incremental adjustments', function() {
            element.updateValue(50);
            
            // Test increment
            element.increment(10);
            expect(element.value).to.equal(60);
            
            // Test decrement
            element.decrement(20);
            expect(element.value).to.equal(40);
        });

        it('should respect min/max bounds during adjustment', function() {
            element.updateValue(95);
            element.increment(10); // Should clamp to 100
            expect(element.value).to.equal(100);
            
            element.updateValue(5);
            element.decrement(10); // Should clamp to 0
            expect(element.value).to.equal(0);
        });

        it('should emit change events on value adjustment', function() {
            const changeSpy = sinon.spy();
            element.on('valueChanged', changeSpy);
            
            element.updateValue(50);
            element.increment(10);
            
            expect(changeSpy).to.have.been.calledTwice;
        });

        it('should send state updates to ioBroker when interactive', function() {
            element.connect(mockIoBrokerClient);
            mockIoBrokerClient.setState.resolves();
            
            element.increment(10);
            
            expect(mockIoBrokerClient.setState).to.have.been.calledWith(
                'zigbee.0.light.brightness',
                sinon.match.number
            );
        });

        it('should not send state updates when not interactive', function() {
            element.interactive = false;
            element.connect(mockIoBrokerClient);
            
            element.increment(10);
            
            expect(mockIoBrokerClient.setState).to.not.have.been.called;
        });
    });

    describe('keyboard controls', function() {
        it('should support arrow key adjustments', function() {
            element.updateValue(50);
            
            // Simulate arrow key presses
            element.handleKeyPress('ArrowRight');
            expect(element.value).to.be.greaterThan(50);
            
            element.handleKeyPress('ArrowLeft');
            expect(element.value).to.equal(50); // Back to original
        });

        it('should support page up/down for larger adjustments', function() {
            element.updateValue(50);
            const originalValue = element.value;
            
            element.handleKeyPress('PageUp');
            const afterPageUp = element.value;
            
            element.handleKeyPress('PageDown');
            const afterPageDown = element.value;
            
            expect(afterPageUp).to.be.greaterThan(originalValue);
            expect(afterPageDown).to.equal(originalValue);
        });

        it('should support home/end for min/max values', function() {
            element.updateValue(50);
            
            element.handleKeyPress('Home');
            expect(element.value).to.equal(0);
            
            element.handleKeyPress('End');
            expect(element.value).to.equal(100);
        });
    });

    describe('visual themes', function() {
        it('should apply theme colors to slider bar', function() {
            element.updateValue(75);
            
            const rendered = element.render(40);
            
            // Should contain ANSI color codes for theming
            expect(rendered).to.match(/\x1b\[[0-9;]*m/); // ANSI color codes
        });

        it('should highlight active slider when selected', function() {
            element.updateValue(50); // Set a value first
            
            element.setSelected(true);
            const selectedRender = element.render(40);
            
            element.setSelected(false);
            const normalRender = element.render(40);
            
            // Selected version should have different styling
            // Check for theme color differences in caption or slider bar
            expect(selectedRender).to.not.equal(normalRender);
            // More specific check: selected should have active theme colors
            expect(selectedRender).to.include('\x1b['); // Should contain color codes
        });
    });

    describe('special value states', function() {
        it('should handle null/undefined values gracefully', function() {
            element.updateValue(null);
            const rendered = element.render(40);
            
            expect(rendered).to.include('N/A');
            expect(rendered).to.not.include('█'); // No slider bar for invalid values
        });

        it('should display error state for connection issues', function() {
            element.setConnectionState(false);
            const rendered = element.render(40);
            
            expect(rendered).to.include('OFFLINE'); // Or similar error indicator
        });
    });
});