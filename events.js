export function setupEventListeners(ui, handlers) {
    const {
        canvas,
        debugToggle,
        resetBtn,
        exportBtn,
        importFile,
        toggleModeBtn,
        toggleSidebarBtn,
        resetViewBtn,
        addTokenBtn,
        clearTokensBtn,
        loadUrlBtn,
        mapUrlInput,
        hexSizeInput,
        offsetXInput,
        offsetYInput,
        columnsInput,
        rowsInput,
        mapScaleInput,
        fogColorInput,
        fogOpacityInput,
        gridColorInput,
        gridThicknessInput,
        tokenColorInput,
        exportModal,
        exportModalClose,
        exportJsonTextarea,
        copyJsonBtn,
        downloadJsonBtn
    } = ui;

    const {
        handleCanvasClick,
        handleZoom,
        startPanning,
        stopPanning,
        handleMouseMove,
        validateInput,
        loadMap,
        generateHexGrid,
        drawMap,
        saveState,
        toggleMode,
        toggleSidebar,
        resetMap,
        resetView,
        toggleAddTokenMode,
        clearTokens,
        handleExport,
        handleImport
    } = handlers;

    canvas.addEventListener('click', handleCanvasClick);
    hexSizeInput.addEventListener('change', function() {
        handlers.state.hexSize = validateInput(this, 10, 300, 40);
        generateHexGrid();
        drawMap();
        saveState();
    });
    offsetXInput.addEventListener('change', function() {
        handlers.state.offsetX = validateInput(this, -1000, 1000, 0);
        generateHexGrid();
        drawMap();
        saveState();
    });
    offsetYInput.addEventListener('change', function() {
        handlers.state.offsetY = validateInput(this, -1000, 1000, 0);
        generateHexGrid();
        drawMap();
        saveState();
    });
    columnsInput.addEventListener('change', function() {
        handlers.state.columnCount = validateInput(this, 1, 200, 20);
        generateHexGrid();
        drawMap();
        saveState();
    });
    rowsInput.addEventListener('change', function() {
        handlers.state.rowCount = validateInput(this, 1, 200, 15);
        generateHexGrid();
        drawMap();
        saveState();
    });
    mapScaleInput.addEventListener('change', function() {
        handlers.state.mapScale = validateInput(this, 10, 500, 100);
        drawMap();
        saveState();
    });
    fogColorInput.addEventListener('change', function() {
        handlers.state.fogColor = this.value;
        drawMap();
        saveState();
    });
    fogOpacityInput.addEventListener('input', function() {
        handlers.state.fogOpacity = parseFloat(this.value);
        drawMap();
        saveState();
    });
    gridColorInput.addEventListener('change', function() {
        handlers.state.gridColor = this.value;
        drawMap();
        saveState();
    });
    gridThicknessInput.addEventListener('input', function() {
        handlers.state.gridThickness = parseFloat(this.value);
        drawMap();
        saveState();
    });
    tokenColorInput.addEventListener('change', function() {
        handlers.state.tokenColor = this.value;
        drawMap();
        saveState();
    });

    toggleModeBtn.addEventListener('click', toggleMode);
    toggleSidebarBtn.addEventListener('click', toggleSidebar);
    resetBtn.addEventListener('click', resetMap);
    resetViewBtn.addEventListener('click', resetView);
    addTokenBtn.addEventListener('click', toggleAddTokenMode);
    clearTokensBtn.addEventListener('click', clearTokens);

    loadUrlBtn.addEventListener('click', function() {
        const url = mapUrlInput.value.trim();
        if (!url) return;
        loadMap(url);
    });
    mapUrlInput.addEventListener('input', function() {
        const url = mapUrlInput.value.trim();
        if (!url) {
            mapUrlInput.classList.remove('invalid-input');
        } else if (/^https?:\/\//.test(url)) {
            mapUrlInput.classList.remove('invalid-input');
        } else {
            mapUrlInput.classList.add('invalid-input');
        }
    });
    mapUrlInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') loadUrlBtn.click();
    });

    canvas.addEventListener('wheel', handleZoom);
    canvas.addEventListener('mousedown', startPanning);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', stopPanning);
    canvas.addEventListener('mouseleave', stopPanning);
    canvas.addEventListener('contextmenu', e => e.preventDefault());

    window.addEventListener('resize', drawMap);
    debugToggle.addEventListener('click', function() {
        handlers.state.debugMode = !handlers.state.debugMode;
        ui.debugInfo.style.display = handlers.state.debugMode ? 'block' : 'none';
        drawMap();
    });
    exportBtn.addEventListener('click', handleExport);
    exportModalClose.addEventListener('click', () => { exportModal.style.display = 'none'; });
    copyJsonBtn.addEventListener('click', () => { exportJsonTextarea.select(); navigator.clipboard.writeText(exportJsonTextarea.value); });
    downloadJsonBtn.addEventListener('click', () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(exportJsonTextarea.value);
        const a = document.createElement('a');
        a.setAttribute('href', dataStr);
        a.setAttribute('download', 'hex-map-state.json');
        document.body.appendChild(a);
        a.click();
        a.remove();
    });
    importFile.addEventListener('change', handleImport);
    window.addEventListener('click', function(event) {
        if (event.target === exportModal) exportModal.style.display = 'none';
    });
    document.addEventListener('keydown', function(event) {
        if (event.ctrlKey && event.key === 'e') { event.preventDefault(); handleExport(); }
        if (event.ctrlKey && event.key === 'i') { event.preventDefault(); importFile.click(); }
        if (event.ctrlKey && event.key === 'm') { event.preventDefault(); toggleMode(); }
        if (event.ctrlKey && event.key === 't') { event.preventDefault(); toggleAddTokenMode(); }
        if (event.key === 'Escape') {
            if (handlers.state.isAddingToken) { toggleAddTokenMode(); }
            else if (handlers.state.selectedTokenIndex !== -1) {
                handlers.state.selectedTokenIndex = -1;
                drawMap();
            }
        }
        if (event.key === 'Delete' && handlers.state.selectedTokenIndex !== -1) {
            handlers.state.tokens.splice(handlers.state.selectedTokenIndex, 1);
            handlers.state.selectedTokenIndex = -1;
            drawMap();
            saveState();
        }
    });
}
