import { state, loadSavedState, saveState } from './state.js';
import { generateHexGrid, drawMap, updateCoordDisplay, isPointInHex, findTokenAtPosition, getCanvasCoords } from './render.js';

let ui = {};
let ctx;

function $(id) { return document.getElementById(id); }

function validateInput(input, min, max, defVal) {
    let value = parseInt(input.value);
    if (isNaN(value)) value = defVal;
    value = Math.max(min, Math.min(max, value));
    input.value = value;
    return value;
}

function isValidUrl(url) {
    try { const u = new URL(url); return u.protocol === 'http:' || u.protocol === 'https:'; } catch { return false; }
}

function loadMap(url) {
    const DEFAULT_MAP = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1200' height='800' viewBox='0 0 1200 800'%3E%3Crect width='1200' height='800' fill='%23567d46'/%3E%3Cpath d='M0,400 Q300,350 600,500 T1200,400' stroke='%234b93c8' stroke-width='30' fill='none'/%3E%3Cpath d='M800,100 Q850,350 700,600' stroke='%234b93c8' stroke-width='20' fill='none'/%3E%3Ccircle cx='600' cy='450' r='100' fill='%234b93c8'/%3E%3C/svg%3E";
    if (!url) {
        const saved = localStorage.getItem(state.STORAGE_KEY);
        if (saved) {
            try { url = JSON.parse(saved).mapUrl; } catch {}
        }
        if (!url) url = DEFAULT_MAP;
    }
    ui.loading.style.display = 'flex';
    ui.canvas.style.display = 'none';
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
        state.mapImage = img;
        ui.canvas.width = img.width;
        ui.canvas.height = img.height;
        ui.loading.style.display = 'none';
        ui.canvas.style.display = 'block';
        resetView();
        generateHexGrid();
        drawMap(ctx, ui.canvas, ui);
        saveState(ui);
    };
    img.onerror = () => {
        ui.loading.textContent = 'Error loading map';
    };
    img.src = url;
}

function handleCanvasClick(e) {
    if (!state.mapImage) return;
    const {x, y} = getCanvasCoords(e, ui.canvas);
    if (state.isAddingToken) {
        const label = prompt('Enter a label for this token (optional):', '') || '';
        state.tokens.push({ x: (x - state.panX)/state.zoomLevel, y: (y - state.panY)/state.zoomLevel, color: state.tokenColor, label });
        state.isAddingToken = false;
        ui.addTokenBtn.textContent = 'Add Token';
        generateHexGrid();
        saveState(ui);
        drawMap(ctx, ui.canvas, ui);
        return;
    }
    const idx = findTokenAtPosition(x, y);
    if (idx !== -1) {
        state.selectedTokenIndex = idx;
        state.isDraggingToken = true;
        ui.mapContainer.classList.add('token-dragging');
        drawMap(ctx, ui.canvas, ui);
        return;
    }
    for (const hex of state.hexes) {
        if (isPointInHex(x, y, hex)) {
            if (state.revealMode) {
                hex.revealed = true;
                state.revealedHexes[hex.id] = true;
            } else {
                hex.revealed = false;
                delete state.revealedHexes[hex.id];
            }
            saveState(ui);
            drawMap(ctx, ui.canvas, ui);
            break;
        }
    }
}

function handleZoom(e) {
    e.preventDefault();
    const {x, y} = getCanvasCoords(e, ui.canvas);
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.1, Math.min(5, state.zoomLevel * factor));
    const worldX = (x - state.panX)/state.zoomLevel;
    const worldY = (y - state.panY)/state.zoomLevel;
    state.panX = x - worldX * newZoom;
    state.panY = y - worldY * newZoom;
    state.zoomLevel = newZoom;
    drawMap(ctx, ui.canvas, ui);
}

function startPanning(e) {
    if (e.button === 1 || e.button === 2) {
        state.isPanning = true;
        state.lastMouseX = e.clientX;
        state.lastMouseY = e.clientY;
        ui.mapContainer.classList.add('panning');
    }
}

function stopPanning() {
    if (state.isPanning) {
        state.isPanning = false;
        ui.mapContainer.classList.remove('panning');
    }
    if (state.isDraggingToken) {
        state.isDraggingToken = false;
        ui.mapContainer.classList.remove('token-dragging');
        saveState(ui);
    }
}

function handleMouseMove(e) {
    if (!state.mapImage) return;
    const {x, y} = getCanvasCoords(e, ui.canvas);
    if (state.isPanning) {
        const dx = e.clientX - state.lastMouseX;
        const dy = e.clientY - state.lastMouseY;
        state.panX += dx;
        state.panY += dy;
        state.lastMouseX = e.clientX;
        state.lastMouseY = e.clientY;
        drawMap(ctx, ui.canvas, ui);
        return;
    }
    if (state.isDraggingToken && state.selectedTokenIndex !== -1) {
        const token = state.tokens[state.selectedTokenIndex];
        token.x = (x - state.panX)/state.zoomLevel;
        token.y = (y - state.panY)/state.zoomLevel;
        drawMap(ctx, ui.canvas, ui);
        return;
    }
    let hover = null;
    for (const hex of state.hexes) {
        if (isPointInHex(x, y, hex)) { hover = hex; break; }
    }
    updateCoordDisplay(ui, hover);
}

function toggleMode() {
    state.revealMode = !state.revealMode;
    ui.toggleModeBtn.textContent = `Mode: ${state.revealMode ? 'Reveal' : 'Hide'}`;
}

function toggleHeader() {
    const header = $('#header-content');
    header.classList.toggle('collapsed');
    ui.toggleHeaderBtn.textContent = header.classList.contains('collapsed') ? 'Show Header' : 'Hide Header';
}

function resetMap() {
    if (!confirm('Reset revealed hexes?')) return;
    state.revealedHexes = {};
    for (const hex of state.hexes) hex.revealed = false;
    saveState(ui);
    drawMap(ctx, ui.canvas, ui);
}

function resetView() {
    state.zoomLevel = 1;
    state.panX = 0;
    state.panY = 0;
    state.selectedTokenIndex = -1;
    state.isAddingToken = false;
    ui.addTokenBtn.textContent = 'Add Token';
    drawMap(ctx, ui.canvas, ui);
}

function toggleAddTokenMode() {
    state.isAddingToken = !state.isAddingToken;
    ui.addTokenBtn.textContent = state.isAddingToken ? 'Cancel' : 'Add Token';
}

function clearTokens() {
    if (confirm('Clear all tokens?')) {
        state.tokens = [];
        state.selectedTokenIndex = -1;
        saveState(ui);
        drawMap(ctx, ui.canvas, ui);
    }
}

function handleExport() {
    const data = {
        mapUrl: ui.mapUrlInput.value,
        settings: {
            hexSize: state.hexSize,
            offsetX: state.offsetX,
            offsetY: state.offsetY,
            columnCount: state.columnCount,
            rowCount: state.rowCount,
            orientation: state.orientation,
            mapScale: state.mapScale,
            fogColor: state.fogColor,
            fogOpacity: state.fogOpacity,
            gridColor: state.gridColor,
            gridThickness: state.gridThickness,
            tokenColor: state.tokenColor
        },
        view: { zoomLevel: state.zoomLevel, panX: state.panX, panY: state.panY },
        tokens: state.tokens,
        revealedHexes: state.revealedHexes
    };
    ui.exportJsonTextarea.value = JSON.stringify(data, null, 2);
    ui.exportModal.style.display = 'block';
}

function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
        try {
            const data = JSON.parse(evt.target.result);
            if (data.settings) {
                Object.assign(state, data.settings);
            }
            if (data.view) {
                state.zoomLevel = data.view.zoomLevel || 1;
                state.panX = data.view.panX || 0;
                state.panY = data.view.panY || 0;
            }
            state.revealedHexes = data.revealedHexes || {};
            state.tokens = data.tokens ? data.tokens.map(t => ({x:t.x,y:t.y,color:t.color,label:t.label||''})) : [];
            ui.mapUrlInput.value = data.mapUrl || '';
            loadMap(data.mapUrl);
            saveState(ui);
        } catch(err) {
            console.error('Import error', err);
        }
    };
    reader.readAsText(file);
}

function setupEventListeners() {
    const { canvas, debugToggle, resetBtn, exportBtn, importFile, toggleModeBtn, toggleHeaderBtn, resetViewBtn, addTokenBtn, clearTokensBtn, loadUrlBtn, mapUrlInput, hexSizeInput, offsetXInput, offsetYInput, columnsInput, rowsInput, orientationInput, mapScaleInput, fogColorInput, fogOpacityInput, gridColorInput, gridThicknessInput, tokenColorInput, exportModalClose, copyJsonBtn, downloadJsonBtn } = ui;
    canvas.addEventListener('click', handleCanvasClick);
    canvas.addEventListener('wheel', handleZoom);
    canvas.addEventListener('mousedown', startPanning);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', stopPanning);
    canvas.addEventListener('mouseleave', stopPanning);
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    window.addEventListener('resize', () => drawMap(ctx, canvas, ui));

    hexSizeInput.addEventListener('change', () => { state.hexSize = validateInput(hexSizeInput, 10, 300, 40); generateHexGrid(); drawMap(ctx, canvas, ui); saveState(ui); });
    offsetXInput.addEventListener('change', () => { state.offsetX = validateInput(offsetXInput, -1000, 1000, 0); generateHexGrid(); drawMap(ctx, canvas, ui); saveState(ui); });
    offsetYInput.addEventListener('change', () => { state.offsetY = validateInput(offsetYInput, -1000, 1000, 0); generateHexGrid(); drawMap(ctx, canvas, ui); saveState(ui); });
    columnsInput.addEventListener('change', () => { state.columnCount = validateInput(columnsInput, 1, 200, 20); generateHexGrid(); drawMap(ctx, canvas, ui); saveState(ui); });
    rowsInput.addEventListener('change', () => { state.rowCount = validateInput(rowsInput, 1, 200, 15); generateHexGrid(); drawMap(ctx, canvas, ui); saveState(ui); });
    orientationInput.addEventListener('change', () => { state.orientation = orientationInput.value; generateHexGrid(); drawMap(ctx, canvas, ui); saveState(ui); });
    mapScaleInput.addEventListener('change', () => { state.mapScale = validateInput(mapScaleInput, 10, 500, 100); drawMap(ctx, canvas, ui); saveState(ui); });
    fogColorInput.addEventListener('change', () => { state.fogColor = fogColorInput.value; drawMap(ctx, canvas, ui); saveState(ui); });
    fogOpacityInput.addEventListener('input', () => { state.fogOpacity = parseFloat(fogOpacityInput.value); drawMap(ctx, canvas, ui); saveState(ui); });
    gridColorInput.addEventListener('change', () => { state.gridColor = gridColorInput.value; drawMap(ctx, canvas, ui); saveState(ui); });
    gridThicknessInput.addEventListener('input', () => { state.gridThickness = parseFloat(gridThicknessInput.value); drawMap(ctx, canvas, ui); saveState(ui); });
    tokenColorInput.addEventListener('change', () => { state.tokenColor = tokenColorInput.value; drawMap(ctx, canvas, ui); saveState(ui); });

    toggleModeBtn.addEventListener('click', toggleMode);
    toggleHeaderBtn.addEventListener('click', toggleHeader);
    resetBtn.addEventListener('click', resetMap);
    resetViewBtn.addEventListener('click', resetView);
    addTokenBtn.addEventListener('click', toggleAddTokenMode);
    clearTokensBtn.addEventListener('click', clearTokens);

    loadUrlBtn.addEventListener('click', () => { const url = mapUrlInput.value.trim(); if (url && isValidUrl(url)) loadMap(url); });
    mapUrlInput.addEventListener('keypress', e => { if (e.key === 'Enter') loadUrlBtn.click(); });

    debugToggle.addEventListener('click', () => { state.debugMode = !state.debugMode; drawMap(ctx, canvas, ui); });
    exportBtn.addEventListener('click', handleExport);
    exportModalClose.addEventListener('click', () => { ui.exportModal.style.display = 'none'; });
    copyJsonBtn.addEventListener('click', () => { ui.exportJsonTextarea.select(); navigator.clipboard.writeText(ui.exportJsonTextarea.value); });
    downloadJsonBtn.addEventListener('click', () => {
        const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(ui.exportJsonTextarea.value);
        const a = document.createElement('a');
        a.href = dataStr;
        a.download = 'hex-map-state.json';
        document.body.appendChild(a);
        a.click();
        a.remove();
    });
    importFile.addEventListener('change', handleImport);
}

export function init() {
    ui = {
        canvas: $('#map-canvas'),
        loading: $('#loading'),
        mapContainer: $('#map-container'),
        debugInfo: $('#debug-info'),
        statusIndicator: $('#status-indicator'),
        debugToggle: $('#debug-toggle'),
        resetBtn: $('#reset-map-btn'),
        exportBtn: $('#export-btn'),
        importFile: $('#import-file'),
        toggleModeBtn: $('#toggle-mode-btn'),
        toggleHeaderBtn: $('#toggle-header-btn'),
        resetViewBtn: $('#reset-view-btn'),
        addTokenBtn: $('#add-token-btn'),
        clearTokensBtn: $('#clear-tokens-btn'),
        loadUrlBtn: $('#load-url-btn'),
        mapUrlInput: $('#map-url'),
        hexSizeInput: $('#hex-size'),
        offsetXInput: $('#offset-x'),
        offsetYInput: $('#offset-y'),
        columnsInput: $('#columns'),
        rowsInput: $('#rows'),
        orientationInput: $('#orientation'),
        mapScaleInput: $('#map-scale'),
        fogColorInput: $('#fog-color'),
        fogOpacityInput: $('#fog-opacity'),
        gridColorInput: $('#grid-color'),
        gridThicknessInput: $('#grid-thickness'),
        tokenColorInput: $('#token-color'),
        exportModal: $('#export-modal'),
        exportModalClose: $('#export-modal-close'),
        exportJsonTextarea: $('#export-json'),
        copyJsonBtn: $('#copy-json-btn'),
        downloadJsonBtn: $('#download-json-btn'),
        zoomDisplay: $('#zoom-display'),
        coordDisplay: $('#coord-display')
    };
    ctx = ui.canvas.getContext('2d');
    loadSavedState(ui);
    generateHexGrid();
    loadMap();
    setupEventListeners();
    drawMap(ctx, ui.canvas, ui);
}

document.addEventListener('DOMContentLoaded', init);
