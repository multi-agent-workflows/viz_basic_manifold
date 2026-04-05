You are implementing the Cylinder manifold component for the "Manifold Chart Explorer" React app.

## Project Context
The project is at `/Users/carloscotrini/Documents/git_bmai_fs26_cx/viz_basic_manifold/manifold-explorer`. Read the `CLAUDE.md` file there for project conventions. Read `src/constants.js` and `src/mathUtils.js` to understand available utilities.

## Your Task
Create `src/components/CylinderManifold.jsx` — the wireframe cylinder with two rectangular charts.

## Component Interface
```jsx
export default function CylinderManifold({ dot, onDotPlace, rotation, onRotationChange, width, height, onTeachingText })
```

## Specification

### Left Panel (55% width) — Wireframe Cylinder
- Height ~2 units, radius 1 unit.
- 12 vertical lines (longitude), 8 horizontal circles (latitude).
- Use `generateWireframe` with `parametricCylinder` from mathUtils.
  - parametricCylinder(theta, h): theta in [0, 2pi), h in [-1, 1]
  - uSteps = 12, vSteps = 8
- Same perspective projection as sphere (d=4), scale to ~150px radius.
- Sky blue wireframe with standard opacity/width conventions.
- Auto-rotation and drag-to-rotate (same as sphere).
- Depth-sort wireframe lines by average z-depth.

### Hit Testing
Use approximate hit testing:
- Create invisible hit zones at wireframe intersection points.
- On click, find the nearest intersection point within a reasonable radius.
- Extract (theta, h) parametric coords from the nearest point.
- Call `onDotPlace({ u: theta, v: h })`.

### Right Panel (45% width) — Two Rectangular Charts
Since one chart almost covers the cylinder (all except one vertical line), show two overlapping rectangular charts:

**Chart A (amber, #fbbf24):**
- A rectangle. Horizontal axis = angle theta (wrapping direction, range (-pi, pi)), vertical axis = height h (range [-1, 1]).
- The rectangle has a thin vertical strip gap on the RIGHT edge (at theta = pi) in muted gray, labeled "gap".
- This represents the one vertical line that Chart A cannot cover (the "back seam").

**Chart B (cyan, #22d3ee):**
- A second rectangle below Chart A.
- Shifted so its gap is on the LEFT edge (at theta = 0, the "front seam").
- Range: theta in (0, 2pi), h in [-1, 1].

**Overlap zones:** Most of each rectangle (everything except the thin edge strips) highlighted in light green (#86efac) with very low opacity background.

### Parametric Mapping
- Cylinder point at (theta, h):
  - Chart A maps theta in (-pi, pi) to horizontal position, h to vertical position. Gap at theta = +-pi.
  - Chart B maps theta in (0, 2pi) to horizontal position, h to vertical position. Gap at theta = 0.
- When a dot is placed on the cylinder, show it on whichever chart(s) can see it.
- Points near the back seam (theta near pi) appear only on Chart B.
- Points near the front seam (theta near 0) appear only on Chart A.
- Most points appear on both charts.

### Interaction
- Click on cylinder -> dot on cylinder and chart(s).
- Click on a chart rectangle -> dot on cylinder at the corresponding (theta, h).
- The cylinder can be rotated to show the "back seam" that Chart A misses.

### Teaching Text
- Default: "The cylinder wraps in one direction and is flat in the other. Its charts are almost-complete rectangles."
- Near a seam (theta near pi for Chart A gap): "Right at the seam, you need the second chart."
- In overlap zone: "Both charts agree here — most of the cylinder is covered by both."

### SVG Structure
Single SVG, full width/height. Include:
1. Vertical divider at 55%
2. Panel headers
3. Wireframe cylinder in left panel
4. Two rectangular charts with gap strips in right panel, using ChartPanel component
5. Mapped dot(s) with coordinate readout
6. Gap labels on the chart edges

Import from constants, mathUtils, shared components as described in CLAUDE.md.
Use useMemo for wireframe geometry, requestAnimationFrame for auto-rotation.
