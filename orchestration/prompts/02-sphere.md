You are implementing the Sphere (S2) manifold component for the "Manifold Chart Explorer" React app.

## Project Context
The project is at `/Users/carloscotrini/Documents/git_bmai_fs26_cx/viz_basic_manifold/manifold-explorer`. Read the `CLAUDE.md` file there for project conventions. Read `src/constants.js` and `src/mathUtils.js` to understand available utilities.

## Your Task
Create `src/components/SphereManifold.jsx` — the wireframe sphere with two stereographic projection disc charts.

## Component Interface
```jsx
export default function SphereManifold({ dot, onDotPlace, rotation, onRotationChange, width, height, onTeachingText })
```

## Specification

### Left Panel (55% width) — Wireframe Sphere
- A wireframe sphere with 12 longitude lines and 11 latitude lines.
- Use `generateWireframe` from mathUtils with `parametricSphere` to generate the wireframe.
  - parametricSphere(u, v): u = longitude [0, 2pi), v = latitude [-pi/2, pi/2]
  - uSteps = 12 (longitude), vSteps = 11 (latitude)
- Apply rotation using `rotate3D` and `project3D` with perspective distance d=4.
- Sphere radius maps to ~150px on screen.
- Sky blue (#38bdf8) wireframe: longitude lines at 35% opacity, width 1.2px; latitude lines at 25% opacity, width 0.8px.
- Very faint filled circle behind the wireframe (primary color at 6% opacity) for depth.
- Auto-rotation: increment rotY by 0.3 rad/s using requestAnimationFrame. Stop on user interaction (drag), resume after 3 seconds of no interaction.
- Depth-sort wireframe lines by average z-depth. Modulate opacity by depth (farther = more transparent).

### Drag-to-Rotate
- On pointerdown in left panel, start tracking.
- On pointermove, delta-x maps to rotY change (0.005 rad/px), delta-y maps to rotX change (0.005 rad/px).
- Call `onRotationChange({ x: newRotX, y: newRotY })`.
- On pointerup, stop tracking.

### Hit Testing (clicking on the sphere)
- When user clicks on the left panel (not dragging), do ray-sphere intersection:
  1. Convert click position to coordinates relative to sphere center in the SVG.
  2. Convert to normalized coordinates (divide by sphere screen radius).
  3. If the click is within the projected circle, compute the z coordinate: z = sqrt(1 - x^2 - y^2).
  4. Inverse-rotate the point (apply inverse of current rotation) to get the un-rotated sphere point.
  5. Extract (u, v) parametric coords: u = atan2(z_orig, x_orig), v = asin(y_orig).
  6. Call `onDotPlace({ u, v })`.

### Right Panel (45% width) — Two Stereographic Disc Charts
Two circular disc charts stacked vertically:

**Chart N (amber, #fbbf24):** "View from North Pole"
- A circle (disc) drawn in the right panel's upper half.
- Represents stereographic projection from the north pole.
- The south pole maps to the center, the equator maps to a circle at ~60% of the disc radius.
- Points approaching the north pole fly off to infinity (clamped at disc edge).
- Label: "Chart N — everything except the North Pole"
- Draw a faint 8x8 distortion grid inside the disc (gray at 15% opacity). Near center: roughly square cells. Near edges: stretched/distorted. This shows "the map lies more at the edges."

**Chart S (cyan, #22d3ee):** "View from South Pole"
- Same but inverted, in the lower half.
- North pole maps to center.
- Label: "Chart S — everything except the South Pole"

**Overlap region:** The equatorial band (roughly |latitude| < 45 degrees) is highlighted in light green on both discs.

### Mapping
- Use `stereographicN(x, y, z)` from mathUtils for Chart N projection.
- Use `stereographicS(x, y, z)` from mathUtils for Chart S projection.
- When a dot is placed: compute the 3D point from (u, v) using parametricSphere, then project to both charts. Show dot on whichever chart(s) can see it (Chart N sees everything except north pole, Chart S sees everything except south pole).
- Clicking on a chart disc: inverse stereographic projection to find the sphere point, then call onDotPlace.

### Teaching Text
Call `onTeachingText(text)`:
- Default: "Two flat maps, each missing one point. Together, they cover everything."
- Near north pole (v > 1.2): "This point is near the North Pole — Chart N can't see it, but Chart S can."
- Near south pole (v < -1.2): "This point is near the South Pole — Chart S can't see it, but Chart N can."
- Near equator (|v| < 0.5): "The equator is on both maps — where they agree."

### SVG Structure
Single SVG with viewBox spanning full width/height. Include:
1. Vertical divider at 55%
2. Panel headers
3. Wireframe sphere with depth-sorted lines in left panel
4. Two disc charts with distortion grids in right panel
5. Mapped dot(s) on sphere and chart(s)
6. Coordinate readout next to chart dots (e.g., "(u, v) = (1.2, 0.8)")

Import from:
- `../../constants` for COLORS, FONTS, WIREFRAME, ANIMATION
- `../../mathUtils` for rotate3D, project3D, stereographicN, stereographicS, inverseStereographicN, inverseStereographicS, parametricSphere, generateWireframe, wireframeToPath
- `../shared/MappedDot`
- `../shared/ChartPanel`

Use `useState`, `useEffect`, `useMemo`, `useCallback`, `useRef`. Memoize wireframe geometry keyed on rotation. Use requestAnimationFrame for auto-rotation.
