export const data = {
    hexSize: 40,
    offsetX: 0,
    offsetY: 0,
    columnCount: 20,
    rowCount: 15,
    orientation: 'pointy',
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
    isRemovingToken: false,
    pendingTokenPos: null,
    editingTokenIndex: -1,
    undoStack: [],
    redoStack: [],
    needsRedraw: false,
    revealMode: true
};

const observers = new Set();

function notify(key, value, oldValue) {
    observers.forEach(cb => cb(key, value, oldValue));
}

export const state = new Proxy(data, {
    set(target, prop, value) {
        const oldValue = target[prop];
        target[prop] = value;
        notify(prop, value, oldValue);
        return true;
    },
    get(target, prop) {
        return target[prop];
    }
});

export function getState(key) {
    return key ? state[key] : state;
}

export function setState(key, value) {
    state[key] = value;
}

export function subscribe(callback) {
    observers.add(callback);
    return () => observers.delete(callback);
}
