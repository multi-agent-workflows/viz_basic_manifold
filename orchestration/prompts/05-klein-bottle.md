You are implementing the Klein Bottle manifold component for the "Manifold Chart Explorer" React app.

## Project Context
The project is at `/Users/carloscotrini/Documents/git_bmai_fs26_cx/viz_basic_manifold/manifold-explorer`. Read the `CLAUDE.md` file there for project conventions. Read `src/constants.js` and `src/mathUtils.js` to understand available utilities.

## Your Task
Create `src/components/KleinBottleManifold.jsx` — the Klein bottle wireframe with a rectangle chart featuring the mirror-flip wrapping mechanic.

## Component Interface
```jsx
export default function KleinBottleManifold({ dot, onDotPlace, rotation, onRotationChange, width, height, onTeachingText })
```

## Specification

### Left Panel (55% width) — Klein Bottle Wireframe
Use the figure-8 immersion from `parametricKleinBottle` in mathUtils:
```
parametricKleinBottle(u, v, a=2.0, b=0.6)
For u in [0, 2pi), v in [0, 2pi):
  If u < pi:
    x = (a + b*cos(v)) * cos(u)
    y = (a + b*cos(v)) * sin(u)
    z = b * sin(v)
  If u >= pi:
    x = (a + b*cos(v+pi)) * cos(u)
    y = (a + b*cos(v+pi)) * sin(u)
    z = b * sin(v+pi)
```

- ~16 u-lines, ~12 v-lines.
- Use `generateWireframe` with the parametric function.
- Perspective projection (d=4), scale to fit panel.
- Auto-rotation + drag-to-rotate.
- Depth-sort wireframe lines.

**Self-intersection highlight:** The self-intersection region (where u crosses pi) should be highlighted:
- Wireframe lines in the self-intersection region get a pink (#f472b6) glow (filter: drop-shadow).
- A dashed outline in pink around the intersection region.
- Small annotation text: "Self-intersection is a 3D artifact — in 4D there's no collision" in muted/pink text near the intersection.

### Hit Testing
Approximate hit testing with invisible hit zones at wireframe grid intersections.

### Right Panel (45% width) — Rectangle Chart with Reversed Arrows

A flat rectangle — same layout as the torus — but with a CRITICAL DIFFERENCE:

**Arrow directions:**
- Left/right edges: amber (#fbbf24) arrows pointing the SAME direction (-> ->) — same as torus.
- Top/bottom edges: cyan (#22d3ee) arrows pointing OPPOSITE directions (^ on top, v on bottom) — THIS is the twist.

Small annotation near the reversed arrows: "The twist — arrows reversed" in pink (#f472b6) text.

Horizontal axis = u [0, 2pi), vertical axis = v [0, 2pi).

### Interaction — The Mirror-Flip Mechanic (KEY FEATURE)
This is the culmination of the entire app. The mirror-flip is what makes the Klein bottle different from the torus.

- Click to place dot: same as torus (dot on Klein bottle + rectangle).
- **Drag-to-explore:** Same as torus BUT with this critical difference:
  - **Left/right edges:** Normal wrapping (exit right, enter left at same v position) — same as torus.
  - **Top/bottom edges:** MIRROR-FLIP wrapping. When the dot exits at (u_exit, top), it re-enters at (2pi - u_exit, bottom). That is, the horizontal position is mirrored. If the dot exits at x=75% of the width from the top, it re-enters at x=25% of the width from the bottom.

- The 3D dot on the Klein bottle traces the corresponding path, passing through the orientation-reversing loop.
- Trail: same as torus (30 points, fading, 1.5s lifetime), on both views.

### Teaching Text
- Default: "Same recipe as the torus — but one pair of edges is reversed. Watch what happens at the seam."
- When dot mirror-flips: "The dot came back mirrored — left and right switched. There's no consistent 'inside' or 'outside.' This is a non-orientable surface."
- When dot wraps normally (left/right): "This direction wraps normally — just like the torus."

### SVG Structure
Single SVG, full width/height:
1. Vertical divider at 55%
2. Panel headers
3. Klein bottle wireframe in left panel with self-intersection highlight
4. Rectangle chart with directional arrows in right panel
5. "The twist" annotation near reversed arrows
6. Self-intersection annotation in left panel
7. Mapped dot(s) with coordinate readout
8. Trail on both panels
9. Arrow decorations — make the reversed arrows visually distinct (slightly larger, pink accent color alongside cyan)

Import from constants, mathUtils, shared components. Use the same state management pattern as the torus for drag and trail. Memoize wireframe. requestAnimationFrame for auto-rotation and trail.

This is the most complex manifold — take care with the mirror-flip logic and the self-intersection visualization.
