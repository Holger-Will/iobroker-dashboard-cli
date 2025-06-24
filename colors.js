// ANSI color codes for terminal
export const COLORS = {
    // Reset
    reset: '\x1b[0m',
    
    // Text colors
    black: '\x1b[30m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    
    // Bright text colors
    brightBlack: '\x1b[90m',
    brightRed: '\x1b[91m',
    brightGreen: '\x1b[92m',
    brightYellow: '\x1b[93m',
    brightBlue: '\x1b[94m',
    brightMagenta: '\x1b[95m',
    brightCyan: '\x1b[96m',
    brightWhite: '\x1b[97m',
    
    // Background colors
    bgBlack: '\x1b[40m',
    bgRed: '\x1b[41m',
    bgGreen: '\x1b[42m',
    bgYellow: '\x1b[43m',
    bgBlue: '\x1b[44m',
    bgMagenta: '\x1b[45m',
    bgCyan: '\x1b[46m',
    bgWhite: '\x1b[47m',
    
    // Styles
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    italic: '\x1b[3m',
    underline: '\x1b[4m',
    blink: '\x1b[5m',
    reverse: '\x1b[7m',
    strikethrough: '\x1b[9m'
};

// Border styles for different themes
export const BORDER_STYLES = {
    rounded: {
        topLeft: '╭',
        topRight: '╮',
        bottomLeft: '╰',
        bottomRight: '╯',
        horizontal: '─',
        vertical: '│'
    },
    square: {
        topLeft: '┌',
        topRight: '┐',
        bottomLeft: '└',
        bottomRight: '┘',
        horizontal: '─',
        vertical: '│'
    },
    thick: {
        topLeft: '┏',
        topRight: '┓',
        bottomLeft: '┗',
        bottomRight: '┛',
        horizontal: '━',
        vertical: '┃'
    },
    double: {
        topLeft: '╔',
        topRight: '╗',
        bottomLeft: '╚',
        bottomRight: '╝',
        horizontal: '═',
        vertical: '║'
    }
};

// Built-in color schemes
export const COLOR_SCHEMES = {
    default: {
        active: COLORS.brightGreen,
        inactive: COLORS.brightBlack,
        warning: COLORS.brightYellow,
        error: COLORS.brightRed,
        positive: COLORS.green,
        negative: COLORS.red,
        neutral: COLORS.white,
        charging: COLORS.brightBlue,
        discharging: COLORS.brightYellow,
        border: COLORS.brightBlue,
        title: COLORS.brightCyan,
        caption: COLORS.white,
        value: COLORS.brightWhite,
        unit: COLORS.brightBlack,
        prompt: COLORS.brightGreen,
        input: COLORS.brightWhite,
        selectedBg: COLORS.bgBlue,
        selectedText: COLORS.brightWhite,
        borderStyle: BORDER_STYLES.rounded
    },
    
    dark: {
        active: '\x1b[38;5;120m',    // Bright green
        inactive: '\x1b[38;5;240m',  // Dark gray
        warning: '\x1b[38;5;228m',   // Light yellow
        error: '\x1b[38;5;196m',     // Bright red
        positive: '\x1b[38;5;46m',   // Green
        negative: '\x1b[38;5;203m',  // Light red
        neutral: '\x1b[38;5;255m',   // White
        charging: '\x1b[38;5;81m',   // Cyan
        discharging: '\x1b[38;5;220m', // Gold
        border: '\x1b[38;5;75m',     // Light blue
        title: '\x1b[38;5;117m',     // Light cyan
        caption: '\x1b[38;5;253m',   // Light gray
        value: '\x1b[38;5;255m',     // Bright white
        unit: '\x1b[38;5;242m',      // Medium gray
        prompt: '\x1b[38;5;120m',    // Bright green
        input: '\x1b[38;5;255m',     // Bright white
        selectedBg: '\x1b[48;5;24m', // Dark blue bg
        selectedText: '\x1b[38;5;255m', // White text
        borderStyle: BORDER_STYLES.rounded
    },
    
    light: {
        active: '\x1b[38;5;22m',     // Dark green
        inactive: '\x1b[38;5;247m',  // Light gray
        warning: '\x1b[38;5;130m',   // Dark orange
        error: '\x1b[38;5;124m',     // Dark red
        positive: '\x1b[38;5;28m',   // Forest green
        negative: '\x1b[38;5;88m',   // Dark red
        neutral: '\x1b[38;5;16m',    // Black
        charging: '\x1b[38;5;25m',   // Dark blue
        discharging: '\x1b[38;5;94m', // Brown
        border: '\x1b[38;5;25m',     // Dark blue
        title: '\x1b[38;5;24m',      // Blue
        caption: '\x1b[38;5;235m',   // Dark gray
        value: '\x1b[38;5;16m',      // Black
        unit: '\x1b[38;5;240m',      // Gray
        prompt: '\x1b[38;5;22m',     // Dark green
        input: '\x1b[38;5;16m',      // Black
        selectedBg: '\x1b[48;5;152m', // Light blue bg
        selectedText: '\x1b[38;5;16m', // Black text
        borderStyle: BORDER_STYLES.square
    },
    
    matrix: {
        active: '\x1b[38;5;46m',     // Matrix green
        inactive: '\x1b[38;5;22m',   // Dark green
        warning: '\x1b[38;5;226m',   // Yellow
        error: '\x1b[38;5;196m',     // Red
        positive: '\x1b[38;5;40m',   // Bright green
        negative: '\x1b[38;5;196m',  // Red
        neutral: '\x1b[38;5;46m',    // Green
        charging: '\x1b[38;5;46m',   // Green
        discharging: '\x1b[38;5;226m', // Yellow
        border: '\x1b[38;5;46m',     // Matrix green
        title: '\x1b[38;5;40m',      // Bright green
        caption: '\x1b[38;5;46m',    // Green
        value: '\x1b[38;5;46m',      // Green
        unit: '\x1b[38;5;22m',       // Dark green
        prompt: '\x1b[38;5;46m',     // Green
        input: '\x1b[38;5;46m',      // Green
        selectedBg: '\x1b[48;5;22m', // Dark green bg
        selectedText: '\x1b[38;5;46m', // Green text
        borderStyle: BORDER_STYLES.thick
    },
    
    retro: {
        active: '\x1b[38;5;214m',    // Orange
        inactive: '\x1b[38;5;94m',   // Brown
        warning: '\x1b[38;5;226m',   // Yellow
        error: '\x1b[38;5;196m',     // Red
        positive: '\x1b[38;5;82m',   // Light green
        negative: '\x1b[38;5;196m',  // Red
        neutral: '\x1b[38;5;215m',   // Peach
        charging: '\x1b[38;5;39m',   // Blue
        discharging: '\x1b[38;5;214m', // Orange
        border: '\x1b[38;5;214m',    // Orange
        title: '\x1b[38;5;208m',     // Dark orange
        caption: '\x1b[38;5;215m',   // Peach
        value: '\x1b[38;5;230m',     // Light yellow
        unit: '\x1b[38;5;94m',       // Brown
        prompt: '\x1b[38;5;214m',    // Orange
        input: '\x1b[38;5;230m',     // Light yellow
        selectedBg: '\x1b[48;5;52m', // Dark red bg
        selectedText: '\x1b[38;5;214m', // Orange text
        borderStyle: BORDER_STYLES.double
    },
    
    ocean: {
        active: '\x1b[38;5;51m',     // Cyan
        inactive: '\x1b[38;5;240m',  // Gray
        warning: '\x1b[38;5;226m',   // Yellow
        error: '\x1b[38;5;196m',     // Red
        positive: '\x1b[38;5;82m',   // Green
        negative: '\x1b[38;5;196m',  // Red
        neutral: '\x1b[38;5;117m',   // Light blue
        charging: '\x1b[38;5;27m',   // Blue
        discharging: '\x1b[38;5;226m', // Yellow
        border: '\x1b[38;5;39m',     // Blue
        title: '\x1b[38;5;51m',      // Cyan
        caption: '\x1b[38;5;117m',   // Light blue
        value: '\x1b[38;5;159m',     // Light cyan
        unit: '\x1b[38;5;240m',      // Gray
        prompt: '\x1b[38;5;51m',     // Cyan
        input: '\x1b[38;5;159m',     // Light cyan
        selectedBg: '\x1b[48;5;17m', // Dark blue bg
        selectedText: '\x1b[38;5;51m', // Cyan text
        borderStyle: BORDER_STYLES.rounded
    }
};

// Current active theme (defaults to default scheme)
export let THEMES = { ...COLOR_SCHEMES.default };

// Current theme name tracking
export let currentThemeName = 'default';

// Function to apply a color scheme
export function applyColorScheme(schemeName) {
    if (!COLOR_SCHEMES[schemeName]) {
        console.warn(`Unknown color scheme: ${schemeName}`);
        return false;
    }
    
    // Replace all THEMES properties with the new scheme
    Object.assign(THEMES, COLOR_SCHEMES[schemeName]);
    currentThemeName = schemeName;
    return true;
}

// Get current theme name
export function getCurrentTheme() {
    return currentThemeName;
}

// Custom theme storage
let customThemes = {};

// Save a custom theme
export function saveCustomTheme(name, themeData) {
    if (!name || typeof name !== 'string') {
        throw new Error('Theme name must be a non-empty string');
    }
    
    if (!themeData || typeof themeData !== 'object') {
        throw new Error('Theme data must be an object');
    }
    
    // Validate theme data has required properties
    const requiredProps = ['active', 'inactive', 'border', 'title', 'caption', 'value', 'unit', 'prompt', 'input'];
    for (const prop of requiredProps) {
        if (!(prop in themeData)) {
            throw new Error(`Missing required theme property: ${prop}`);
        }
    }
    
    customThemes[name] = { ...themeData };
    return true;
}

// Load a custom theme
export function loadCustomTheme(name) {
    if (!customThemes[name]) {
        return null;
    }
    return { ...customThemes[name] };
}

// Get all available themes (built-in + custom)
export function getAllThemes() {
    return {
        builtin: Object.keys(COLOR_SCHEMES),
        custom: Object.keys(customThemes)
    };
}

// Apply any theme (built-in or custom)
export function applyTheme(themeName) {
    // Try built-in schemes first
    if (COLOR_SCHEMES[themeName]) {
        return applyColorScheme(themeName);
    }
    
    // Try custom themes
    const customTheme = loadCustomTheme(themeName);
    if (customTheme) {
        Object.assign(THEMES, customTheme);
        currentThemeName = themeName;
        return true;
    }
    
    return false;
}

// Save current theme as custom theme
export function saveCurrentThemeAs(name) {
    if (!name || typeof name !== 'string') {
        throw new Error('Theme name must be a non-empty string');
    }
    
    return saveCustomTheme(name, { ...THEMES });
}

// Delete a custom theme
export function deleteCustomTheme(name) {
    if (customThemes[name]) {
        delete customThemes[name];
        return true;
    }
    return false;
}

// Export custom themes data
export function exportCustomThemes() {
    return JSON.stringify(customThemes, null, 2);
}

// Import custom themes data
export function importCustomThemes(jsonData) {
    try {
        const imported = JSON.parse(jsonData);
        if (typeof imported === 'object' && imported !== null) {
            customThemes = { ...customThemes, ...imported };
            return true;
        }
    } catch (error) {
        throw new Error('Invalid JSON data for theme import');
    }
    return false;
}

// Function to get available color scheme names
export function getAvailableSchemes() {
    return Object.keys(COLOR_SCHEMES);
}

// Color helper functions
export function colorize(text, color) {
    return `${color}${text}${COLORS.reset}`;
}

export function colorizeWithBackground(text, textColor, bgColor) {
    return `${bgColor}${textColor}${text}${COLORS.reset}`;
}

// Conditional coloring based on value
export function colorizeValue(value, options = {}) {
    const {
        positiveColor = THEMES.positive,
        negativeColor = THEMES.negative,
        zeroColor = THEMES.neutral,
        threshold = 0
    } = options;
    
    if (typeof value === 'boolean') {
        return colorize(value ? 'ON' : 'OFF', value ? THEMES.active : THEMES.inactive);
    }
    
    if (typeof value === 'number') {
        let color;
        if (value > threshold) {
            color = positiveColor;
        } else if (value < threshold) {
            color = negativeColor;
        } else {
            color = zeroColor;
        }
        return colorize(value.toString(), color);
    }
    
    return colorize(value.toString(), THEMES.value);
}

// Color indicators based on state
export function colorizeIndicator(active, options = {}) {
    const {
        activeChar = '●',
        inactiveChar = '○',
        activeColor = THEMES.active,
        inactiveColor = THEMES.inactive
    } = options;
    
    const char = active ? activeChar : inactiveChar;
    const color = active ? activeColor : inactiveColor;
    
    return colorize(char, color);
}

// Color switches with block characters
export function colorizeSwitch(active, options = {}) {
    const {
        activeDisplay = '░░█',  // ON: light blocks with solid end
        inactiveDisplay = '█░░', // OFF: solid block with light end
        activeColor = THEMES.active,
        inactiveColor = THEMES.inactive
    } = options;
    
    const display = active ? activeDisplay : inactiveDisplay;
    const color = active ? activeColor : inactiveColor;
    
    return colorize(display, color);
}

// Color gauge values based on thresholds
export function colorizeGauge(value, options = {}) {
    const {
        min = 0,
        max = 100,
        warningThreshold = 0.8,
        errorThreshold = 0.95,
        lowColor = THEMES.positive,
        warningColor = THEMES.warning,
        errorColor = THEMES.error
    } = options;
    
    if (typeof value !== 'number') {
        return colorize(value.toString(), THEMES.neutral);
    }
    
    const percentage = (value - min) / (max - min);
    
    let color;
    if (percentage >= errorThreshold) {
        color = errorColor;
    } else if (percentage >= warningThreshold) {
        color = warningColor;
    } else {
        color = lowColor;
    }
    
    return colorize(value.toString(), color);
}

// Color power values (special handling for positive/negative)
export function colorizePower(value, unit = 'W') {
    if (typeof value !== 'number') {
        return colorize(`${value}${unit}`, THEMES.neutral);
    }
    
    let color;
    let prefix = '';
    
    if (value > 0) {
        color = THEMES.positive; // Green for positive (generating/exporting)
    } else if (value < 0) {
        color = THEMES.charging; // Blue for negative (charging/importing)
        prefix = '';  // Keep the minus sign
    } else {
        color = THEMES.neutral;
    }
    
    const formattedValue = value.toFixed(1);
    const coloredValue = colorize(formattedValue, color);
    const coloredUnit = colorize(unit, THEMES.unit);
    
    return `${prefix}${coloredValue}${coloredUnit}`;
}

// Color system state strings
export function colorizeSystemState(state) {
    const stateStr = state.toString().toLowerCase();
    
    if (stateStr.includes('running') || stateStr.includes('active') || stateStr.includes('on')) {
        return colorize(state, THEMES.active);
    } else if (stateStr.includes('warning') || stateStr.includes('warn')) {
        return colorize(state, THEMES.warning);
    } else if (stateStr.includes('error') || stateStr.includes('fail') || stateStr.includes('off')) {
        return colorize(state, THEMES.error);
    } else {
        return colorize(state, THEMES.neutral);
    }
}

export default {
    COLORS,
    THEMES,
    COLOR_SCHEMES,
    BORDER_STYLES,
    colorize,
    colorizeWithBackground,
    colorizeValue,
    colorizeIndicator,
    colorizeSwitch,
    colorizeGauge,
    colorizePower,
    colorizeSystemState,
    applyColorScheme,
    getAvailableSchemes,
    getCurrentTheme,
    saveCustomTheme,
    loadCustomTheme,
    getAllThemes,
    applyTheme,
    saveCurrentThemeAs,
    deleteCustomTheme,
    exportCustomThemes,
    importCustomThemes
};