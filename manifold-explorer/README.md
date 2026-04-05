# Manifold Chart Explorer

An interactive single-page React application that teaches the relationship between manifolds and their charts (flat maps). Navigate between five manifolds — from the simplest loop to surfaces that twist in four dimensions — and see how curved spaces are charted onto flat ones.

## The Five Manifolds

| # | Manifold | What it teaches |
|---|----------|----------------|
| 1 | **Circle (S1)** | The simplest manifold. One chart almost works, but you need two. |
| 2 | **Sphere (S2)** | Two stereographic projections. Why flat maps of the Earth always lie. |
| 3 | **Cylinder** | Flat in one direction, wraps in the other. A stepping stone to the torus. |
| 4 | **Torus (T2)** | Both directions wrap. The flat rectangle IS the chart — the Pac-Man moment. |
| 5 | **Klein Bottle** | Same as the torus but with a twist. Drag a dot off the edge and watch it come back mirrored. |

## How It Works

Each manifold is presented as a split screen:

- **Left panel (55%)** — the manifold itself (wireframe SVG with rotation)
- **Right panel (45%)** — its flat chart(s), showing how the curved surface maps to flat coordinates

Click or hover on either side to map a point between the two views in real time. On the torus and Klein bottle, you can drag the dot across chart edges to experience wrapping and mirror-flipping.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Build for Production

```bash
npm run build
```

Output goes to `dist/`. The production bundle is ~73 KB gzipped.

## Technology

- **React** with Vite — no heavy dependencies
- **Pure SVG** — all rendering is SVG paths and shapes, no Three.js or WebGL
- **Parametric math** in plain JavaScript — rotation matrices, perspective projection, stereographic projection, wireframe generation

## Design

Visual style inspired by 3Blue1Brown, Seeing Theory (Brown University), and Distill.pub:

- Dark purple-navy background (#1a1726)
- Lora serif for teaching text (editorial, museum-caption feel)
- Syne display font with blue-purple-cyan gradient title
- Sky blue wireframes, amber/cyan chart accents

## Project Structure

```
src/
  constants.js          Design tokens (colors, fonts, layout, animation)
  mathUtils.js          Shared math (rotation, projection, parametric surfaces)
  App.jsx               Main shell (tabs, state, layout)
  components/
    CircleManifold.jsx
    SphereManifold.jsx
    CylinderManifold.jsx
    TorusManifold.jsx
    KleinBottleManifold.jsx
    shared/
      MappedDot.jsx     Glowing interactive dot
      ChartPanel.jsx    Chart container with grid
      TeachingText.jsx  Context-sensitive narration bar
```

## Audience

Business managers with no topology background. Self-paced, roughly 10-15 minutes to explore all five manifolds.

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Left/Right arrows | Navigate between manifolds |
| 1-5 | Jump to specific manifold |
| Escape | Clear the placed dot |
