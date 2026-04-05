# Manifold Chart Explorer — Project Conventions

## Architecture
Single-page React app. SVG-based rendering (no Three.js). Pure math + SVG.

## File Structure
- `src/constants.js` — All design tokens (colors, fonts, layout, animation params)
- `src/mathUtils.js` — Shared math (rotate3D, project3D, stereographic, parametric fns, wireframe generation)
- `src/components/shared/` — MappedDot, ChartPanel, TeachingText
- `src/components/CircleManifold.jsx` — Circle (S1) component
- `src/components/SphereManifold.jsx` — Sphere (S2) component
- `src/components/CylinderManifold.jsx` — Cylinder component
- `src/components/TorusManifold.jsx` — Torus (T2) component
- `src/components/KleinBottleManifold.jsx` — Klein Bottle component
- `src/App.jsx` — Main app shell (tabs, layout, state)

## Component Interface
Every manifold component receives these props and must conform to this interface:
```js
{
  dot: { u: number, v: number } | null,  // parametric position of placed dot (null = no dot)
  onDotPlace: (coords) => void,           // callback when user clicks to place a dot: { u, v }
  rotation: { x: number, y: number },     // camera rotation for 3D views
  onRotationChange: (rot) => void,        // callback when user drags to rotate: { x, y }
  width: number,                          // available width for the full component (both panels)
  height: number,                         // available height
  onTeachingText: (text) => void,         // callback to update teaching text
}
```

Each component renders a full-width SVG containing both the manifold view (left 55%) and charts view (right 45%).

## Design Tokens
- Import colors/fonts/sizes from `src/constants.js` — never hardcode
- Dark navy background (#0f172a), sky blue wireframes (#38bdf8)
- Amber (#fbbf24) for Chart A / dots, Cyan (#22d3ee) for Chart B
- Light green (#86efac) for overlap zones

## SVG Conventions
- Use viewBox for responsive scaling
- Wireframe lines: longitude stroke-width 1.2 at 35% opacity, latitude 0.8 at 25%
- Use filter drop-shadow for glow effects
- Depth-sort wireframe lines (back-to-front) with opacity modulated by depth

## Performance
- Memoize wireframe geometry with useMemo keyed on rotation
- Cap trail arrays at 30 points
- Chart grids are static — no recomputation

## Accessibility
- aria-label on interactive regions
- role="button" on clickable areas
- Teaching text has aria-live="polite"
