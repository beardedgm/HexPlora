document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const canvas = document.getElementById('map-canvas');
    const ctx = canvas.getContext('2d');
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
    const clearTokensBtn = document.getElementById('clear-tokens-btn');
    
    // New display elements
    const zoomDisplay = document.getElementById('zoom-display');
    const coordDisplay = document.getElementById('coord-display');
    
    // Export modal elements
    const exportModal = document.getElementById('export-modal');
    const exportModalClose = document.getElementById('export-modal-close');
    const exportJsonTextarea = document.getElementById('export-json');
    const copyJsonBtn = document.getElementById('copy-json-btn');
    const downloadJsonBtn = document.getElementById('download-json-btn');
    
    // Debug mode flag
    let debugMode = false;
    
    // Input fields
    const hexSizeInput = document.getElementById('hex-size');
    const offsetXInput = document.getElementById('offset-x');
    const offsetYInput = document.getElementById('offset-y');
    const columnsInput = document.getElementById('columns');
    const rowsInput = document.getElementById('rows');
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
    
    // Interaction mode - true for reveal, false for hide
    let revealMode = true;
    
    // Initialize the application
    init();
    
    function init() {
        loadSavedState();
        updateInputFields();
        setupEventListeners();
        loadMap();
        log('App initialized');
    }
    
    function loadSavedState() {
        try {
            const savedState = localStorage.getItem(STORAGE_KEY);
            if (savedState) {
                const state = JSON.parse(savedState);
                
                revealedHexes = state.revealedHexes || {};
                
                if (state.settings) {
                    hexSize = state.settings.hexSize || hexSize;
                    offsetX = state.settings.offsetX || offsetX;
                    offsetY = state.settings.offsetY || offsetY;
                    columnCount = state.settings.columnCount || columnCount;
                    rowCount = state.settings.rowCount || rowCount;
                    mapScale = state.settings.mapScale || mapScale;
                    
                    // Load new appearance settings
                    fogColor = state.settings.fogColor || fogColor;
                    fogOpacity = state.settings.fogOpacity || fogOpacity;
                    gridColor = state.settings.gridColor || gridColor;
                    gridThickness = state.settings.gridThickness || gridThickness;
                    tokenColor = state.settings.tokenColor || tokenColor;
                    
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
                }
                
                // Load tokens
                if (state.tokens) {
                    tokens = state.tokens;
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
            drawMap();
            saveState();
        });
        
        offsetXInput.addEventListener('change', function() {
            offsetX = validateInput(this, -1000, 1000, 0);
            generateHexGrid();
            drawMap();
            saveState();
        });
        
        offsetYInput.addEventListener('change', function() {
            offsetY = validateInput(this, -1000, 1000, 0);
            generateHexGrid();
            drawMap();
            saveState();
        });
        
        columnsInput.addEventListener('change', function() {
            columnCount = validateInput(this, 1, 200, 20);
            generateHexGrid();
            drawMap();
            saveState();
        });
        
        rowsInput.addEventListener('change', function() {
            rowCount = validateInput(this, 1, 200, 15);
            generateHexGrid();
            drawMap();
            saveState();
        });
        
        mapScaleInput.addEventListener('change', function() {
            mapScale = validateInput(this, 10, 500, 100);
            drawMap();
            saveState();
        });
        
        // New appearance input event listeners
        fogColorInput.addEventListener('change', function() {
            fogColor = this.value;
            drawMap();
            saveState();
        });
        
        fogOpacityInput.addEventListener('input', function() {
            fogOpacity = parseFloat(this.value);
            drawMap();
            saveState();
        });
        
        gridColorInput.addEventListener('change', function() {
            gridColor = this.value;
            drawMap();
            saveState();
        });
        
        gridThicknessInput.addEventListener('input', function() {
            gridThickness = parseFloat(this.value);
            drawMap();
            saveState();
        });
        
        tokenColorInput.addEventListener('change', function() {
            tokenColor = this.value;
            drawMap();
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
        clearTokensBtn.addEventListener('click', clearTokens);
        
        loadUrlBtn.addEventListener('click', function() {
            const url = mapUrlInput.value.trim();
            if (url) {
                loadMap(url);
            } else {
                alert('Please enter a valid URL');
            }
        });
        
        // Add a listener for the URL input to validate URLs on paste/change
        mapUrlInput.addEventListener('input', function() {
            // Could add URL validation here if needed
        });
        
        mapUrlInput.addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                loadUrlBtn.click();
            }
        });
        
        // Mouse wheel for zoom
        canvas.addEventListener('wheel', handleZoom);
        
        // Mouse events for panning
        canvas.addEventListener('mousedown', startPanning);
        canvas.addEventListener('mousemove', handleMouseMove);
        canvas.addEventListener('mouseup', stopPanning);
        canvas.addEventListener('mouseleave', stopPanning);
        
        // Prevent context menu on right-click but allow right-click event to be handled
        canvas.addEventListener('contextmenu', function(e) {
            e.preventDefault();
        });
        
        window.addEventListener('resize', function() {
            drawMap();
        });
        
        debugToggle.addEventListener('click', function() {
            debugMode = !debugMode;
            debugInfo.style.display = debugMode ? 'block' : 'none';
            drawMap(); // Redraw to show debug info
            log('Debug mode ' + (debugMode ? 'enabled' : 'disabled'));
        });
        
        // Export button
        exportBtn.addEventListener('click', handleExport);
        
        // Close export modal
        exportModalClose.addEventListener('click', function() {
            exportModal.style.display = 'none';
        });
        
        // Copy JSON to clipboard
        copyJsonBtn.addEventListener('click', function() {
            exportJsonTextarea.select();
            document.execCommand('copy');
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
            
            // Escape to cancel add token mode or reset selection
            if (event.key === 'Escape') {
                if (isAddingToken) {
                    toggleAddTokenMode();
                } else if (selectedTokenIndex !== -1) {
                    selectedTokenIndex = -1;
                    drawMap();
                }
            }
            
            // Delete to remove selected token
            if (event.key === 'Delete' && selectedTokenIndex !== -1) {
                tokens.splice(selectedTokenIndex, 1);
                selectedTokenIndex = -1;
                drawMap();
                saveState();
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
    
    function loadMap(mapUrl) {
        loadingElement.style.display = 'flex';
        canvas.style.display = 'none';
        loadingElement.textContent = 'Loading map...';
        
        // Default map SVG
        const DEFAULT_MAP = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1200' height='800' viewBox='0 0 1200 800'%3E%3Crect width='1200' height='800' fill='%23567d46'/%3E%3Cpath d='M0,400 Q300,350 600,500 T1200,400' stroke='%234b93c8' stroke-width='30' fill='none'/%3E%3Cpath d='M800,100 Q850,350 700,600' stroke='%234b93c8' stroke-width='20' fill='none'/%3E%3Ccircle cx='600' cy='450' r='100' fill='%234b93c8'/%3E%3C/svg%3E";
        
        // If no URL provided, try to load from localStorage or use default
        if (!mapUrl || mapUrl.trim() === '') {
            const savedState = localStorage.getItem(STORAGE_KEY);
            if (savedState) {
                try {
                    const state = JSON.parse(savedState);
                    if (state.mapUrl && state.mapUrl.trim() !== '') {
                        mapUrl = state.mapUrl;
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
            
            mapImage = img;
            canvas.width = img.width;
            canvas.height = img.height;
            loadingElement.style.display = 'none';
            canvas.style.display = 'block';
            
            // Reset zoom and pan on new map load
            resetView();
            
            // Only update saved URL if it loaded successfully
            updateSavedState('mapUrl', mapUrl);
            mapUrlInput.value = mapUrl;
            
            // Show success status
            showStatus('Map loaded successfully!', 'success');
            
            generateHexGrid();
            drawMap();
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
            
            // If this wasn't the default map, try to load the default
            if (failedUrl !== DEFAULT_MAP) {
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
        
        // Calculate dimensions for pointy-top hexes
        const hexWidth = hexSize * Math.sqrt(3);
        const hexHeight = hexSize * 2;
        
        for (let row = 0; row < rowCount; row++) {
            for (let col = 0; col < columnCount; col++) {
                // Pointy-top grid: odd rows are offset horizontally
                const x = col * hexWidth + (row % 2 === 1 ? hexWidth / 2 : 0) + offsetX;
                const y = row * (hexHeight * 3/4) + offsetY;
                
                const hexId = `${col}-${row}`;
                const isRevealed = revealedHexes[hexId] === true;
                
                // Store the hex vertices for efficient hit testing
                const vertices = [];
                for (let i = 0; i < 6; i++) {
                    const angle = (Math.PI / 3) * i + Math.PI / 2;
                    const px = x + hexSize * Math.cos(angle);
                    const py = y + hexSize * Math.sin(angle);
                    vertices.push({x: px, y: py});
                }
                
                hexes.push({
                    id: hexId,
                    x: x,
                    y: y,
                    row: row,
                    col: col,
                    revealed: isRevealed,
                    vertices: vertices
                });
            }
        }
        
        log(`Generated ${hexes.length} hexes, ${Object.keys(revealedHexes).length} already revealed`);
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
        if (!ctx || !mapImage) return;
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Save current context state
        ctx.save();
        
        // Apply pan and zoom transformations
        ctx.translate(panX, panY);
        ctx.scale(zoomLevel, zoomLevel);
        
        // Get the scale factor
        const scaleRatio = mapScale / 100;
        
        // Calculate scaled image dimensions
        const scaledWidth = mapImage.width * scaleRatio;
        const scaledHeight = mapImage.height * scaleRatio;
        
        // Draw the map image with scaling
        ctx.drawImage(
            mapImage,        // source image
            0, 0,            // source x, y
            mapImage.width, mapImage.height,  // source width, height
            0, 0,            // destination x, y (keep at origin)
            scaledWidth, scaledHeight         // destination width, height (scaled)
        );
        
        // Log scaling info in debug mode
        if (debugMode) {
            log(`Drawing map at scale ${scaleRatio} (${scaledWidth}x${scaledHeight}), zoom ${zoomLevel.toFixed(2)}`);
        }
        
        // Draw unrevealed hexes
        ctx.strokeStyle = gridColor;
        ctx.lineWidth = gridThickness;
        ctx.fillStyle = `${fogColor}${Math.round(fogOpacity * 255).toString(16).padStart(2, '0')}`;
        
        for (const hex of hexes) {
            if (!hex.revealed) {
                drawHex(ctx, hex);
                ctx.fill();
                ctx.stroke();
            } else if (debugMode) {
                // In debug mode, show revealed hexes with a different style
                ctx.save();
                ctx.strokeStyle = 'yellow';
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 5]);
                drawHex(ctx, hex);
                ctx.stroke();
                ctx.restore();
            }
        }
        
        // Draw tokens
        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];
            const isSelected = i === selectedTokenIndex;
            
            // Draw token circle
            ctx.beginPath();
            ctx.arc(token.x, token.y, hexSize * 0.4, 0, Math.PI * 2);
            
            // Fill with token color
            ctx.fillStyle = token.color || tokenColor;
            ctx.fill();
            
            // Draw selection ring if selected
            if (isSelected) {
                ctx.strokeStyle = 'white';
                ctx.lineWidth = 3;
                ctx.stroke();
            } else {
                // Draw border
                ctx.strokeStyle = 'black';
                ctx.lineWidth = 1;
                ctx.stroke();
            }
        }
        
        if (debugMode) {
            // Show some debug stats
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(10, 10, 200, 100);
            ctx.fillStyle = 'white';
            ctx.font = '12px Arial';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillText(`Total Hexes: ${hexes.length}`, 20, 20);
            ctx.fillText(`Revealed: ${Object.keys(revealedHexes).length}`, 20, 40);
            ctx.fillText(`Mode: ${revealMode ? 'Reveal' : 'Hide'}`, 20, 60);
            ctx.fillText(`Zoom: ${(zoomLevel * 100).toFixed(0)}%`, 20, 80);
        }
        
        // Restore context state
        ctx.restore();
        
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
    
    function isPointInHex(px, py, hex) {
        // Adjust point coordinates for zoom and pan
        const adjustedX = (px - panX) / zoomLevel;
        const adjustedY = (py - panY) / zoomLevel;
        
        // Use point-in-polygon algorithm for accurate detection
        const vertices = hex.vertices;
        let inside = false;
        
        // Ray-casting algorithm
        for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
            const xi = vertices[i].x, yi = vertices[i].y;
            const xj = vertices[j].x, yj = vertices[j].y;
            
            const intersect = ((yi > adjustedY) !== (yj > adjustedY)) && 
                (adjustedX < (xj - xi) * (adjustedY - yi) / (yj - yi) + xi);
            
            if (intersect) inside = !inside;
        }
        
        return inside;
    }
    
    function findTokenAtPosition(x, y) {
        // Adjust point coordinates for zoom and pan
        const adjustedX = (x - panX) / zoomLevel;
        const adjustedY = (y - panY) / zoomLevel;
        
        for (let i = tokens.length - 1; i >= 0; i--) {
            const token = tokens[i];
            const dx = token.x - adjustedX;
            const dy = token.y - adjustedY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Check if point is within token radius
            if (distance <= hexSize * 0.4) {
                return i; // Return index of found token
            }
        }
        
        return -1; // No token found
    }
    
    function handleCanvasClick(event) {
        if (!mapImage) return;
        
        // Calculate click position in canvas coordinates
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        
        // Get raw click coordinates
        const x = (event.clientX - rect.left) * scaleX;
        const y = (event.clientY - rect.top) * scaleY;
        
        log(`Click at: ${Math.round(x)}, ${Math.round(y)}`);
        
        // Token mode: add a new token
        if (isAddingToken) {
            addTokenAtPosition(x, y);
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
            
            drawMap();
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
                drawMap();
            }
        }
        
        // Find which hex was clicked
        let hexFound = false;
        
        for (const hex of hexes) {
            // In reveal mode, skip already revealed hexes
            // In hide mode, skip already hidden hexes
            if ((revealMode && hex.revealed) || (!revealMode && !hex.revealed)) continue;
            
            if (isPointInHex(x, y, hex)) {
                // Toggle the hex based on the current mode
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
                
                // Save state and redraw
                saveState();
                drawMap();
                break;
            }
        }
        
        if (!hexFound) {
            log(`No ${revealMode ? 'unrevealed' : 'revealed'} hex found at click location`);
        }
    }
    
    function handleZoom(event) {
        event.preventDefault();
        
        // Get mouse position relative to canvas
        const rect = canvas.getBoundingClientRect();
        const mouseX = (event.clientX - rect.left) * (canvas.width / rect.width);
        const mouseY = (event.clientY - rect.top) * (canvas.height / rect.height);
        
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
        drawMap();
        
        log(`Zoomed to ${(zoomLevel * 100).toFixed(0)}%`);
    }
    
    function startPanning(event) {
        // Get mouse position for token detection
        const rect = canvas.getBoundingClientRect();
        const x = (event.clientX - rect.left) * (canvas.width / rect.width);
        const y = (event.clientY - rect.top) * (canvas.height / rect.height);
        
        // Check if we clicked on a token
        const tokenIndex = findTokenAtPosition(x, y);
        
        // MODIFIED: Allow panning with middle mouse button or right mouse button
        // Only start panning if we're not in token adding mode and not clicking on a token
        if (event.button === 1 || (event.button === 2)) {
            isPanning = true;
            lastMouseX = event.clientX;
            lastMouseY = event.clientY;
            mapContainer.classList.add('panning');
            
            log('Started panning');
        }
    }
    
    function stopPanning() {
        if (isPanning) {
            isPanning = false;
            mapContainer.classList.remove('panning');
            log('Stopped panning');
        }
        
        // Also stop token dragging if it was happening
        if (isDraggingToken) {
            isDraggingToken = false;
            mapContainer.classList.remove('token-dragging');
            saveState(); // Save state after the token is moved
            log('Stopped token dragging');
        }
    }
    
    function handleMouseMove(event) {
        if (!mapImage) return;
        
        const rect = canvas.getBoundingClientRect();
        const x = (event.clientX - rect.left) * (canvas.width / rect.width);
        const y = (event.clientY - rect.top) * (canvas.height / rect.height);
        
        // Handle panning
        if (isPanning) {
            const dx = event.clientX - lastMouseX;
            const dy = event.clientY - lastMouseY;
            
            panX += dx;
            panY += dy;
            
            lastMouseX = event.clientX;
            lastMouseY = event.clientY;
            
            drawMap();
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
            
            drawMap();
            return;
        }
        
        // Update coordinate display based on mouse position
        let hoveredHex = null;
        for (const hex of hexes) {
            if (isPointInHex(x, y, hex)) {
                hoveredHex = hex;
                break;
            }
        }
        updateCoordDisplay(hoveredHex);
        
        // Check for token hover to update cursor
        const tokenIndex = findTokenAtPosition(x, y);
        if (tokenIndex !== -1 && !isAddingToken) {
            mapContainer.classList.add('token-hover');
        } else {
            mapContainer.classList.remove('token-hover');
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
            drawMap();
            
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
        
        // Update display and redraw
        drawMap();
        
        log('View reset');
        showStatus('View has been reset', 'info');
    }
    
    // Add a token at the specified position
    function addTokenAtPosition(x, y) {
        // Adjust position for zoom and pan
        const worldX = (x - panX) / zoomLevel;
        const worldY = (y - panY) / zoomLevel;
        
        // Create the token - no label needed
        const newToken = {
            x: worldX,
            y: worldY,
            color: tokenColor
        };
        
        // Add to tokens array
        tokens.push(newToken);
        
        // Select the new token
        selectedTokenIndex = tokens.length - 1;
        
        // Exit add token mode
        toggleAddTokenMode();
        
        // Save state and redraw
        saveState();
        drawMap();
        
        log(`Added token at ${Math.round(worldX)}, ${Math.round(worldY)}`);
        showStatus(`Token added (click and drag to move)`, 'success');
    }
    
    // Toggle token add mode
    function toggleAddTokenMode() {
        isAddingToken = !isAddingToken;
        
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
    
    // Clear all tokens
    function clearTokens() {
        if (tokens.length === 0) {
            showStatus('No tokens to clear', 'info');
            return;
        }
        
        if (confirm(`Are you sure you want to remove all ${tokens.length} tokens?`)) {
            tokens = [];
            selectedTokenIndex = -1;
            saveState();
            drawMap();
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
        
        drawMap(); // Redraw to update any debug info
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
        
        // Update button text
        toggleHeaderBtn.textContent = isVisible ? 'Show Header' : 'Hide Header';
        
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
    }
    
    // Export/Import functions
    function handleExport() {
        // Create the export object
        const exportData = {
            version: 2, // Increment version for new features
            timestamp: new Date().toISOString(),
            mapUrl: mapUrlInput.value,
            settings: {
                hexSize: hexSize,
                offsetX: offsetX,
                offsetY: offsetY,
                columnCount: columnCount,
                rowCount: rowCount,
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
                    tokens = importData.tokens;
                }
                
                // If there's a map URL, load it
                if (importData.mapUrl) {
                    mapUrlInput.value = importData.mapUrl;
                    loadMap(importData.mapUrl);
                } else {
                    // Otherwise just regenerate the grid and redraw
                    generateHexGrid();
                    drawMap();
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
            let state = {};
            const savedState = localStorage.getItem(STORAGE_KEY);
            
            if (savedState) {
                state = JSON.parse(savedState);
            }
            
            if (key === 'settings') {
                state.settings = value;
            } else if (key === 'revealedHexes') {
                state.revealedHexes = value;
            } else if (key === 'tokens') {
                state.tokens = value;
            } else if (key === 'view') {
                state.view = value;
            } else {
                state[key] = value;
            }
            
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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
});
