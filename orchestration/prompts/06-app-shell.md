You are implementing the main App shell for the "Manifold Chart Explorer" React app.

## Project Context
The project is at `/Users/carloscotrini/Documents/git_bmai_fs26_cx/viz_basic_manifold/manifold-explorer`. Read the `CLAUDE.md` file there for project conventions. Read `src/constants.js` to understand design tokens.

## Your Task
Rewrite `src/App.jsx` to be the complete application shell: tab navigation, split-panel layout, state management, and integration of all 5 manifold components.

Also update `src/main.jsx` and `index.html` as needed.

## Specification

### Overall Layout
```
+------------------------------------------------------------------+
|  HEADER: Title + manifold selector tabs                          |
|  +----------------------------+----------------------------------+
|  |                            |                                  |
|  |    3D MANIFOLD VIEW        |     CHART(S) VIEW                |
|  |    (left 55%)              |     (right 45%)                  |
|  |                            |                                  |
|  +----------------------------+----------------------------------+
|  |  TEACHING TEXT BAR (bottom, 64px)                             |
|  +---------------------------------------------------------------+
+------------------------------------------------------------------+
```

### Header
- Title: "Manifold Chart Explorer" in Syne font, 800 weight, 28px.
- Gradient text: `background: linear-gradient(135deg, #38bdf8, #22d3ee); -webkit-background-clip: text; -webkit-text-fill-color: transparent;`
- Subtle text-shadow: `0 0 30px rgba(56, 189, 248, 0.15)`.
- Below the title: horizontal tab bar with 5 tabs.

### Tab Bar
Five tabs, each with icon + name:
```
[ Circle ]  [ Sphere ]  [ Cylinder ]  [ Torus ]  [ Klein Bottle ]
```
Using the icons from MANIFOLDS in constants.js.

- Active tab: sky blue (#38bdf8) text + 3px underline accent bar.
- Inactive tabs: muted (#94a3b8) text, on hover text brightens to #f1f5f9.
- Tab font: DM Sans, 500 weight, 14px.
- Tabs should be keyboard-navigable (arrow keys to switch, or number keys 1-5).

Below the tabs, a subtitle line that changes per manifold (from MANIFOLDS[].subtitle):
- DM Sans, 400 weight, 13px, muted color.

### State Management
```js
const [activeManifold, setActiveManifold] = useState(0);
const [dot, setDot] = useState(null);
const [rotation, setRotation] = useState({ x: 0.3, y: 0 });
const [teachingText, setTeachingText] = useState('');
```

When switching manifolds:
- Reset dot to null
- Reset rotation to { x: 0.3, y: 0 }
- Reset teaching text to default
- Cross-fade transition: 400ms ease-out (outgoing fades out, incoming fades in)

### Main Content Area
- Full remaining height between header and teaching bar.
- The active manifold component fills this area.
- Use a ref to measure available width and height, pass to the manifold component.
- Background: radial gradient from #0f172a (center) to #0a0f1a (edges).
- Very faint grid pattern overlay (40px spacing, #334155 at 5% opacity) on the background — gives a "mathematical paper" feel.

### Manifold Component Rendering
Import all 5 manifold components:
```js
import CircleManifold from './components/CircleManifold';
import SphereManifold from './components/SphereManifold';
import CylinderManifold from './components/CylinderManifold';
import TorusManifold from './components/TorusManifold';
import KleinBottleManifold from './components/KleinBottleManifold';
```

Render the active one, passing the standard props:
```jsx
<ActiveComponent
  dot={dot}
  onDotPlace={setDot}
  rotation={rotation}
  onRotationChange={setRotation}
  width={contentWidth}
  height={contentHeight}
  onTeachingText={setTeachingText}
/>
```

### Teaching Text Bar
Use the TeachingText shared component at the bottom.
Height: 64px. Centered text. Font: DM Sans 400 15px.

### Cross-Fade Transition
When activeManifold changes:
1. Current manifold fades out (opacity 1 -> 0, 200ms).
2. After 200ms, swap the component.
3. New manifold fades in (opacity 0 -> 1, 200ms).
Use CSS transition on a wrapper div, or useState to manage the fade state.

### Keyboard Shortcuts
- Arrow keys (left/right): navigate between manifolds
- Number keys 1-5: jump to specific manifold
- Add a `useEffect` with `keydown` event listener on `window`.

### Responsive Layout
- Use `useRef` + `useEffect` + `ResizeObserver` to measure the content area dimensions.
- Pass measured width/height to the active manifold component.
- The app should fill the full viewport (100vw x 100vh, overflow hidden).

### Global Styles
Make sure `index.html` has:
- Font imports (Google Fonts link)
- Global reset styles (margin: 0, padding: 0, box-sizing: border-box)
- body background: #0f172a, overflow: hidden
- The dotPulse keyframe animation

### Files to Create/Modify
1. Rewrite `src/App.jsx` with the full app shell
2. Update `src/main.jsx` if needed (probably just needs the import)
3. Update `index.html` with fonts and global styles

The manifold components already exist as separate files — just import them. If any import fails because a component doesn't exist yet, add a fallback:
```jsx
const components = [CircleManifold, SphereManifold, CylinderManifold, TorusManifold, KleinBottleManifold];
const ActiveComponent = components[activeManifold] || (() => <div>Loading...</div>);
```
