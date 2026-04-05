You are implementing the Torus (T2) manifold component for the "Manifold Chart Explorer" React app.

## Project Context
The project is at `/Users/carloscotrini/Documents/git_bmai_fs26_cx/viz_basic_manifold/manifold-explorer`. Read the `CLAUDE.md` file there for project conventions. Read `src/constants.js` and `src/mathUtils.js` to understand available utilities.

## Your Task
Create `src/components/TorusManifold.jsx` — the wireframe torus with a flat rectangle chart featuring wrapping edges and a drag-to-explore mechanic.

## Component Interface
```jsx
export default function TorusManifold({ dot, onDotPlace, rotation, onRotationChange, width, height, onTeachingText })
```

## Specification

### Left Panel (55% width) — Wireframe Torus
- Major radius R=1.0, minor radius r=0.4.
- ~16 longitude lines, ~12 latitude lines.
- Use `generateWireframe` with `parametricTorus` from mathUtils.
  - parametricTorus(u, v, R, r): u in [0, 2pi), v in [0, 2pi)
  - uSteps = 16, vSteps = 12
- Perspective projected (d=4), scaled to fit the panel (~120px effective radius).
- Auto-rotation + drag-to-rotate (same pattern as sphere/cylinder).
- Depth-sort wireframe lines, opacity modulated by depth.

### Hit Testing
Approximate hit testing with invisible hit zones at wireframe grid intersections, same approach as cylinder.

### Right Panel (45% width) — Rectangle Chart with Wrapping Arrows

**Main chart: a flat rectangle** representing the full torus parameterization.
- Horizontal axis = u (longitude around the hole), range [0, 2pi).
- Vertical axis = v (longitude around the tube), range [0, 2pi).
- Background: surface color with chart grid.

**Wrapping arrows on all four edges:**
- Left/right edges: amber (#fbbf24) arrows pointing the same direction (right-pointing arrow ">" on both the right edge and left edge), indicating "exit right = enter left."
- Top/bottom edges: cyan (#22d3ee) arrows pointing the same direction (down-pointing arrow "v" on both bottom and top edges), indicating "exit bottom = enter top."
- Draw the arrows as small SVG arrow shapes at the midpoints of each edge.

**Chart B (small secondary patch):**
Below the main rectangle, show a smaller "patch" chart (amber outline, labeled "Chart B") representing a neighborhood around the crossing circles. When the user clicks near the seam on the torus (u near 0 or v near 0), this second chart activates and shows the dot.

### Interaction — The Dot-Wrapping Mechanic (KEY FEATURE)
This is the most important interaction for the torus — the "Pac-Man moment."

- Click anywhere on the torus -> dot appears on torus and on the rectangle at (u, v).
- Click on the rectangle -> dot appears on the torus.
- **Drag-to-explore:** After clicking to place a dot, the user can DRAG the dot on the rectangle:
  - Cursor: `grab` on hover, `grabbing` during drag.
  - Dot follows pointer within the rectangle.
  - **When exiting the right edge, it re-enters from the left edge** at the same vertical position.
  - **When exiting the top edge, it re-enters from the bottom edge** at the same horizontal position.
  - The corresponding dot on the 3D torus traces a continuous path.
  
- **Trail:** Leave a fading trail of the last 30 positions. Each trail point has decreasing opacity (60% to 0%) and lives for 1.5 seconds. Show the trail on BOTH the rectangle and the torus.

### State Management for Drag
Use internal state:
- `isDraggingDot` (boolean)
- `trail` (array of { u, v, age } objects, max 30)
- Update trail on each animation frame during drag.

### Teaching Text
- Default: "A torus is a rectangle with opposite edges glued. The flat rectangle IS its chart."
- When dot wraps horizontally: "Exit right, enter left — just like a video game screen. The flat map and the torus are two views of the same thing."
- When dot wraps vertically: "Exit top, enter bottom — the other direction wraps too."

### SVG Structure
Single SVG, full width/height:
1. Vertical divider at 55%
2. Panel headers
3. Wireframe torus in left panel
4. Main rectangle chart with wrapping arrows in right panel
5. Small Chart B patch below main chart
6. Mapped dot(s) with coordinate readout
7. Trail on both panels (circles with fading opacity)
8. Arrow decorations on chart edges

Import from constants, mathUtils, shared components. Use useState, useEffect, useMemo, useCallback, useRef. Memoize wireframe. requestAnimationFrame for auto-rotation and trail updates.
