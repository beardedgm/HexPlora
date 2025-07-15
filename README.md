# HexPlora

HexPlora is a web-based viewer for tabletop-style maps. It overlays a hexagonal grid on top of an image and allows you to reveal or hide individual hexes as the game progresses. Token markers can be dropped on the map and the full state can be exported or imported as JSON.

## Features

- Load a map image from any URL and generate a hex grid with selectable
  pointy-top or flat-top orientation.
- Adjustable grid (hex size, offsets, column/row count and scale).
- Customizable appearance for fog of war and grid lines.
- Reveal/hide mode for managing fog of war directly on the canvas.
- Add, move and clear tokens with customizable colors, labels and notes.
- Hover a token for a second to view its notes in a tooltip.
- Zoom and pan support with mouse wheel and drag controls.
- Import/export of the full map state (tokens with labels, notes, revealed hexes, settings).
- Toggleable header and optional debug view.
- Responsive layout built with Bootstrap 5.

## Opening `index.html`

1. Clone or download this repository.
2. Open `index.html` in a modern web browser. The page loads Bootstrap from a CDN, so internet access is required. If your browser blocks local file access when loading remote images, you can start a simple local server:
   ```bash
   python3 -m http.server
   ```
   Then navigate to `http://localhost:8000/index.html`.

## Browser Support

This project relies on standard HTML5 Canvas and modern JavaScript (ES6) features, as well as `localStorage` and the File API. It has been tested in recent versions of Chrome, Firefox and Edge. Safari should also work. Older browsers that lack these features are not supported.

### Known Limitations

- When opened directly from the file system, cross‑origin restrictions may prevent images from remote URLs from loading. Use a local web server if you encounter this.
- The interface is primarily tuned for desktop screens and may not behave perfectly on mobile devices.
- All data is stored locally in your browser; there is no server‑side persistence.

## Main Controls

The top header contains controls for map settings and appearance:

- **Map URL** – enter an image URL and click **Load Map** to display it.
- **Grid Settings** – configure hex size, grid offsets, column/row counts,
  map scale and orientation.
- **Appearance** – adjust fog color/opacity and grid line styling.

A row of buttons below the settings provides quick actions:

- **Mode: Reveal/Hide** – switches between revealing or hiding hexes.
- **Add Token** – enables token placement. A modal lets you set the token label, color, icon and optional notes. Existing tokens can be dragged or cleared.
- Hovering a token for a second displays its notes in a tooltip.
- **Reset View** – resets zoom and panning. **Reset Fog** hides all revealed hexes.
- **Clear Tokens** – removes all tokens from the map.
- **Toggle Debug** – shows internal debug information.
- **Export State** – opens a modal to copy or download the current state as JSON.
- **Import State** – load a JSON file previously exported.
- **Header Toggle** (caret icon) – collapses or expands the control panel.

Status indicators at the bottom display the current zoom level and hovered hex. Pan with the middle or right mouse button and zoom with the scroll wheel.
