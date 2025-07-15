export class SpatialHashGrid {
    constructor(cellSize = 100) {
        this.cellSize = cellSize;
        this.cells = new Map();
    }

    clear() {
        this.cells.clear();
    }

    _key(cx, cy) {
        // Encode coordinates using a Cantor pairing on unsigned values to
        // avoid any chance of collisions with negative numbers.
        const encode = (n) => (n >= 0 ? 2 * n : -2 * n - 1);
        const x = encode(cx);
        const y = encode(cy);
        const pair = ((x + y) * (x + y + 1)) / 2 + y;
        return pair.toString();
    }

    _cellsForBounds(bounds) {
        const cxMin = Math.floor(bounds.xMin / this.cellSize);
        const cyMin = Math.floor(bounds.yMin / this.cellSize);
        const cxMax = Math.floor(bounds.xMax / this.cellSize);
        const cyMax = Math.floor(bounds.yMax / this.cellSize);
        const cells = [];
        for (let cx = cxMin; cx <= cxMax; cx++) {
            for (let cy = cyMin; cy <= cyMax; cy++) {
                cells.push(this._key(cx, cy));
            }
        }
        return cells;
    }

    insert(obj, bounds) {
        const keys = this._cellsForBounds(bounds);
        for (const key of keys) {
            if (!this.cells.has(key)) {
                this.cells.set(key, new Set());
            }
            this.cells.get(key).add(obj);
        }
    }

    queryPoint(x, y) {
        const cx = Math.floor(x / this.cellSize);
        const cy = Math.floor(y / this.cellSize);
        const key = this._key(cx, cy);
        const set = this.cells.get(key);
        if (!set) return [];
        return Array.from(set);
    }
}
