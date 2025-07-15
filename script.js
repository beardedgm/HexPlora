import { SpatialHashGrid } from './spatialIndex.js';

document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const mapCanvas = document.getElementById('map-layer');
    const gridCanvas = document.getElementById('grid-layer');
    const tokenCanvas = document.getElementById('token-layer');
    const mapCtx = mapCanvas.getContext('2d');
    const gridCtx = gridCanvas.getContext('2d');
    const tokenCtx = tokenCanvas.getContext('2d');

    // The topmost canvas handles interaction
    const canvas = tokenCanvas;
    const ctx = tokenCtx;
    const loadingElement = document.getElementById('loading');
    const mapContainer = document.getElementById('map-container');
    const debugInfo = document.getElementById('debug-info');
    const statusIndicator = document.getElementById('status-indicator');
    
    // Buttons and inputs
    const debugToggle = document.getElementById('debug-toggle');
    const resetBtn = document.getElementById('reset-map-btn');
    const exportBtn = document.getElementById('export-btn');
    const importFile = document.getElementById('import-file');
    const toggleModeBtn = document.getElementById('toggle-mode-btn');
    const toggleHeaderBtn = document.getElementById('toggle-header-btn');
    const resetViewBtn = document.getElementById('reset-view-btn');
    const addTokenBtn = document.getElementById('add-token-btn');
    const removeTokenBtn = document.getElementById('remove-token-btn');
    const clearTokensBtn = document.getElementById('clear-tokens-btn');
    
    // New display elements
    const zoomDisplay = document.getElementById('zoom-display');
    const coordDisplay = document.getElementById('coord-display');
    const undoBtn = document.getElementById('undo-btn');
    const redoBtn = document.getElementById('redo-btn');
    const tokenTooltip = document.getElementById('token-tooltip');
    
    // Export modal elements
    const exportModal = document.getElementById('export-modal');
    const exportModalClose = document.getElementById('export-modal-close');
    const exportJsonTextarea = document.getElementById('export-json');
    const copyJsonBtn = document.getElementById('copy-json-btn');
    const downloadJsonBtn = document.getElementById('download-json-btn');

    // Token label modal elements
    const tokenLabelModal = document.getElementById('token-label-modal');
    const tokenLabelModalClose = document.getElementById('token-label-modal-close');
    const tokenLabelInput = document.getElementById('token-label-input');
    const tokenIconSelect = document.getElementById('token-icon-select');
    const tokenLabelConfirm = document.getElementById('token-label-confirm');
    const tokenLabelCancel = document.getElementById('token-label-cancel');
    const tokenNotesInput = document.getElementById('token-notes-input');
    
    // Debug mode flag
    let debugMode = false;

    // Tooltip state
    let hoveredTokenIndex = -1;
    let tooltipTimer = null;
    
    // Input fields
    const hexSizeInput = document.getElementById('hex-size');
    const offsetXInput = document.getElementById('offset-x');
    const offsetYInput = document.getElementById('offset-y');
    const columnsInput = document.getElementById('columns');
    const rowsInput = document.getElementById('rows');
    const orientationInput = document.getElementById('orientation');
    const loadUrlBtn = document.getElementById('load-url-btn');
    const mapUrlInput = document.getElementById('map-url');
    const mapScaleInput = document.getElementById('map-scale');
    
    // New appearance customization inputs
    const fogColorInput = document.getElementById('fog-color');
    const fogOpacityInput = document.getElementById('fog-opacity');
    const gridColorInput = document.getElementById('grid-color');
    const gridThicknessInput = document.getElementById('grid-thickness');
    const tokenColorInput = document.getElementById('token-color');
    
    // Constants
    const STORAGE_KEY = 'pointyTopHexMapState';
    
    // State variables
    let hexSize = 40;
    let offsetX = 0;
    let offsetY = 0;
    let columnCount = 20;
    let rowCount = 15;
    let orientation = 'pointy';
    let mapScale = 100;
    let hexes = [];
    let revealedHexes = {};
    let mapImage = null;
    
    // New state variables for zoom and pan
    let zoomLevel = 1;
    let panX = 0;
    let panY = 0;
    let isPanning = false;
    let lastMouseX = 0;
    let lastMouseY = 0;
    
    // New state variables for fog/grid appearance
    let fogColor = '#225522';
    let fogOpacity = 0.85;
    let gridColor = '#FFFFFF';
    let gridThickness = 1;
    let tokenColor = '#FF0000';

    // New state variables for tokens
    let tokens = [];
    let isDraggingToken = false;
    let selectedTokenIndex = -1;
    let isAddingToken = false;
    let isRemovingToken = false;
    let pendingTokenPos = null;
    let editingTokenIndex = -1;

    // Spatial indexes
    let hexIndex = new SpatialHashGrid(hexSize * 2);
    let tokenIndex = new SpatialHashGrid(hexSize * 2);

    // History stacks for undo/redo
    let undoStack = [];
    let redoStack = [];

    // Render loop state
    let needsRedraw = false;

    // Flag to ensure we only attempt the default map once per load cycle
    let defaultMapAttempted = false;

    // Utility: debounce execution of a function
    function debounce(fn, delay = 100) {
        let timerId;
        return function(...args) {
            const context = this;
            clearTimeout(timerId);
            timerId = setTimeout(() => fn.apply(context, args), delay);
        };
    }

    // Debounced wrappers for expensive operations
    const debouncedSaveState = debounce(saveState, 300);
    const debouncedRequestRedraw = debounce(requestRedraw, 50);


    function hexToRgb(hex) {
        hex = hex.replace('#', '');
        if (hex.length === 3) {
            hex = hex.split('').map(c => c + c).join('');
        }
        const num = parseInt(hex, 16);
        return {
            r: (num >> 16) & 255,
            g: (num >> 8) & 255,
            b: num & 255
        };
    }
    
    // Interaction mode - true for reveal, false for hide
    let revealMode = true;
    
    // Initialize the application
    init();
    
    function init() {
        loadSavedState();
        updateInputFields();
        setupEventListeners();
        loadMap();
        updateUndoRedoButtons();
        log('App initialized');
    }
    
    function loadSavedState() {
        try {
            const savedState = localStorage.getItem(STORAGE_KEY);
            if (savedState) {
                const parsedState = JSON.parse(savedState);
                
                revealedHexes = parsedState.revealedHexes || {};
                
                if (parsedState.settings) {
                    hexSize = parsedState.settings.hexSize || hexSize;
                    offsetX = parsedState.settings.offsetX || offsetX;
                    offsetY = parsedState.settings.offsetY || offsetY;
                    columnCount = parsedState.settings.columnCount || columnCount;
                    rowCount = parsedState.settings.rowCount || rowCount;
                    mapScale = parsedState.settings.mapScale || mapScale;
                    
                    // Load new appearance settings
                    fogColor = parsedState.settings.fogColor || fogColor;
                    fogOpacity = parsedState.settings.fogOpacity || fogOpacity;
                    gridColor = parsedState.settings.gridColor || gridColor;
                    gridThickness = parsedState.settings.gridThickness || gridThickness;
                    tokenColor = parsedState.settings.tokenColor || tokenColor;
                    orientation = parsedState.settings.orientation || orientation;
                    
                    // Update input fields
                    hexSizeInput.value = hexSize;
                    offsetXInput.value = offsetX;
                    offsetYInput.value = offsetY;
                    columnsInput.value = columnCount;
                    rowsInput.value = rowCount;
                    mapScaleInput.value = mapScale;
                    
                    // Update appearance input fields
                    fogColorInput.value = fogColor;
                    fogOpacityInput.value = fogOpacity;
                    gridColorInput.value = gridColor;
                    gridThicknessInput.value = gridThickness;
                    tokenColorInput.value = tokenColor;
                    orientationInput.value = orientation;
                }
                
                // Load tokens
                if (parsedState.tokens) {
                    tokens = parsedState.tokens.map(t => ({
                        x: t.x,
                        y: t.y,
                        color: t.color,
                        label: t.label || '',
                        icon: t.icon || '',
                        notes: t.notes || ''
                    }));
                    rebuildTokenIndex();
                }
                
                log('Loaded saved state');
            }
        } catch (error) {
            console.error('Error loading saved state:', error);
            log('Error loading saved state: ' + error.message);
        }
    }
    
    function setupEventListeners() {
        // Existing event listeners
        canvas.addEventListener('click', handleCanvasClick);
        
        // Input field event listeners with validation
        hexSizeInput.addEventListener('change', function() {
            hexSize = validateInput(this, 10, 300, 40);
            generateHexGrid();
            requestRedraw();
            saveState();
        });
        
        offsetXInput.addEventListener('change', function() {
            offsetX = validateInput(this, -1000, 1000, 0);
            generateHexGrid();
            requestRedraw();
            saveState();
        });
        
        offsetYInput.addEventListener('change', function() {
            offsetY = validateInput(this, -1000, 1000, 0);
            generateHexGrid();
            requestRedraw();
            saveState();
        });
        
        columnsInput.addEventListener('change', function() {
            columnCount = validateInput(this, 1, 200, 20);
            generateHexGrid();
            requestRedraw();
            saveState();
        });
        
        rowsInput.addEventListener('change', function() {
            rowCount = validateInput(this, 1, 200, 15);
            generateHexGrid();
            requestRedraw();
            saveState();
        });

        orientationInput.addEventListener('change', function() {
            orientation = this.value;
            generateHexGrid();
            requestRedraw();
            saveState();
        });
        
        mapScaleInput.addEventListener('change', function() {
            mapScale = validateInput(this, 10, 500, 100);
            requestRedraw();
            saveState();
        });
        
        // New appearance input event listeners
        fogColorInput.addEventListener('change', function() {
            fogColor = this.value;
            requestRedraw();
            saveState();
        });
        
        fogOpacityInput.addEventListener('input', function() {
            fogOpacity = parseFloat(this.value);
            debouncedRequestRedraw();
            debouncedSaveState();
        });
        
        gridColorInput.addEventListener('change', function() {
            gridColor = this.value;
            requestRedraw();
            saveState();
        });
        
        gridThicknessInput.addEventListener('input', function() {
            gridThickness = parseFloat(this.value);
            debouncedRequestRedraw();
            debouncedSaveState();
        });
        
        tokenColorInput.addEventListener('change', function() {
            tokenColor = this.value;
            requestRedraw();
            saveState();
        });
        
        // Toggle mode button
        toggleModeBtn.addEventListener('click', toggleMode);
        
        // Toggle header button
        toggleHeaderBtn.addEventListener('click', toggleHeader);
        
        resetBtn.addEventListener('click', resetMap);
        
        // New reset view button
        resetViewBtn.addEventListener('click', resetView);
        
        // New token buttons
        addTokenBtn.addEventListener('click', toggleAddTokenMode);
        removeTokenBtn.addEventListener('click', toggleRemoveTokenMode);
        clearTokensBtn.addEventListener('click', clearTokens);
        undoBtn.addEventListener('click', undo);
        redoBtn.addEventListener('click', redo);
        
        loadUrlBtn.addEventListener('click', function() {
            const url = mapUrlInput.value.trim();
            if (!url) {
                showStatus('Please enter a map URL.', 'warning');
                return;
            }

            if (!isValidMapUrl(url)) {
                showStatus('Invalid URL. Please use http or https.', 'error');
                return;
            }

            loadMap(url);
        });
        
        // Validate the URL as the user types
        mapUrlInput.addEventListener('input', function() {
            const url = mapUrlInput.value.trim();
            if (!url || isValidMapUrl(url)) {
                mapUrlInput.classList.remove('invalid-input');
            } else {
                mapUrlInput.classList.add('invalid-input');
                showStatus('Invalid URL format. Use http or https.', 'warning');
            }
        });
        
        mapUrlInput.addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                loadUrlBtn.click();
            }
        });
        
        // Mouse wheel for zoom
        canvas.addEventListener('wheel', handleZoom);
        
        // Mouse events for panning and dragging
        canvas.addEventListener('mousedown', startPanning);
        canvas.addEventListener('mousemove', handleMouseMove);
        canvas.addEventListener('mouseup', stopPanning);
        canvas.addEventListener('mouseleave', stopPanning);
        // Ensure cleanup even if the mouse leaves the canvas or page
        mapContainer.addEventListener('mouseleave', stopPanning);
        document.addEventListener('mouseup', stopPanning);
        document.addEventListener('mouseleave', stopPanning);
        canvas.addEventListener('dblclick', handleCanvasDoubleClick);
        
        // Prevent context menu on right-click but allow right-click event to be handled
        canvas.addEventListener('contextmenu', function(e) {
            e.preventDefault();
        });
        
        window.addEventListener('resize', function() {
            requestRedraw();
        });
        
        debugToggle.addEventListener('click', function() {
            debugMode = !debugMode;
            debugInfo.style.display = debugMode ? 'block' : 'none';
            requestRedraw(); // Redraw to show debug info
            log('Debug mode ' + (debugMode ? 'enabled' : 'disabled'));
        });
        
        // Export button
        exportBtn.addEventListener('click', handleExport);
        
        // Close export modal
        exportModalClose.addEventListener('click', function() {
            exportModal.style.display = 'none';
        });

        // Token label modal events
        tokenLabelModalClose.addEventListener('click', closeTokenLabelModal);
        tokenLabelCancel.addEventListener('click', closeTokenLabelModal);
        tokenLabelConfirm.addEventListener('click', confirmTokenLabel);

        tokenLabelInput.addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                confirmTokenLabel();
            }
        });
        
        // Copy JSON to clipboard
        copyJsonBtn.addEventListener('click', function() {
            exportJsonTextarea.select();
            navigator.clipboard.writeText(exportJsonTextarea.value);
            showStatus('Copied to clipboard!', 'success');
        });
        
        // Download JSON file
        downloadJsonBtn.addEventListener('click', function() {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(exportJsonTextarea.value);
            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href", dataStr);
            downloadAnchorNode.setAttribute("download", "hex-map-state.json");
            document.body.appendChild(downloadAnchorNode);
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
            showStatus('File downloaded', 'success');
        });
        
        // Import file
        importFile.addEventListener('change', handleImport);
        
        // Close modal when clicking outside
        window.addEventListener('click', function(event) {
            if (event.target === exportModal) {
                exportModal.style.display = 'none';
            }
            if (event.target === tokenLabelModal) {
                closeTokenLabelModal();
            }
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', function(event) {
            // Ctrl+E for export
            if (event.ctrlKey && event.key === 'e') {
                event.preventDefault();
                handleExport();
            }
            
            // Ctrl+I for import (focus file input)
            if (event.ctrlKey && event.key === 'i') {
                event.preventDefault();
                importFile.click();
            }
            
            // Ctrl+M to toggle mode
            if (event.ctrlKey && event.key === 'm') {
                event.preventDefault();
                toggleMode();
            }
            
            // Ctrl+T to toggle add token mode
            if (event.ctrlKey && event.key === 't') {
                event.preventDefault();
                toggleAddTokenMode();
            }

            // Ctrl+Z to undo
            if (event.ctrlKey && event.key === 'z') {
                event.preventDefault();
                undo();
            }

            // Ctrl+Y to redo
            if (event.ctrlKey && event.key === 'y') {
                event.preventDefault();
                redo();
            }
            
            // Escape to cancel add token mode or reset selection
            if (event.key === 'Escape') {
                if (isAddingToken) {
                    toggleAddTokenMode();
                } else if (selectedTokenIndex !== -1) {
                    selectedTokenIndex = -1;
                    requestRedraw();
                }
            }
            
            // Delete to remove selected token
            if (event.key === 'Delete' && selectedTokenIndex !== -1) {
                tokens.splice(selectedTokenIndex, 1);
                selectedTokenIndex = -1;
                rebuildTokenIndex();
                requestRedraw();
                saveState();
                pushHistory();
                showStatus('Token deleted', 'info');
            }
        });
    }
    
    function validateInput(inputElement, min, max, defaultValue) {
        let value = parseInt(inputElement.value);
        
        if (isNaN(value)) {
            value = defaultValue;
            inputElement.value = defaultValue;
            showStatus(`Invalid input. Using default value: ${defaultValue}`, 'warning');
        } else if (value < min) {
            value = min;
            inputElement.value = min;
            showStatus(`Value too small. Using minimum value: ${min}`, 'warning');
        } else if (value > max) {
            value = max;
            inputElement.value = max;
            showStatus(`Value too large. Using maximum value: ${max}`, 'warning');
        }
        
        return value;
    }

    // Simple URL validation to ensure http or https scheme
    function isValidMapUrl(url) {
        try {
            const parsed = new URL(url);
            return parsed.protocol === 'http:' || parsed.protocol === 'https:';
        } catch (e) {
            return false;
        }
    }
    
    function loadMap(mapUrl) {
        loadingElement.style.display = 'flex';
        [mapCanvas, gridCanvas, tokenCanvas].forEach(c => c.style.display = 'none');
        loadingElement.textContent = 'Loading map...';
        
        // Default map SVG
        const DEFAULT_MAP = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1200' height='800' viewBox='0 0 1200 800'%3E%3Crect width='1200' height='800' fill='%23567d46'/%3E%3Cpath d='M0,400 Q300,350 600,500 T1200,400' stroke='%234b93c8' stroke-width='30' fill='none'/%3E%3Cpath d='M800,100 Q850,350 700,600' stroke='%234b93c8' stroke-width='20' fill='none'/%3E%3Ccircle cx='600' cy='450' r='100' fill='%234b93c8'/%3E%3C/svg%3E";

        // Reset fallback flag when loading a new URL
        if (mapUrl && mapUrl !== DEFAULT_MAP) {
            defaultMapAttempted = false;
        }
        
        // If no URL provided, try to load from localStorage or use default
        if (!mapUrl || mapUrl.trim() === '') {
            const savedState = localStorage.getItem(STORAGE_KEY);
            if (savedState) {
                try {
                    const stored = JSON.parse(savedState);
                    if (stored.mapUrl && stored.mapUrl.trim() !== '') {
                        mapUrl = stored.mapUrl;
                    } else {
                        mapUrl = DEFAULT_MAP;
                    }
                } catch (e) {
                    console.error('Error parsing saved state:', e);
                    mapUrl = DEFAULT_MAP;
                }
            } else {
                mapUrl = DEFAULT_MAP;
            }
        }
        
        log(`Attempting to load map: ${mapUrl.substring(0, 50)}${mapUrl.length > 50 ? '...' : ''}`);
        
        const img = new Image();
        img.crossOrigin = "Anonymous";
        
        // Set a timeout in case the image takes too long to load or error
        const timeoutId = setTimeout(() => {
            log('Image loading timed out');
            handleImageLoadError(new Error('Loading timed out'), mapUrl);
        }, 15000); // 15 second timeout
        
        img.onload = function() {
            clearTimeout(timeoutId);
            log(`Map loaded successfully: ${img.width}x${img.height}`);

            // Reset fallback state after a successful load
            defaultMapAttempted = false;
            
           mapImage = img;
           [mapCanvas, gridCanvas, tokenCanvas].forEach(c => {
                // Set the canvas drawing buffer size
                c.width = img.width;
                c.height = img.height;
                // Explicitly set CSS size so display matches the image
                c.style.width = img.width + 'px';
                c.style.height = img.height + 'px';
            });
            loadingElement.style.display = 'none';
            mapCanvas.style.display = 'block';
            gridCanvas.style.display = 'block';
            tokenCanvas.style.display = 'block';
            
            // Reset zoom and pan on new map load
            resetView();
            
            // Only update saved URL if it loaded successfully
            updateSavedState('mapUrl', mapUrl);
            mapUrlInput.value = mapUrl;
            
            // Show success status
            showStatus('Map loaded successfully!', 'success');
            
            generateHexGrid();
            requestRedraw();
            pushHistory();
        };
        
        img.onerror = function(error) {
            clearTimeout(timeoutId);
            handleImageLoadError(error, mapUrl);
        };
        
        // Try to load the image
        img.src = mapUrl;
        
        // Function to handle image load errors
        function handleImageLoadError(error, failedUrl) {
            console.error('Error loading map image:', error);
            log(`Error loading map: ${failedUrl.substring(0, 50)}${failedUrl.length > 50 ? '...' : ''}`);
            
            // Show error message
            loadingElement.textContent = 'Error loading map. Please verify the URL and try again.';
            
            // Show error status
            showStatus('Error loading map. Check the URL for typos or CORS issues.', 'error');
            
            // If this wasn't the default map, try to load the default once
            if (failedUrl !== DEFAULT_MAP && !defaultMapAttempted) {
                defaultMapAttempted = true;
                log('Falling back to default map');
                setTimeout(() => {
                    loadMap(DEFAULT_MAP);
                }, 1000); // Add a small delay before trying the default
            } else {
                // If even the default map failed, show a more serious error
                loadingElement.textContent = 'Critical error: Could not load any map. Please refresh the page.';
            }
        }
    }
    
    function generateHexGrid() {
        hexes = [];

        let hexWidth, hexHeight;
        if (orientation === 'pointy') {
            hexWidth = hexSize * Math.sqrt(3);
            hexHeight = hexSize * 2;
        } else {
            hexWidth = hexSize * 2;
            hexHeight = hexSize * Math.sqrt(3);
        }

        hexIndex = new SpatialHashGrid(hexSize * 2);
        for (let row = 0; row < rowCount; row++) {
            for (let col = 0; col < columnCount; col++) {
                let x, y;
                if (orientation === 'pointy') {
                    // odd rows are offset horizontally
                    x = col * hexWidth + (row % 2 === 1 ? hexWidth / 2 : 0) + offsetX;
                    y = row * (hexHeight * 3/4) + offsetY;
                } else {
                    // flat-top grid: odd columns are offset vertically
                    x = col * (hexWidth * 3/4) + offsetX;
                    y = row * hexHeight + (col % 2 === 1 ? hexHeight / 2 : 0) + offsetY;
                }
                
                const hexId = `${col}-${row}`;
                const isRevealed = revealedHexes[hexId] === true;
                
                // Store the hex vertices for efficient hit testing
                const vertices = [];
                const startAngle = orientation === 'pointy' ? Math.PI / 2 : 0;
                for (let i = 0; i < 6; i++) {
                    const angle = (Math.PI / 3) * i + startAngle;
                    const px = x + hexSize * Math.cos(angle);
                    const py = y + hexSize * Math.sin(angle);
                    vertices.push({x: px, y: py});
                }
                
                const hex = {
                    id: hexId,
                    x: x,
                    y: y,
                    row: row,
                    col: col,
                    revealed: isRevealed,
                    vertices: vertices
                };
                hexes.push(hex);
                hexIndex.insert(hex, {
                    xMin: x - hexSize,
                    yMin: y - hexSize,
                    xMax: x + hexSize,
                    yMax: y + hexSize
                });
            }
        }
        
        log(`Generated ${hexes.length} hexes, ${Object.keys(revealedHexes).length} already revealed`);
        rebuildTokenIndex();
    }

    function rebuildTokenIndex() {
        if (tokenIndex) {
            // Reuse the existing spatial grid to avoid leaking old references
            tokenIndex.clear();
            tokenIndex.cellSize = hexSize * 2;
        } else {
            tokenIndex = new SpatialHashGrid(hexSize * 2);
        }

        for (let i = 0; i < tokens.length; i++) {
            const t = tokens[i];
            t._index = i;
            tokenIndex.insert(t, {
                xMin: t.x - hexSize * 0.4,
                yMin: t.y - hexSize * 0.4,
                xMax: t.x + hexSize * 0.4,
                yMax: t.y + hexSize * 0.4
            });
        }
    }
    
    function drawHex(ctx, hex) {
        ctx.beginPath();
        
        // Use the pre-calculated vertices
        const vertices = hex.vertices;
        
        ctx.moveTo(vertices[0].x, vertices[0].y);
        for (let i = 1; i < 6; i++) {
            ctx.lineTo(vertices[i].x, vertices[i].y);
        }
        
        ctx.closePath();
        
        // If debug mode is on, draw the hex ID
        if (debugMode) {
            // Draw hex center
            ctx.fillStyle = 'red';
            ctx.beginPath();
            ctx.arc(hex.x, hex.y, 3, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw hex ID
            ctx.fillStyle = 'white';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(hex.id, hex.x, hex.y);
            
            // Draw vertex points
            ctx.fillStyle = 'yellow';
            for (let vertex of vertices) {
                ctx.beginPath();
                ctx.arc(vertex.x, vertex.y, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
    
    function drawMap() {
        if (!mapCtx || !mapImage) return;

        // Clear layers
        [mapCtx, gridCtx, tokenCtx].forEach(c => c.clearRect(0, 0, mapCanvas.width, mapCanvas.height));

        // Save context state for all layers
        [mapCtx, gridCtx, tokenCtx].forEach(c => {
            c.save();
            c.translate(panX, panY);
            c.scale(zoomLevel, zoomLevel);
        });
        
        // Get the scale factor
        const scaleRatio = mapScale / 100;
        
        // Calculate scaled image dimensions
        const scaledWidth = mapImage.width * scaleRatio;
        const scaledHeight = mapImage.height * scaleRatio;

        // Draw the map image with scaling on the base layer
        mapCtx.drawImage(
            mapImage,
            0,
            0,
            mapImage.width,
            mapImage.height,
            0,
            0,
            scaledWidth,
            scaledHeight
        );
        
        // Log scaling info in debug mode
        if (debugMode) {
            log(`Drawing map at scale ${scaleRatio} (${scaledWidth}x${scaledHeight}), zoom ${zoomLevel.toFixed(2)}`);
        }
        
        // Determine visible bounds for culling
        const viewLeft = -panX / zoomLevel;
        const viewTop = -panY / zoomLevel;
        const viewRight = viewLeft + mapCanvas.width / zoomLevel;
        const viewBottom = viewTop + mapCanvas.height / zoomLevel;

        // Draw unrevealed hexes
        gridCtx.strokeStyle = gridColor;
        gridCtx.lineWidth = gridThickness;
        const { r, g, b } = hexToRgb(fogColor);
        gridCtx.fillStyle = `rgba(${r}, ${g}, ${b}, ${fogOpacity})`;

        for (const hex of hexes) {
            if (
                hex.x + hexSize < viewLeft ||
                hex.x - hexSize > viewRight ||
                hex.y + hexSize < viewTop ||
                hex.y - hexSize > viewBottom
            ) {
                continue;
            }

            if (!hex.revealed) {
                drawHex(gridCtx, hex);
                gridCtx.fill();
                gridCtx.stroke();
            } else if (debugMode) {
                gridCtx.save();
                gridCtx.strokeStyle = 'yellow';
                gridCtx.lineWidth = 2;
                gridCtx.setLineDash([5, 5]);
                drawHex(gridCtx, hex);
                gridCtx.stroke();
                gridCtx.restore();
            }
        }
        
        // Draw tokens
        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];
            const isSelected = i === selectedTokenIndex;

            if (
                token.x + hexSize < viewLeft ||
                token.x - hexSize > viewRight ||
                token.y + hexSize < viewTop ||
                token.y - hexSize > viewBottom
            ) {
                continue;
            }

            tokenCtx.beginPath();
            tokenCtx.arc(token.x, token.y, hexSize * 0.4, 0, Math.PI * 2);

            tokenCtx.fillStyle = token.color || tokenColor;
            tokenCtx.fill();

            if (isSelected) {
                tokenCtx.strokeStyle = 'white';
                tokenCtx.lineWidth = 3;
                tokenCtx.stroke();
            } else {
                tokenCtx.strokeStyle = 'black';
                tokenCtx.lineWidth = 1;
                tokenCtx.stroke();
            }

            if (token.icon) {
                tokenCtx.font = `${hexSize * 0.8}px \"Material Symbols Outlined\"`;
                tokenCtx.textAlign = 'center';
                tokenCtx.textBaseline = 'middle';
                tokenCtx.fillStyle = 'white';
                tokenCtx.fillText(token.icon, token.x, token.y);
            }

            if (token.label) {
                tokenCtx.font = '12px Arial';
                tokenCtx.textAlign = 'center';
                tokenCtx.textBaseline = 'top';
                tokenCtx.fillStyle = 'white';
                tokenCtx.strokeStyle = 'black';
                tokenCtx.lineWidth = 2;
                const textY = token.y + hexSize * 0.5;
                tokenCtx.strokeText(token.label, token.x, textY);
                tokenCtx.fillText(token.label, token.x, textY);
            }
        }
        
        if (debugMode) {
            tokenCtx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            tokenCtx.fillRect(10, 10, 200, 100);
            tokenCtx.fillStyle = 'white';
            tokenCtx.font = '12px Arial';
            tokenCtx.textAlign = 'left';
            tokenCtx.textBaseline = 'top';
            tokenCtx.fillText(`Total Hexes: ${hexes.length}`, 20, 20);
            tokenCtx.fillText(`Revealed: ${Object.keys(revealedHexes).length}`, 20, 40);
            tokenCtx.fillText(`Mode: ${revealMode ? 'Reveal' : 'Hide'}`, 20, 60);
            tokenCtx.fillText(`Zoom: ${(zoomLevel * 100).toFixed(0)}%`, 20, 80);
        }
        
        // Restore context state
        [mapCtx, gridCtx, tokenCtx].forEach(c => c.restore());
        
        // Update zoom display
        updateZoomDisplay();
        
        log('Map redrawn');
    }
    
    function updateZoomDisplay() {
        if (zoomDisplay) {
            zoomDisplay.textContent = `Zoom: ${Math.round(zoomLevel * 100)}%`;
        }
    }
    
    function updateCoordDisplay(hex) {
        if (coordDisplay) {
            if (hex) {
                coordDisplay.textContent = `Hex: ${hex.col},${hex.row}`;
            } else {
                coordDisplay.textContent = 'Hex: ---';
            }
        }
    }

    function snapshotState() {
        return {
            revealedHexes: JSON.parse(JSON.stringify(revealedHexes)),
            tokens: JSON.parse(JSON.stringify(tokens)),
            zoomLevel,
            panX,
            panY
        };
    }

    function restoreSnapshot(snap) {
        revealedHexes = JSON.parse(JSON.stringify(snap.revealedHexes));
        tokens = JSON.parse(JSON.stringify(snap.tokens));
        rebuildTokenIndex();
        zoomLevel = snap.zoomLevel;
        panX = snap.panX;
        panY = snap.panY;

        for (const hex of hexes) {
            hex.revealed = !!revealedHexes[hex.id];
        }

        saveState();
        requestRedraw();
    }

    function pushHistory() {
        undoStack.push(snapshotState());
        if (undoStack.length > 100) undoStack.shift();
        redoStack = [];
        updateUndoRedoButtons();
    }

    function undo() {
        if (undoStack.length <= 1) return;
        const current = undoStack.pop();
        redoStack.push(current);
        const previous = undoStack[undoStack.length - 1];
        restoreSnapshot(previous);
        updateUndoRedoButtons();
    }

    function redo() {
        if (redoStack.length === 0) return;
        const redoState = redoStack.pop();
        undoStack.push(redoState);
        restoreSnapshot(redoState);
        updateUndoRedoButtons();
    }

    function updateUndoRedoButtons() {
        if (undoBtn) undoBtn.disabled = undoStack.length <= 1;
        if (redoBtn) redoBtn.disabled = redoStack.length === 0;
    }
    
    function isPointInHex(px, py, hex) {
        // `px` and `py` should already be in world coordinates. This function
        // simply checks if the point lies inside the hex using a
        // ray-casting algorithm.

        const vertices = hex.vertices;
        let inside = false;

        for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
            const xi = vertices[i].x, yi = vertices[i].y;
            const xj = vertices[j].x, yj = vertices[j].y;

            const intersect = ((yi > py) !== (yj > py)) &&
                (px < (xj - xi) * (py - yi) / (yj - yi) + xi);

            if (intersect) inside = !inside;
        }

        return inside;
    }

    function findHexAtPosition(x, y) {
        // Convert the screen coordinates to world coordinates first
        const worldX = (x - panX) / zoomLevel;
        const worldY = (y - panY) / zoomLevel;

        const candidates = hexIndex.queryPoint(worldX, worldY);
        for (const hex of candidates) {
            if (isPointInHex(worldX, worldY, hex)) {
                return hex;
            }
        }
        return null;
    }
    
    function findTokenAtPosition(x, y) {
        const worldX = (x - panX) / zoomLevel;
        const worldY = (y - panY) / zoomLevel;
        const candidates = tokenIndex.queryPoint(worldX, worldY);
        for (let i = candidates.length - 1; i >= 0; i--) {
            const token = candidates[i];
            const dx = token.x - worldX;
            const dy = token.y - worldY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance <= hexSize * 0.4) {
                return token._index;
            }
        }
        return -1;
    }

    // Get mouse coordinates relative to the canvas
    function getCanvasCoords(event, canvas) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        return {
            x: (event.clientX - rect.left) * scaleX,
            y: (event.clientY - rect.top) * scaleY
        };
    }
    
    function handleCanvasClick(event) {
        if (!mapImage) return;

        hideTooltip();

        // Calculate click position in canvas coordinates
        const { x, y } = getCanvasCoords(event, canvas);
        
        log(`Click at: ${Math.round(x)}, ${Math.round(y)}`);
        
        // Token mode: add a new token
        if (isAddingToken) {
            addTokenAtPosition(x, y);
            return;
        }

        // Token remove mode
        if (isRemovingToken) {
            const idx = findTokenAtPosition(x, y);
            if (idx !== -1) {
                tokens.splice(idx, 1);
                selectedTokenIndex = -1;
                rebuildTokenIndex();
                saveState();
                requestRedraw();
                pushHistory();
                showStatus('Token removed', 'success');
            } else {
                showStatus('No token at that location', 'warning');
            }
            return;
        }
        
        // Check if a token was clicked
        const tokenIndex = findTokenAtPosition(x, y);
        if (tokenIndex !== -1) {
            // Handle token selection
            selectedTokenIndex = tokenIndex;
            
            // Start dragging the token
            isDraggingToken = true;
            mapContainer.classList.add('token-dragging');
            
            requestRedraw();
            showStatus(`Token selected (drag to move)`, 'info');
            return;
        } else {
            // Deselect token if clicking elsewhere
            if (selectedTokenIndex !== -1) {
                // If we were dragging a token, stop dragging
                if (isDraggingToken) {
                    isDraggingToken = false;
                    mapContainer.classList.remove('token-dragging');
                    saveState(); // Save state after moving token
                }
                
                selectedTokenIndex = -1;
                requestRedraw();
            }
        }
        
        // Find which hex was clicked
        let hexFound = false;
        const hex = findHexAtPosition(x, y);
        if (hex && !((revealMode && hex.revealed) || (!revealMode && !hex.revealed))) {
            if (revealMode) {
                log(`Revealing hex: ${hex.id} at ${Math.round(hex.x)}, ${Math.round(hex.y)}`);
                hex.revealed = true;
                revealedHexes[hex.id] = true;
            } else {
                log(`Hiding hex: ${hex.id} at ${Math.round(hex.x)}, ${Math.round(hex.y)}`);
                hex.revealed = false;
                delete revealedHexes[hex.id];
            }

            hexFound = true;
            saveState();
            requestRedraw();
            pushHistory();
        }
        
        if (!hexFound) {
            log(`No ${revealMode ? 'unrevealed' : 'revealed'} hex found at click location`);
        }
    }

    function handleCanvasDoubleClick(event) {
        if (!mapImage || isAddingToken || isRemovingToken) return;

        hideTooltip();

        const { x, y } = getCanvasCoords(event, canvas);
        const idx = findTokenAtPosition(x, y);
        if (idx !== -1) {
            editingTokenIndex = idx;
            const token = tokens[idx];
            tokenLabelInput.value = token.label || '';
            if (tokenIconSelect) tokenIconSelect.value = token.icon || '';
            tokenColorInput.value = token.color || tokenColor;
            if (tokenNotesInput) tokenNotesInput.value = token.notes || '';
            tokenLabelModal.style.display = 'block';
            tokenLabelInput.focus();
        }
    }
    
    function handleZoom(event) {
        event.preventDefault();
        
        // Get mouse position relative to canvas
        const { x: mouseX, y: mouseY } = getCanvasCoords(event, canvas);
        
        // Calculate zoom factor based on wheel delta
        const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
        
        // Calculate new zoom level
        const newZoom = Math.max(0.1, Math.min(5, zoomLevel * zoomFactor));
        
        // Calculate how the point under the mouse moves when we zoom
        const currentMouseInWorldX = (mouseX - panX) / zoomLevel;
        const currentMouseInWorldY = (mouseY - panY) / zoomLevel;
        const newMouseInWorldX = (mouseX - panX) / newZoom;
        const newMouseInWorldY = (mouseY - panY) / newZoom;
        
        // Adjust pan to keep the point under the mouse in the same place
        panX += (currentMouseInWorldX - newMouseInWorldX) * newZoom;
        panY += (currentMouseInWorldY - newMouseInWorldY) * newZoom;
        
        // Set new zoom level
        zoomLevel = newZoom;
        
        // Update display and redraw
        requestRedraw();
        
        log(`Zoomed to ${(zoomLevel * 100).toFixed(0)}%`);
    }
    
    function startPanning(event) {
        // Get mouse position for token detection
        const { x, y } = getCanvasCoords(event, canvas);
        
        // Check if we clicked on a token
        const tokenIndex = findTokenAtPosition(x, y);
        
        // MODIFIED: Allow panning with middle mouse button or right mouse button
        // Only start panning if we're not in token adding mode and not clicking on a token
        if (event.button === 1 || (event.button === 2)) {
            isPanning = true;
            lastMouseX = event.clientX;
            lastMouseY = event.clientY;
            mapContainer.classList.add('panning');

            hideTooltip();

            log('Started panning');
        }
    }
    
    function stopPanning() {
        if (isPanning) {
            isPanning = false;
            mapContainer.classList.remove('panning');
            log('Stopped panning');
        }

        hideTooltip();

        // Also stop token dragging if it was happening
        if (isDraggingToken) {
            isDraggingToken = false;
            mapContainer.classList.remove('token-dragging');
            saveState(); // Save state after the token is moved
            rebuildTokenIndex();
            pushHistory();
            log('Stopped token dragging');
        }
    }
    
    function handleMouseMove(event) {
        if (!mapImage) return;
        
        const { x, y } = getCanvasCoords(event, canvas);
        
        // Handle panning
        if (isPanning) {
            const dx = event.clientX - lastMouseX;
            const dy = event.clientY - lastMouseY;
            
            panX += dx;
            panY += dy;
            
            lastMouseX = event.clientX;
            lastMouseY = event.clientY;
            
            requestRedraw();
            return;
        }
        
        // Handle token dragging
        if (isDraggingToken && selectedTokenIndex !== -1) {
            // Calculate world coordinates
            const worldX = (x - panX) / zoomLevel;
            const worldY = (y - panY) / zoomLevel;
            
            // Update token position
            tokens[selectedTokenIndex].x = worldX;
            tokens[selectedTokenIndex].y = worldY;
            
            requestRedraw();
            return;
        }
        
        // Update coordinate display based on mouse position
        let hoveredHex = findHexAtPosition(x, y);
        updateCoordDisplay(hoveredHex);
        
        // Check for token hover to update cursor and tooltip
        const tokenIndex = findTokenAtPosition(x, y);
        if (tokenIndex !== -1 && !isAddingToken && !isRemovingToken) {
            mapContainer.classList.add('token-hover');

            if (tokenIndex !== hoveredTokenIndex) {
                hideTooltip();
                hoveredTokenIndex = tokenIndex;
                if (tokens[tokenIndex].notes) {
                    tooltipTimer = setTimeout(() => {
                        if (hoveredTokenIndex === tokenIndex) {
                            tokenTooltip.textContent = tokens[tokenIndex].notes;
                            const rect = mapContainer.getBoundingClientRect();
                            tokenTooltip.style.left = `${event.clientX - rect.left + 15}px`;
                            tokenTooltip.style.top = `${event.clientY - rect.top + 15}px`;
                            tokenTooltip.style.display = 'block';
                        }
                    }, 1000);
                }
            } else if (tokenTooltip.style.display === 'block') {
                const rect = mapContainer.getBoundingClientRect();
                tokenTooltip.style.left = `${event.clientX - rect.left + 15}px`;
                tokenTooltip.style.top = `${event.clientY - rect.top + 15}px`;
            }
        } else {
            mapContainer.classList.remove('token-hover');
            hideTooltip();
        }
    }
    
    function resetMap() {
        if (confirm('Are you sure you want to reset the map? All revealed hexes will be hidden again.')) {
            // Clear revealed hexes
            revealedHexes = {};
            
            // Reset all hexes
            for (const hex of hexes) {
                hex.revealed = false;
            }
            
            // Save state and redraw
            saveState();
            requestRedraw();
            pushHistory();

            log('Map reset');
            showStatus('Map has been reset', 'info');
        }
    }
    
    function resetView() {
        // Reset zoom and pan
        zoomLevel = 1;
        panX = 0;
        panY = 0;
        
        // Deselect token
        selectedTokenIndex = -1;
        
        // Exit add token mode
        isAddingToken = false;
        mapContainer.classList.remove('token-add-mode');
        addTokenBtn.textContent = 'Add Token';
        addTokenBtn.classList.remove('btn-warning');
        addTokenBtn.classList.add('btn-info');

        // Exit remove token mode
        isRemovingToken = false;
        mapContainer.classList.remove('token-remove-mode');
        removeTokenBtn.textContent = 'Remove Token';
        removeTokenBtn.classList.remove('btn-danger');
        removeTokenBtn.classList.add('btn-warning');
        
        // Update display and redraw
        requestRedraw();

        log('View reset');
        showStatus('View has been reset', 'info');
        pushHistory();
    }
    
    // Add a token at the specified position
    function addTokenAtPosition(x, y) {
        // Adjust position for zoom and pan
        const worldX = (x - panX) / zoomLevel;
        const worldY = (y - panY) / zoomLevel;

        pendingTokenPos = { x: worldX, y: worldY };

        tokenLabelInput.value = '';
        if (tokenIconSelect) tokenIconSelect.value = '';
        tokenColorInput.value = tokenColor;
        if (tokenNotesInput) tokenNotesInput.value = '';
        tokenLabelModal.style.display = 'block';
        tokenLabelInput.focus();
    }

    function confirmTokenLabel() {
        const label = tokenLabelInput.value.trim();
        const icon = tokenIconSelect ? tokenIconSelect.value : '';
        const color = tokenColorInput.value || tokenColor;
        const notes = tokenNotesInput ? tokenNotesInput.value.trim() : '';

        tokenColor = color; // update default

        if (editingTokenIndex !== -1) {
            const token = tokens[editingTokenIndex];
            token.label = label;
            token.icon = icon;
            token.color = color;
            token.notes = notes;
            selectedTokenIndex = editingTokenIndex;
            editingTokenIndex = -1;
        } else {
            if (!pendingTokenPos) return;
            const newToken = {
                x: pendingTokenPos.x,
                y: pendingTokenPos.y,
                color: color,
                label: label,
                icon: icon,
                notes: notes
            };
            tokens.push(newToken);
            selectedTokenIndex = tokens.length - 1;
            pendingTokenPos = null;
            toggleAddTokenMode();
        }

        rebuildTokenIndex();

        closeTokenLabelModal();

        saveState();
        requestRedraw();
        pushHistory();

        const msg = editingTokenIndex === -1 ? 'Token added (click and drag to move)' : 'Token updated';
        showStatus(msg, 'success');
    }

    function closeTokenLabelModal() {
        tokenLabelModal.style.display = 'none';
        pendingTokenPos = null;
        editingTokenIndex = -1;
    }
    
    // Toggle token add mode
    function toggleAddTokenMode() {
        isAddingToken = !isAddingToken;

        // If switching to add mode, ensure remove mode is off
        if (isAddingToken && isRemovingToken) {
            toggleRemoveTokenMode(false);
        }
        
        if (isAddingToken) {
            // Enter add token mode
            mapContainer.classList.add('token-add-mode');
            addTokenBtn.textContent = 'Cancel';
            addTokenBtn.classList.remove('btn-info');
            addTokenBtn.classList.add('btn-warning');
            showStatus('Click on the map to place a token', 'info');
        } else {
            // Exit add token mode
            mapContainer.classList.remove('token-add-mode');
            addTokenBtn.textContent = 'Add Token';
            addTokenBtn.classList.remove('btn-warning');
            addTokenBtn.classList.add('btn-info');
        }
        
        log(`Token add mode ${isAddingToken ? 'enabled' : 'disabled'}`);
    }

    // Toggle token remove mode
    function toggleRemoveTokenMode(forceState) {
        if (typeof forceState === 'boolean') {
            isRemovingToken = forceState;
        } else {
            isRemovingToken = !isRemovingToken;
        }

        // Turning on remove mode should disable add mode
        if (isRemovingToken && isAddingToken) {
            toggleAddTokenMode();
        }

        if (isRemovingToken) {
            mapContainer.classList.add('token-remove-mode');
            removeTokenBtn.textContent = 'Cancel';
            removeTokenBtn.classList.remove('btn-warning');
            removeTokenBtn.classList.add('btn-danger');
            showStatus('Click a token to remove it', 'info');
        } else {
            mapContainer.classList.remove('token-remove-mode');
            removeTokenBtn.textContent = 'Remove Token';
            removeTokenBtn.classList.remove('btn-danger');
            removeTokenBtn.classList.add('btn-warning');
        }

        log(`Token remove mode ${isRemovingToken ? 'enabled' : 'disabled'}`);
    }
    
    // Clear all tokens
    function clearTokens() {
        if (tokens.length === 0) {
            showStatus('No tokens to clear', 'info');
            return;
        }
        
        if (confirm(`Are you sure you want to remove all ${tokens.length} tokens?`)) {
            tokens = [];
            selectedTokenIndex = -1;
            rebuildTokenIndex();
            saveState();
            requestRedraw();
            pushHistory();
            log('All tokens cleared');
            showStatus('All tokens removed', 'info');
        }
    }
    
    // Toggle reveal/hide mode
    function toggleMode() {
        revealMode = !revealMode;
        toggleModeBtn.textContent = `Mode: ${revealMode ? 'Reveal' : 'Hide'}`;
        toggleModeBtn.classList.toggle('btn-primary', revealMode);
        toggleModeBtn.classList.toggle('btn-warning', !revealMode);
        
        // Update container class for cursor style
        mapContainer.classList.toggle('reveal-mode', revealMode);
        mapContainer.classList.toggle('hide-mode', !revealMode);
        
        showStatus(`Mode switched to: ${revealMode ? 'Reveal' : 'Hide'} hexes`, 'info');
        log(`Mode changed to: ${revealMode ? 'Reveal' : 'Hide'}`);
        
        requestRedraw(); // Redraw to update any debug info
    }
    
    // Toggle header panel
    function toggleHeader() {
        const headerContent = document.getElementById('header-content');
        const isVisible = !headerContent.classList.contains('collapsed');
        
        // Toggle visibility
        if (isVisible) {
            headerContent.classList.add('collapsed');
        } else {
            headerContent.classList.remove('collapsed');
        }
        
        // Update button icon
        toggleHeaderBtn.innerHTML = isVisible ?
            '<i class="bi bi-caret-down-fill"></i>' :
            '<i class="bi bi-caret-up-fill"></i>';
        
        log(`Header ${isVisible ? 'hidden' : 'shown'}`);
        showStatus(`Header ${isVisible ? 'hidden' : 'shown'}`, 'info');
    }
    
    function updateInputFields() {
        hexSizeInput.value = hexSize;
        offsetXInput.value = offsetX;
        offsetYInput.value = offsetY;
        columnsInput.value = columnCount;
        rowsInput.value = rowCount;
        mapScaleInput.value = mapScale;
        
        // Update appearance input fields
        fogColorInput.value = fogColor;
        fogOpacityInput.value = fogOpacity;
        gridColorInput.value = gridColor;
        gridThicknessInput.value = gridThickness;
        tokenColorInput.value = tokenColor;
        orientationInput.value = orientation;
    }
    
    // Export/Import functions
    function handleExport() {
        // Create the export object
        const exportData = {
            version: 3, // Increment version for new features
            timestamp: new Date().toISOString(),
            mapUrl: mapUrlInput.value,
            settings: {
                hexSize: hexSize,
                offsetX: offsetX,
                offsetY: offsetY,
                columnCount: columnCount,
                rowCount: rowCount,
                orientation: orientation,
                mapScale: mapScale,
                fogColor: fogColor,
                fogOpacity: fogOpacity,
                gridColor: gridColor,
                gridThickness: gridThickness,
                tokenColor: tokenColor
            },
            view: {
                zoomLevel: zoomLevel,
                panX: panX,
                panY: panY
            },
            tokens: tokens,
            revealedHexes: revealedHexes
        };
        
        // Convert to JSON
        const jsonData = JSON.stringify(exportData, null, 2);
        
        // Set the text area value
        exportJsonTextarea.value = jsonData;
        
        // Show the modal
        exportModal.style.display = 'block';
        
        log('Exported map state');
        showStatus('State exported', 'success');
    }
    
    function handleImport(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                const importData = JSON.parse(e.target.result);
                
                // Validate the import data
                if (!importData.settings || !importData.revealedHexes) {
                    throw new Error('Invalid import file format');
                }
                
                // Apply settings
                if (importData.settings) {
                    hexSize = importData.settings.hexSize || hexSize;
                    offsetX = importData.settings.offsetX || offsetX;
                    offsetY = importData.settings.offsetY || offsetY;
                    columnCount = importData.settings.columnCount || columnCount;
                    rowCount = importData.settings.rowCount || rowCount;
                    orientation = importData.settings.orientation || orientation;
                    mapScale = importData.settings.mapScale || mapScale;
                    
                    // Import appearance settings
                    fogColor = importData.settings.fogColor || fogColor;
                    fogOpacity = importData.settings.fogOpacity || fogOpacity;
                    gridColor = importData.settings.gridColor || gridColor;
                    gridThickness = importData.settings.gridThickness || gridThickness;
                    tokenColor = importData.settings.tokenColor || tokenColor;

                    // Update input fields
                    updateInputFields();
                }
                
                // Apply view settings if they exist
                if (importData.view) {
                    zoomLevel = importData.view.zoomLevel || 1;
                    panX = importData.view.panX || 0;
                    panY = importData.view.panY || 0;
                }
                
                // Apply revealed hexes
                revealedHexes = importData.revealedHexes;
                
                // Apply tokens if they exist
                if (importData.tokens) {
                    tokens = importData.tokens.map(t => ({
                        x: t.x,
                        y: t.y,
                        color: t.color,
                        label: t.label || '',
                        icon: t.icon || '',
                        notes: t.notes || ''
                    }));
                }
                
                // If there's a map URL, load it
                if (importData.mapUrl) {
                    mapUrlInput.value = importData.mapUrl;
                    loadMap(importData.mapUrl);
                } else {
                    // Otherwise just regenerate the grid and redraw
                    generateHexGrid();
                    requestRedraw();
                }
                
                // Save state
                saveState();
                
                log('Imported map state');
                showStatus('Map state imported successfully!', 'success');
            } catch (error) {
                console.error('Error importing file:', error);
                log('Error importing file: ' + error.message);
                showStatus('Error importing file. Please check the file format.', 'error');
            }
            
            // Reset the file input
            event.target.value = null;
        };
        
        reader.readAsText(file);
    }
    
    function updateSavedState(key, value) {
        try {
            let storedState = {};
            const savedState = localStorage.getItem(STORAGE_KEY);

            if (savedState) {
                storedState = JSON.parse(savedState);
            }

            // Generic assignment for most keys
            storedState[key] = value;

            localStorage.setItem(STORAGE_KEY, JSON.stringify(storedState));
            log(`Saved state updated: ${key}`);
        } catch (error) {
            console.error('Error updating saved state:', error);
            log('Error updating saved state: ' + error.message);
        }
    }
    
    function saveState() {
        try {
            const settings = {
                hexSize: hexSize,
                offsetX: offsetX,
                offsetY: offsetY,
                columnCount: columnCount,
                rowCount: rowCount,
                orientation: orientation,
                mapScale: mapScale,
                fogColor: fogColor,
                fogOpacity: fogOpacity,
                gridColor: gridColor,
                gridThickness: gridThickness,
                tokenColor: tokenColor
            };
            
            const view = {
                zoomLevel: zoomLevel,
                panX: panX,
                panY: panY
            };
            
            updateSavedState('revealedHexes', revealedHexes);
            updateSavedState('settings', settings);
            updateSavedState('tokens', tokens);
            updateSavedState('view', view);
            
            if (mapUrlInput.value.trim()) {
                updateSavedState('mapUrl', mapUrlInput.value);
            }
            
            log('State saved');
        } catch (error) {
            console.error('Error saving state:', error);
            log('Error saving state: ' + error.message);
        }
    }

    function hideTooltip() {
        if (tooltipTimer) {
            clearTimeout(tooltipTimer);
            tooltipTimer = null;
        }
        hoveredTokenIndex = -1;
        if (tokenTooltip) {
            tokenTooltip.style.display = 'none';
        }
    }
    
    // Show a status message that disappears after a delay
    function showStatus(message, type = 'info') {
        if (!statusIndicator) return;
        
        // Set color based on message type
        let bgColor = '#4299e1'; // info (blue)
        if (type === 'success') bgColor = '#48bb78'; // green
        if (type === 'error') bgColor = '#e53e3e'; // red
        if (type === 'warning') bgColor = '#ed8936'; // orange
        
        statusIndicator.style.backgroundColor = bgColor;
        statusIndicator.textContent = message;
        statusIndicator.style.display = 'inline-block';
        
        // Clear any existing timeout
        if (statusIndicator.hideTimeout) {
            clearTimeout(statusIndicator.hideTimeout);
        }
        
        // Hide after 5 seconds
        statusIndicator.hideTimeout = setTimeout(() => {
            statusIndicator.style.display = 'none';
        }, 5000);
    }
    
    // Debug logging function
    function log(message) {
        if (debugInfo) {
            const timestamp = new Date().toTimeString().split(' ')[0];
            const logEntry = document.createElement('div');
            logEntry.textContent = `[${timestamp}] ${message}`;
            debugInfo.prepend(logEntry);
            
            // Limit the number of log entries
            while (debugInfo.children.length > 50) {
                debugInfo.removeChild(debugInfo.lastChild);
            }
        }
        
        console.log(message);
    }

    function requestRedraw() {
        needsRedraw = true;
    }

    function renderLoop() {
        if (needsRedraw) {
            drawMap();
            needsRedraw = false;
        }
        requestAnimationFrame(renderLoop);
    }

    // Start the render loop
    requestAnimationFrame(renderLoop);
});
