You are setting up the foundation for the "Manifold Chart Explorer" — an interactive React app that teaches manifolds and charts through 5 manifolds (Circle, Sphere, Cylinder, Torus, Klein Bottle).

## Your Task
Create the complete project scaffold with Vite + React, shared utilities, constants, and shared components. Other agents will build individual manifold components on top of this foundation.

## Step 1: Create the Vite React project

```bash
cd /Users/carloscotrini/Documents/git_bmai_fs26_cx/viz_basic_manifold
npm create vite@latest manifold-explorer -- --template react
cd manifold-explorer
npm install
```

## Step 2: Create `src/constants.js`

Export all design tokens used across the app:

```js
// Color palette (Dark Lecture theme)
export const COLORS = {
  background: '#0f172a',
  surface: '#1e293b',
  primary: '#38bdf8',      // sky blue - wireframes, active tab
  amber: '#fbbf24',        // Chart A, interactive dot
  green: '#34d399',        // overlap confirmation
  pink: '#f472b6',         // failures, self-intersection
  cyan: '#22d3ee',         // Chart B elements
  lightGreen: '#86efac',   // overlap zones
  text: '#f1f5f9',         // primary text
  muted: '#94a3b8',        // secondary text, labels
  grid: '#334155',         // dividers, wireframe grid
  dormant: '#131c2e',
};

// Typography
export const FONTS = {
  display: "'Syne', sans-serif",
  body: "'DM Sans', sans-serif",
  mono: "'JetBrains Mono', monospace",
};

// Layout
export const LAYOUT = {
  leftPanelWidth: 0.55,
  rightPanelWidth: 0.45,
  headerHeight: 72,
  teachingBarHeight: 64,
  panelPadding: 24,
};

// Wireframe rendering
export const WIREFRAME = {
  longitudeOpacity: 0.35,
  latitudeOpacity: 0.25,
  longitudeWidth: 1.2,
  latitudeWidth: 0.8,
  backgroundFillOpacity: 0.06,
  perspectiveDistance: 4,
};

// Animation
export const ANIMATION = {
  crossFadeDuration: 400,
  dotScaleUpDuration: 200,
  dotGlowCycle: 2000,
  trailLifetime: 1500,
  autoRotateSpeed: 0.3,  // rad/s
  rotationSensitivity: 0.005,  // rad/px
  autoRotateResumeDelay: 3000,
};

// Manifold definitions
export const MANIFOLDS = [
  { id: 'circle',  name: 'Circle',       icon: '○', subtitle: '1D — The simplest loop' },
  { id: 'sphere',  name: 'Sphere',       icon: '◎', subtitle: '2D — Why flat maps lie' },
  { id: 'cylinder', name: 'Cylinder',    icon: '◇', subtitle: '2D — Flat in one direction' },
  { id: 'torus',   name: 'Torus',        icon: '◯', subtitle: '2D — The video game screen' },
  { id: 'klein',   name: 'Klein Bottle', icon: '∞', subtitle: '2D — The twist' },
];
```

## Step 3: Create `src/mathUtils.js`

Export all shared math functions:

```js
/**
 * Apply rotation matrix (rotX around X-axis, rotY around Y-axis) to a 3D point.
 * @param {number} x
 * @param {number} y
 * @param {number} z
 * @param {number} rotX - rotation around X axis in radians
 * @param {number} rotY - rotation around Y axis in radians
 * @returns {[number, number, number]}
 */
export function rotate3D(x, y, z, rotX, rotY) {
  // Rotate around Y-axis
  let x1 = x * Math.cos(rotY) + z * Math.sin(rotY);
  let z1 = -x * Math.sin(rotY) + z * Math.cos(rotY);
  let y1 = y;
  // Rotate around X-axis
  let y2 = y1 * Math.cos(rotX) - z1 * Math.sin(rotX);
  let z2 = y1 * Math.sin(rotX) + z1 * Math.cos(rotX);
  return [x1, y2, z2];
}

/**
 * Project a 3D point to 2D using perspective projection.
 * @param {number} x
 * @param {number} y
 * @param {number} z
 * @param {number} d - camera distance (default 4)
 * @returns {{ x: number, y: number, depth: number }}
 */
export function project3D(x, y, z, d = 4) {
  const scale = d / (d + z);
  return { x: x * scale, y: y * scale, depth: z };
}

/**
 * Stereographic projection from north pole (0,1,0).
 * Maps sphere point to plane. Undefined at north pole.
 * @param {number} x
 * @param {number} y - "up" axis
 * @param {number} z
 * @returns {{ u: number, v: number }}
 */
export function stereographicN(x, y, z) {
  const denom = 1 - y;
  if (Math.abs(denom) < 0.001) return null;
  return { u: x / denom, v: z / denom };
}

/**
 * Stereographic projection from south pole (0,-1,0).
 * @param {number} x
 * @param {number} y
 * @param {number} z
 * @returns {{ u: number, v: number }}
 */
export function stereographicS(x, y, z) {
  const denom = 1 + y;
  if (Math.abs(denom) < 0.001) return null;
  return { u: x / denom, v: z / denom };
}

/**
 * Inverse stereographic projection from north pole.
 * @param {number} u
 * @param {number} v
 * @returns {[number, number, number]} - point on unit sphere
 */
export function inverseStereographicN(u, v) {
  const r2 = u * u + v * v;
  return [2 * u / (1 + r2), (r2 - 1) / (1 + r2), 2 * v / (1 + r2)];
}

/**
 * Inverse stereographic projection from south pole.
 * @param {number} u
 * @param {number} v
 * @returns {[number, number, number]} - point on unit sphere
 */
export function inverseStereographicS(u, v) {
  const r2 = u * u + v * v;
  return [2 * u / (1 + r2), (1 - r2) / (1 + r2), 2 * v / (1 + r2)];
}

// --- Parametric surface generators ---

export function parametricCircle(theta) {
  return { x: Math.cos(theta), y: Math.sin(theta) };
}

export function parametricSphere(u, v) {
  // u = longitude [0, 2pi), v = latitude [-pi/2, pi/2]
  return {
    x: Math.cos(v) * Math.cos(u),
    y: Math.sin(v),
    z: Math.cos(v) * Math.sin(u),
  };
}

export function parametricCylinder(theta, h) {
  return { x: Math.cos(theta), y: h, z: Math.sin(theta) };
}

export function parametricTorus(u, v, R = 1.0, r = 0.4) {
  return {
    x: (R + r * Math.cos(v)) * Math.cos(u),
    y: (R + r * Math.cos(v)) * Math.sin(u),
    z: r * Math.sin(v),
  };
}

export function parametricKleinBottle(u, v, a = 2.0, b = 0.6) {
  // Figure-8 immersion
  if (u < Math.PI) {
    return {
      x: (a + b * Math.cos(v)) * Math.cos(u),
      y: (a + b * Math.cos(v)) * Math.sin(u),
      z: b * Math.sin(v),
    };
  } else {
    return {
      x: (a + b * Math.cos(v + Math.PI)) * Math.cos(u),
      y: (a + b * Math.cos(v + Math.PI)) * Math.sin(u),
      z: b * Math.sin(v + Math.PI),
    };
  }
}

/**
 * Generate wireframe lines for a parametric surface.
 * Returns arrays of polylines (arrays of 3D points).
 * @param {Function} paramFn - (u, v) => {x, y, z}
 * @param {number} uSteps - number of u lines
 * @param {number} vSteps - number of v lines
 * @param {number} uMin
 * @param {number} uMax
 * @param {number} vMin
 * @param {number} vMax
 * @param {number} resolution - points per line
 * @returns {{ uLines: Array, vLines: Array }}
 */
export function generateWireframe(paramFn, uSteps, vSteps, uMin, uMax, vMin, vMax, resolution = 40) {
  const uLines = [];
  const vLines = [];

  // Lines of constant u (longitude)
  for (let i = 0; i <= uSteps; i++) {
    const u = uMin + (uMax - uMin) * (i / uSteps);
    const line = [];
    for (let j = 0; j <= resolution; j++) {
      const v = vMin + (vMax - vMin) * (j / resolution);
      const pt = paramFn(u, v);
      line.push([pt.x, pt.y, pt.z]);
    }
    uLines.push(line);
  }

  // Lines of constant v (latitude)
  for (let j = 0; j <= vSteps; j++) {
    const v = vMin + (vMax - vMin) * (j / vSteps);
    const line = [];
    for (let i = 0; i <= resolution; i++) {
      const u = uMin + (uMax - uMin) * (i / resolution);
      const pt = paramFn(u, v);
      line.push([pt.x, pt.y, pt.z]);
    }
    vLines.push(line);
  }

  return { uLines, vLines };
}

/**
 * Project and render a wireframe line to SVG path data.
 * @param {Array} line - array of [x,y,z] points
 * @param {number} rotX
 * @param {number} rotY
 * @param {number} d - perspective distance
 * @param {number} scale - pixels per unit
 * @param {number} cx - center x in SVG
 * @param {number} cy - center y in SVG
 * @returns {string} SVG path d attribute
 */
export function wireframeToPath(line, rotX, rotY, d, scale, cx, cy) {
  const projected = line.map(([x, y, z]) => {
    const [rx, ry, rz] = rotate3D(x, y, z, rotX, rotY);
    const p = project3D(rx, ry, rz, d);
    return { x: cx + p.x * scale, y: cy - p.y * scale, depth: p.depth };
  });

  let path = '';
  for (let i = 0; i < projected.length; i++) {
    const { x, y } = projected[i];
    path += i === 0 ? `M${x.toFixed(1)},${y.toFixed(1)}` : ` L${x.toFixed(1)},${y.toFixed(1)}`;
  }
  return path;
}

/**
 * Normalize angle to [0, 2*PI)
 */
export function normalizeAngle(theta) {
  return ((theta % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
}

/**
 * Clamp a value between min and max.
 */
export function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max);
}
```

## Step 4: Create shared components

### `src/components/shared/MappedDot.jsx`
A glowing dot that appears on both the manifold and chart views.

```jsx
import React from 'react';
import { COLORS } from '../../constants';

export default function MappedDot({ cx, cy, color = COLORS.amber, r = 6, label = null, animate = true }) {
  return (
    <g>
      {/* Glow */}
      <circle
        cx={cx} cy={cy} r={r + 4}
        fill={color}
        opacity={0.3}
        style={animate ? { animation: 'dotPulse 2s ease-in-out infinite' } : undefined}
      />
      {/* Main dot */}
      <circle cx={cx} cy={cy} r={r} fill={color} />
      {/* Label */}
      {label && (
        <text
          x={cx + r + 6} y={cy + 4}
          fill={COLORS.muted}
          fontSize={11}
          fontFamily="'JetBrains Mono', monospace"
        >
          {label}
        </text>
      )}
    </g>
  );
}
```

### `src/components/shared/ChartPanel.jsx`
Container for chart visualizations with background grid.

```jsx
import React from 'react';
import { COLORS } from '../../constants';

export default function ChartPanel({ x, y, width, height, label, children }) {
  const gridSpacing = 40;
  const gridLines = [];

  for (let gx = gridSpacing; gx < width; gx += gridSpacing) {
    gridLines.push(<line key={`v${gx}`} x1={x + gx} y1={y} x2={x + gx} y2={y + height} stroke={COLORS.grid} strokeWidth={0.5} opacity={0.12} />);
  }
  for (let gy = gridSpacing; gy < height; gy += gridSpacing) {
    gridLines.push(<line key={`h${gy}`} x1={x} y1={y + gy} x2={x + width} y2={y + gy} stroke={COLORS.grid} strokeWidth={0.5} opacity={0.12} />);
  }

  return (
    <g>
      {/* Background */}
      <rect x={x} y={y} width={width} height={height} fill={COLORS.surface} stroke={COLORS.grid} strokeWidth={1} rx={8} ry={8} />
      {/* Grid */}
      {gridLines}
      {/* Label */}
      {label && (
        <text x={x + 8} y={y + 16} fill={COLORS.muted} fontSize={12} fontWeight={700} fontFamily="'DM Sans', sans-serif">
          {label}
        </text>
      )}
      {/* Content */}
      {children}
    </g>
  );
}
```

### `src/components/shared/TeachingText.jsx`
Context-sensitive teaching text bar at the bottom.

```jsx
import React, { useState, useEffect } from 'react';
import { COLORS, FONTS, LAYOUT } from '../../constants';

export default function TeachingText({ text }) {
  const [displayText, setDisplayText] = useState(text);
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    setOpacity(0);
    const timer = setTimeout(() => {
      setDisplayText(text);
      setOpacity(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [text]);

  return (
    <div
      style={{
        height: LAYOUT.teachingBarHeight,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 32px',
        fontFamily: FONTS.body,
        fontSize: 15,
        color: COLORS.text,
        opacity,
        transition: 'opacity 300ms ease',
        textAlign: 'center',
      }}
      aria-live="polite"
    >
      {displayText}
    </div>
  );
}
```

## Step 5: Create minimal `src/App.jsx` placeholder

```jsx
import React from 'react';
import { COLORS, FONTS } from './constants';

export default function App() {
  return (
    <div style={{
      background: COLORS.background,
      minHeight: '100vh',
      color: COLORS.text,
      fontFamily: FONTS.body,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <h1 style={{ fontFamily: FONTS.display, fontSize: 28, fontWeight: 800 }}>
        Manifold Chart Explorer
      </h1>
    </div>
  );
}
```

## Step 6: Update `src/main.jsx`

```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

## Step 7: Update `index.html`

Add font imports in the `<head>`:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:ital,wght@0,400;0,500;0,700;1,400&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

Also add a global style block:
```html
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #0f172a; overflow: hidden; }
  @keyframes dotPulse {
    0%, 100% { opacity: 0.4; }
    50% { opacity: 0.8; }
  }
</style>
```

## Step 8: Create `CLAUDE.md` in the project root

Write a CLAUDE.md file at `manifold-explorer/CLAUDE.md` with this content:

```markdown
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
```

## Verification
After creating all files, run:
```bash
cd /Users/carloscotrini/Documents/git_bmai_fs26_cx/viz_basic_manifold/manifold-explorer
npm run dev -- --port 3456 &
sleep 3
kill %1
```
to verify the project builds and starts without errors.

Create all the files listed above. Use the Write tool for each file. Make sure:
1. The directory structure exists (create dirs with mkdir -p as needed)
2. All imports are correct
3. The project runs without errors
