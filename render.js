import { state } from './state.js';

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

export function generateHexGrid() {
    state.hexes = [];
    const hexWidth = state.hexSize * Math.sqrt(3);
    const hexHeight = state.hexSize * 2;
    for (let row = 0; row < state.rowCount; row++) {
        for (let col = 0; col < state.columnCount; col++) {
            const x = col * hexWidth + (row % 2 === 1 ? hexWidth / 2 : 0) + state.offsetX;
            const y = row * (hexHeight * 3 / 4) + state.offsetY;
            const hexId = `${col}-${row}`;
            const isRevealed = state.revealedHexes[hexId] === true;
            const vertices = [];
            for (let i = 0; i < 6; i++) {
                const angle = (Math.PI / 3) * i + Math.PI / 2;
                const px = x + state.hexSize * Math.cos(angle);
                const py = y + state.hexSize * Math.sin(angle);
                vertices.push({ x: px, y: py });
            }
            state.hexes.push({ id: hexId, x, y, row, col, revealed: isRevealed, vertices });
        }
    }
}

export function drawHex(ctx, hex) {
    ctx.beginPath();
    const vertices = hex.vertices;
    ctx.moveTo(vertices[0].x, vertices[0].y);
    for (let i = 1; i < 6; i++) {
        ctx.lineTo(vertices[i].x, vertices[i].y);
    }
    ctx.closePath();
    if (state.debugMode) {
        ctx.fillStyle = 'red';
        ctx.beginPath();
        ctx.arc(hex.x, hex.y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'white';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(hex.id, hex.x, hex.y);
        ctx.fillStyle = 'yellow';
        for (let vertex of vertices) {
            ctx.beginPath();
            ctx.arc(vertex.x, vertex.y, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

export function drawMap(ctx, canvas, ui) {
    if (!ctx || !state.mapImage) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(state.panX, state.panY);
    ctx.scale(state.zoomLevel, state.zoomLevel);
    const scaleRatio = state.mapScale / 100;
    const scaledWidth = state.mapImage.width * scaleRatio;
    const scaledHeight = state.mapImage.height * scaleRatio;
    ctx.drawImage(state.mapImage, 0, 0, state.mapImage.width, state.mapImage.height, 0, 0, scaledWidth, scaledHeight);
    ctx.strokeStyle = state.gridColor;
    ctx.lineWidth = state.gridThickness;
    const { r, g, b } = hexToRgb(state.fogColor);
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${state.fogOpacity})`;
    for (const hex of state.hexes) {
        if (!hex.revealed) {
            drawHex(ctx, hex);
            ctx.fill();
            ctx.stroke();
        } else if (state.debugMode) {
            ctx.save();
            ctx.strokeStyle = 'yellow';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            drawHex(ctx, hex);
            ctx.stroke();
            ctx.restore();
        }
    }
    for (let i = 0; i < state.tokens.length; i++) {
        const token = state.tokens[i];
        const isSelected = i === state.selectedTokenIndex;
        ctx.beginPath();
        ctx.arc(token.x, token.y, state.hexSize * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = token.color || state.tokenColor;
        ctx.fill();
        if (isSelected) {
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 3;
            ctx.stroke();
        } else {
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        if (token.label) {
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillStyle = 'white';
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 2;
            const textY = token.y + state.hexSize * 0.5;
            ctx.strokeText(token.label, token.x, textY);
            ctx.fillText(token.label, token.x, textY);
        }
    }
    if (state.debugMode) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(10, 10, 200, 100);
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(`Total Hexes: ${state.hexes.length}`, 20, 20);
        ctx.fillText(`Revealed: ${Object.keys(state.revealedHexes).length}`, 20, 40);
        ctx.fillText(`Mode: ${state.revealMode ? 'Reveal' : 'Hide'}`, 20, 60);
        ctx.fillText(`Zoom: ${(state.zoomLevel * 100).toFixed(0)}%`, 20, 80);
    }
    ctx.restore();
    updateZoomDisplay(ui);
}

export function updateZoomDisplay(ui) {
    if (ui && ui.zoomDisplay) {
        ui.zoomDisplay.textContent = `Zoom: ${Math.round(state.zoomLevel * 100)}%`;
    }
}

export function updateCoordDisplay(ui, hex) {
    if (ui && ui.coordDisplay) {
        if (hex) {
            ui.coordDisplay.textContent = `Hex: ${hex.col},${hex.row}`;
        } else {
            ui.coordDisplay.textContent = 'Hex: ---';
        }
    }
}

export function isPointInHex(px, py, hex) {
    const adjustedX = (px - state.panX) / state.zoomLevel;
    const adjustedY = (py - state.panY) / state.zoomLevel;
    const vertices = hex.vertices;
    let inside = false;
    for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
        const xi = vertices[i].x, yi = vertices[i].y;
        const xj = vertices[j].x, yj = vertices[j].y;
        const intersect = ((yi > adjustedY) !== (yj > adjustedY)) &&
            (adjustedX < (xj - xi) * (adjustedY - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

export function findTokenAtPosition(x, y) {
    const adjustedX = (x - state.panX) / state.zoomLevel;
    const adjustedY = (y - state.panY) / state.zoomLevel;
    for (let i = state.tokens.length - 1; i >= 0; i--) {
        const token = state.tokens[i];
        const dx = token.x - adjustedX;
        const dy = token.y - adjustedY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance <= state.hexSize * 0.4) {
            return i;
        }
    }
    return -1;
}

export function getCanvasCoords(event, canvas) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: (event.clientX - rect.left) * scaleX, y: (event.clientY - rect.top) * scaleY };
}
