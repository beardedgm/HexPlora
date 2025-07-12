export const STORAGE_KEY = 'pointyTopHexMapState';

export const state = {
    hexSize: 40,
    offsetX: 0,
    offsetY: 0,
    columnCount: 20,
    rowCount: 15,
    mapScale: 100,
    hexes: [],
    revealedHexes: {},
    mapImage: null,
    zoomLevel: 1,
    panX: 0,
    panY: 0,
    isPanning: false,
    lastMouseX: 0,
    lastMouseY: 0,
    fogColor: '#225522',
    fogOpacity: 0.85,
    gridColor: '#FFFFFF',
    gridThickness: 1,
    tokenColor: '#FF0000',
    tokens: [],
    isDraggingToken: false,
    selectedTokenIndex: -1,
    isAddingToken: false,
    revealMode: true,
    debugMode: false
};

export function loadSavedState(ui) {
    try {
        const savedState = localStorage.getItem(STORAGE_KEY);
        if (!savedState) return;
        const data = JSON.parse(savedState);
        state.revealedHexes = data.revealedHexes || {};
        if (data.settings) {
            state.hexSize = data.settings.hexSize || state.hexSize;
            state.offsetX = data.settings.offsetX || state.offsetX;
            state.offsetY = data.settings.offsetY || state.offsetY;
            state.columnCount = data.settings.columnCount || state.columnCount;
            state.rowCount = data.settings.rowCount || state.rowCount;
            state.mapScale = data.settings.mapScale || state.mapScale;
            state.fogColor = data.settings.fogColor || state.fogColor;
            state.fogOpacity = data.settings.fogOpacity || state.fogOpacity;
            state.gridColor = data.settings.gridColor || state.gridColor;
            state.gridThickness = data.settings.gridThickness || state.gridThickness;
            state.tokenColor = data.settings.tokenColor || state.tokenColor;

            if (ui) {
                ui.hexSizeInput.value = state.hexSize;
                ui.offsetXInput.value = state.offsetX;
                ui.offsetYInput.value = state.offsetY;
                ui.columnsInput.value = state.columnCount;
                ui.rowsInput.value = state.rowCount;
                ui.mapScaleInput.value = state.mapScale;
                ui.fogColorInput.value = state.fogColor;
                ui.fogOpacityInput.value = state.fogOpacity;
                ui.gridColorInput.value = state.gridColor;
                ui.gridThicknessInput.value = state.gridThickness;
                ui.tokenColorInput.value = state.tokenColor;
            }
        }
        if (data.tokens) {
            state.tokens = data.tokens.map(t => ({
                x: t.x,
                y: t.y,
                color: t.color,
                label: t.label || ''
            }));
        }
    } catch (err) {
        console.error('Error loading saved state:', err);
    }
}

export function updateSavedState(key, value) {
    try {
        let saved = {};
        const current = localStorage.getItem(STORAGE_KEY);
        if (current) saved = JSON.parse(current);
        saved[key] = value;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    } catch (err) {
        console.error('Error updating saved state:', err);
    }
}

export function saveState(ui) {
    try {
        const settings = {
            hexSize: state.hexSize,
            offsetX: state.offsetX,
            offsetY: state.offsetY,
            columnCount: state.columnCount,
            rowCount: state.rowCount,
            mapScale: state.mapScale,
            fogColor: state.fogColor,
            fogOpacity: state.fogOpacity,
            gridColor: state.gridColor,
            gridThickness: state.gridThickness,
            tokenColor: state.tokenColor
        };
        const view = {
            zoomLevel: state.zoomLevel,
            panX: state.panX,
            panY: state.panY
        };
        updateSavedState('revealedHexes', state.revealedHexes);
        updateSavedState('settings', settings);
        updateSavedState('tokens', state.tokens);
        updateSavedState('view', view);
        if (ui && ui.mapUrlInput && ui.mapUrlInput.value.trim()) {
            updateSavedState('mapUrl', ui.mapUrlInput.value);
        }
    } catch (err) {
        console.error('Error saving state:', err);
    }
}
