You are implementing the Circle (S1) manifold component for the "Manifold Chart Explorer" React app.

## Project Context
The project is at `/Users/carloscotrini/Documents/git_bmai_fs26_cx/viz_basic_manifold/manifold-explorer`. Read the `CLAUDE.md` file there for project conventions. Read `src/constants.js` and `src/mathUtils.js` to understand available utilities.

## Your Task
Create `src/components/CircleManifold.jsx` — the Circle manifold with its two overlapping charts.

## Component Interface
```jsx
export default function CircleManifold({ dot, onDotPlace, rotation, onRotationChange, width, height, onTeachingText })
```

## Specification

### Left Panel (55% width) — The Circle
- A circle rendered as a smooth SVG `<circle>` or `<path>`, radius ~160px, centered vertically in the left panel.
- Drawn in sky blue (#38bdf8), stroke width 3px.
- Subtle glow effect: `filter: drop-shadow(0 0 4px rgba(56, 189, 248, 0.3))`.
- The circle is clickable. On click, determine the angle theta from the click position relative to the circle center.

### Right Panel (45% width) — Two Chart Line Segments
Two overlapping arc segments displayed as horizontal line segments:

**Chart A (amber, #fbbf24):**
- Covers the circle MINUS the leftmost point (angle pi). So it covers theta in (-3pi/4, 3pi/4) approximately — actually, mathematically: theta in (-pi, pi), i.e., everything except the point at angle pi.
- Displayed as a horizontal line segment, labeled "Chart A".
- Parameter range label: "theta in (-pi, pi)".

**Chart B (cyan, #22d3ee):**
- Covers the circle MINUS the rightmost point (angle 0). So it covers theta in (0, 2pi), i.e., everything except the point at angle 0.
- Displayed as a second horizontal line segment BELOW Chart A, labeled "Chart B".

**Overlap zones:** Where both charts cover the same arc (the top and bottom arcs, roughly theta in (0, pi) and theta in (-pi, 0) mapped appropriately), highlight in light green (#86efac) on both line segments simultaneously.

### Parametric Mapping
- Circle point at angle theta -> position on Chart A: linear mapping of theta from (-pi, pi) to x-position on the line segment. Chart A cannot show the point at theta = pi (leftmost point).
- Circle point at angle theta -> position on Chart B: map theta in (0, 2pi) to x-position on the line segment. Chart B cannot show the point at theta = 0 (rightmost point).
- Points in the overlap zone light up on BOTH charts.

### Interaction
- Click anywhere on the circle -> a glowing dot (amber, r=6, with pulsing glow) appears at that point on the circle AND at the corresponding position(s) on the chart line(s).
- Click on a chart line -> dot appears at the corresponding point on the circle.
- If the point is in the overlap zone (covered by both charts), dots appear on both charts with a subtle dashed light-green connecting line between them.
- If the point is only on one chart, that chart's dot lights up; the other chart shows a small "x" icon in muted gray at its edge.

### Teaching Text
Call `onTeachingText(text)` with context-sensitive text:
- On mount / no dot: "A circle is the simplest manifold. Can one flat map cover it all?"
- After clicking in Chart A only zone (near theta=0): "This point is only on Chart A. One map can't see the whole circle."
- After clicking in Chart B only zone (near theta=pi): "This point is only on Chart B. One map can't see the whole circle."
- After clicking in overlap: "This point appears on both charts — they agree where they overlap."

### SVG Structure
Render a single SVG with viewBox that spans the full width and height. Draw:
1. A vertical divider line at 55% width
2. Panel headers: "Manifold" (left) and "Charts" (right) in small muted uppercase text
3. The circle in the left panel
4. The two chart line segments in the right panel
5. The mapped dot(s) using the MappedDot shared component

Import from:
- `../constants` for COLORS, FONTS
- `../../mathUtils` for parametricCircle, normalizeAngle
- `./shared/MappedDot` for the dot component
- `./shared/ChartPanel` for chart backgrounds

Use `useMemo`, `useCallback` as appropriate. The component should be a default export.
