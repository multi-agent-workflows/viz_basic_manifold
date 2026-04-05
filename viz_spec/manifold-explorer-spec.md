# Manifold Chart Explorer — Complete Specification

## Overview

An interactive single-page React application that teaches the relationship between manifolds and their charts (flat maps). The user navigates between five manifolds — Circle, Sphere, Torus, Cylinder, Klein Bottle — arranged from simplest to most complex. Each manifold is presented as a split-screen: the 3D (or 2D) shape on the left, its flat chart(s) on the right. Clicking or hovering on either side maps the point to the other side in real time, making the abstract concept of "charting a curved surface" visceral and immediate.

**Audience:** Business managers with no topology background (the "Sarah test" from the converged concept).  
**Duration:** Self-paced, ~10–15 minutes to explore all five.  
**Technology:** Single-file React `.jsx` artifact. SVG-based rendering (no Three.js/R3F — keeps it lightweight and reliable). All parametric math computed in JavaScript.  
**Aesthetic:** Museum gallery — deep navy backgrounds, precise typography, refined minimalism. The feeling of a beautifully curated exhibit, not a textbook diagram.

---

## The Five Manifolds

### 1. Circle (S¹) — "The Simplest Loop"
**Why it's here:** The most minimal manifold. Introduces the core mechanic: one chart almost works, but you need two.

**3D side (left panel):**  
A circle rendered as a smooth SVG path, radius ~160px, centered vertically in the left panel. Drawn in sky blue (#38bdf8), stroke width 3px. Subtle glow effect (filter: drop-shadow with 4px blur in primary color at 30% opacity).

**Charts (right panel):**  
Two overlapping arc segments laid out as horizontal line segments (the "unrolled" arcs).
- **Chart A (amber, #fbbf24):** Covers roughly the right ¾ of the circle (from ~210° to ~150° going clockwise, i.e., all but a small gap on the left). Displayed as a horizontal line segment, labeled "Chart A". Parameter range displayed: θ ∈ (–¾π, ¾π).
- **Chart B (cyan, #22d3ee):** Covers roughly the left ¾ of the circle (from ~30° to ~330°, i.e., all but a small gap on the right). Displayed as a second horizontal line segment below Chart A, labeled "Chart B".
- **Overlap zones** where both charts cover the same arc are highlighted in light green (#86efac) on both line segments simultaneously.

**Parametric mapping:**
- Circle point at angle θ → position on chart A (if covered): linear mapping of θ to x-position on the line segment.
- Same for chart B with its own angular range.
- Points in the overlap zone light up on BOTH charts.

**Interaction:**
- Click anywhere on the circle → a glowing dot (amber, r=6, with pulsing glow animation) appears at that point on the circle AND at the corresponding position(s) on the chart line(s) on the right.
- Click on a chart line → dot appears at the corresponding point on the circle.
- If the point is in the overlap zone, dots appear on both charts with a subtle connecting line between them (dashed, light green, 1px).
- If the point is in a region covered by only one chart, only that chart's dot lights up; the other chart shows a small "×" icon in muted gray at its edge to indicate "not covered here."

**Teaching text (bottom of panel):**
- Default: "A circle is the simplest manifold. Can one flat map cover it all?"
- After clicking in Chart A only zone: "This point is only on Chart A. One map can't see the whole circle."
- After clicking in overlap: "This point appears on both charts — they agree where they overlap."

**Mathematical note:**
The two charts are open intervals on ℝ. Chart A = circle minus the point at angle π (the leftmost point). Chart B = circle minus the point at angle 0 (the rightmost point). Together they cover every point; the overlap consists of the top and bottom arcs.

---

### 2. Sphere (S²) — "Why Flat Maps Lie"
**Why it's here:** The Earth metaphor everyone knows. Two stereographic projections. The "you can't flatten a globe without distortion" insight.

**3D side (left panel):**  
A wireframe sphere rendered via parametric SVG. 12 longitude lines, 11 latitude lines, projected to 2D with perspective projection (camera distance d=4). Sphere radius maps to ~150px on screen. Sky blue (#38bdf8) wireframe at 35% opacity, with a very faint filled circle behind it (primary at 6% opacity) for depth. Slow auto-rotation around Y-axis at 0.3 rad/s, stops when user interacts (drag to rotate manually via pointer events tracking delta-x → rotY, delta-y → rotX).

**Charts (right panel):**  
Two circular disc charts stacked vertically, representing stereographic projections.
- **Chart N (amber):** "View from North Pole" — projects the sphere onto a flat disc. The south pole maps to the center, the equator maps to a circle at ~60% of the disc radius, and points approaching the north pole fly off to infinity (the disc edge represents "getting impossibly far"). Label: "Chart N — everything except the North Pole."
- **Chart S (cyan):** "View from South Pole" — same but inverted. North pole maps to center. Label: "Chart S — everything except the South Pole."
- Overlap region (the "middle band" of the sphere, roughly the equatorial region) highlighted in light green on both discs.

**Parametric mapping (stereographic projection):**
- For Chart N (projecting from north pole [0,1,0]):
  - Given a point P = (x, y, z) on the unit sphere (where y is "up"):
  - Chart N coordinates: u = x / (1 - y), v = z / (1 - y)
  - Clamp to disc radius for display (points near north pole → large u,v → clamp at disc edge with distortion indicator)
- For Chart S (projecting from south pole [0,-1,0]):
  - u = x / (1 + y), v = z / (1 + y)

**Visual distortion indicator:**
On each disc chart, draw a faint grid (8×8, gray at 15% opacity). Near the center the grid cells are roughly square. Near the edges they stretch and distort. This communicates "the map lies more at the edges" without any text.

**Interaction:**
- Click on sphere wireframe → hit-test against the sphere surface (ray-sphere intersection using the inverse projection). Place a glowing dot on the sphere at the clicked point. Simultaneously show the projected dot on Chart N and/or Chart S (whichever covers it; if both, show on both).
- Click on a chart disc → inverse stereographic projection to find the sphere point, show dot on sphere.
- Drag on sphere → rotate the wireframe (pointer delta mapped to rotation angles).

**Teaching text:**
- Default: "Two flat maps, each missing one point. Together, they cover everything."
- After clicking near a pole: "This point is near the North Pole — Chart N can't see it, but Chart S can."
- After clicking equator: "The equator is on both maps — where they agree."

---

### 3. Cylinder — "Flat in One Direction"
**Why it's here:** A stepping stone. One direction is already flat (height), one wraps (circumference). Shows that some manifolds are "partially flat" — makes the torus (which wraps in both directions) feel like a natural next step.

**3D side (left panel):**  
A wireframe cylinder, height ~2 units, radius 1 unit. 12 vertical lines (longitude), 8 horizontal circles (latitude). Same perspective projection as sphere. Sky blue wireframe.

**Charts (right panel):**  
A single rectangular chart, because one chart almost covers the cylinder (all except one vertical line — same idea as the circle, but extended into 2D).
- **Chart A (amber):** A rectangle. Horizontal axis = angle θ (wrapping direction), vertical axis = height h. The rectangle has a small gap on the right edge — a thin vertical strip in muted gray labeled "gap" — representing the one vertical line that this chart can't cover.
- **Chart B (cyan):** A second rectangle, shifted so its gap is on the LEFT edge. Covers the line that Chart A misses.
- Overlap zones (most of the rectangle, minus the two thin edge strips) highlighted in light green.

**Parametric mapping:**
- Cylinder point at (θ, h) where θ ∈ [0, 2π), h ∈ [-1, 1].
- Chart A: maps θ ∈ (-π, π) to horizontal position, h to vertical position. Gap at θ = ±π (the "back seam").
- Chart B: maps θ ∈ (0, 2π) to horizontal position. Gap at θ = 0 (the "front seam").

**Interaction:**
Same as previous — click on cylinder or chart, dot appears on both sides. The cylinder can be rotated to show the "back seam" that Chart A misses.

**Teaching text:**
- Default: "The cylinder wraps in one direction and is flat in the other. Its charts are almost-complete rectangles."
- After clicking near the seam: "Right at the seam, you need the second chart."

---

### 4. Torus (T²) — "The Video Game Screen"
**Why it's here:** Both directions wrap. The flat chart IS the game screen — exit right, enter left; exit top, enter bottom. The most satisfying "aha" in the sequence.

**3D side (left panel):**  
A wireframe torus, R=1.0 (major), r=0.4 (minor). ~16 longitude lines, ~12 latitude lines. Perspective projected. Auto-rotates slowly.

**Charts (right panel):**  
A single flat rectangle with WRAPPING ARROWS on all four edges.
- Left/right edges: amber arrows pointing the same direction (→ on right edge, → on left edge), indicating "exit right = enter left."
- Top/bottom edges: cyan arrows pointing the same direction (↓ on bottom, ↓ on top), indicating "exit bottom = enter top."
- The rectangle is the primary chart. It covers the entire torus EXCEPT for two crossing circles (one longitudinal, one latitudinal) — but visually we don't show the gap; instead we show the wrapping behavior.

**For mathematical honesty, show a second smaller chart:**
Below the main rectangle, a smaller "patch" chart (amber outline, labeled "Chart B") representing a neighborhood around the crossing circles. When the user clicks near the seam on the torus, this second chart activates.

**Interaction — the dot-wrapping mechanic:**
- Click anywhere on the torus → dot appears on torus and on the rectangle at the corresponding (θ, φ) position.
- Click on the rectangle → dot appears on the torus.
- **BONUS:** After clicking, the user can drag the dot on the rectangle. When it exits the right edge, it re-enters from the left. When it exits the top, it re-enters from the bottom. The corresponding dot on the 3D torus traces a continuous path. This is the Pac-Man moment.

**Teaching text:**
- Default: "A torus is a rectangle with opposite edges glued. The flat rectangle IS its chart."
- When dot wraps: "Exit right, enter left — just like a video game screen. The flat map and the torus are two views of the same thing."

---

### 5. Klein Bottle — "The Twist"
**Why it's here:** Looks like a torus construction but with reversed arrows on one pair of edges. The mirror-flip when wrapping is the visceral experience of non-orientability. The culmination of the sequence.

**3D side (left panel):**  
A Klein bottle wireframe. Parametric immersion in 3D (the standard "figure-8" or "bottle" immersion). The self-intersection region is highlighted with a subtle pink (#f472b6) glow and a dashed outline, with a small annotation: "Self-intersection is a 3D artifact — in 4D there's no collision."

**Klein bottle parametric equations (figure-8 immersion):**
```
For u ∈ [0, 2π), v ∈ [0, 2π):
  x = (a + b·cos(v))·cos(u)          for u ∈ [0, π)
  x = (a + b·cos(v + π))·cos(u)      for u ∈ [π, 2π)  
  y = (a + b·cos(v))·sin(u)          for u ∈ [0, π)
  y = (a + b·cos(v + π))·sin(u)      for u ∈ [π, 2π)
  z = b·sin(v)                        for u ∈ [0, π)
  z = b·sin(v + π)                    for u ∈ [π, 2π)
where a = 2.0 (major radius), b = 0.6 (minor radius)
```

Alternative simpler parametrization (the "bottle" shape — more recognizable):
```
For u ∈ [0, 2π), v ∈ [0, 2π):
If 0 ≤ u < π:
  x = 6·cos(u)·(1 + sin(u)) + 4·(1 - cos(u)/2)·cos(u)·cos(v)
  y = 16·sin(u) + 4·(1 - cos(u)/2)·sin(u)·cos(v)
  z = 4·(1 - cos(u)/2)·sin(v)
If π ≤ u < 2π:
  x = 6·cos(u)·(1 + sin(u)) - 4·(1 - cos(u)/2)·cos(v)
  y = 16·sin(u)
  z = 4·(1 - cos(u)/2)·sin(v)
```
Use whichever renders more cleanly in SVG wireframe at this scale. The figure-8 immersion is usually easier to wireframe.

**Charts (right panel):**  
A flat rectangle — same layout as the torus — but with a CRITICAL DIFFERENCE in the arrows:
- Left/right edges: amber arrows pointing the SAME direction (→ → ) — same as torus.
- Top/bottom edges: cyan arrows pointing OPPOSITE directions (↑ on top, ↓ on bottom) — THIS is the twist.

A small annotation near the reversed arrows: "The twist — arrows reversed."

**Interaction — the mirror-flip mechanic:**
- Same click-mapping as torus.
- **THE KEY MOMENT:** When the user drags a dot off the top edge, it re-enters from the bottom but HORIZONTALLY MIRRORED. If the dot exits at (x=75%, top), it re-enters at (x=25%, bottom). The 3D dot traces the corresponding path on the Klein bottle, passing through the orientation-reversing loop.

**Teaching text:**
- Default: "Same recipe as the torus — but one pair of edges is reversed. Watch what happens at the seam."
- When dot mirror-flips: "The dot came back mirrored — left and right switched. There's no consistent 'inside' or 'outside.' This is a non-orientable surface."

---

## Application Architecture

### Overall Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  HEADER: Title + manifold selector tabs                        │
│  ┌────────────────────────────┬────────────────────────────────┐│
│  │                            │                                ││
│  │    3D MANIFOLD VIEW        │     CHART(S) VIEW              ││
│  │    (left 55%)              │     (right 45%)                ││
│  │                            │                                ││
│  │    - Wireframe shape       │     - Flat map(s)              ││
│  │    - Click to place dot    │     - Click to place dot       ││
│  │    - Drag to rotate        │     - Drag dot to move         ││
│  │                            │                                ││
│  ├────────────────────────────┴────────────────────────────────┤│
│  │  TEACHING TEXT BAR (bottom, 64px)                           ││
│  │  Context-sensitive narration                                ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

### Manifold Selector

A horizontal tab bar at the top. Five tabs, each with the manifold name and a tiny icon (a miniature outline of the shape).

```
  [ ○ Circle ]  [ ◎ Sphere ]  [ ◇ Cylinder ]  [ ◯ Torus ]  [ ∞ Klein Bottle ]
```

- Active tab: sky blue text + underline accent bar (3px, #38bdf8).
- Inactive tabs: muted text (#94a3b8), hover → text brightens to #f1f5f9.
- Transition between manifolds: cross-fade (400ms ease-out). The current scene dims, the new scene fades in. The dot position resets.

Below the tabs, a single-line subtitle changes per manifold:
- Circle: "1D — The simplest loop"
- Sphere: "2D — Why flat maps lie"
- Cylinder: "2D — Flat in one direction"
- Torus: "2D — The video game screen"
- Klein Bottle: "2D — The twist"

### Split Panel Layout

- Left panel: 55% width, full available height.
- Right panel: 45% width, full available height.
- Divider: 1px line in #334155.
- Both panels have 24px internal padding.
- Panel headers: small labels like "Manifold" and "Charts" in muted text (12px, JetBrains Mono, uppercase, letter-spacing 2px) positioned at top-left of each panel.

### The Mapped Dot

The core interactive element. When placed, it appears on both sides simultaneously.

**On the manifold side:**
- Circle: r=7, amber fill, with a soft glow (drop-shadow 0 0 8px amber at 60%).
- Sphere/Torus/Cylinder/Klein: r=6, amber fill, rendered at the correct projected position on the wireframe. A subtle "pin" line connects the dot to the surface (2px, amber, 40% opacity).

**On the chart side:**
- r=6, color matches the chart it sits on (amber for Chart A, cyan for Chart B).
- If in overlap zone: TWO dots, one amber, one cyan, each on its respective chart, connected by a dashed light-green line.
- Coordinate readout next to the dot: small JetBrains Mono text (11px, muted) showing the (u, v) or θ value. Example: "θ = 2.4 rad" or "(u, v) = (1.2, 0.8)".

### Drag-to-Explore (Torus & Klein Bottle)

On the torus and Klein bottle, the dot on the chart side is draggable:
- Cursor changes to `grab` on hover, `grabbing` on drag.
- Dot follows pointer within the chart rectangle.
- When exiting an edge, wrapping behavior is applied:
  - Torus: re-enter from opposite edge, same position on the perpendicular axis.
  - Klein bottle: left/right edges → same wrapping; top/bottom edges → re-enter horizontally mirrored.
- The 3D dot tracks in real time.
- Leave a fading trail (last 30 positions, opacity decreasing from 60% to 0%) to show the path on both sides.

### Drag-to-Rotate (3D shapes)

For Sphere, Cylinder, Torus, Klein Bottle:
- Pointer down on left panel → start tracking.
- Pointer move → delta-x maps to rotY (0.005 rad/px), delta-y maps to rotX (0.005 rad/px).
- Pointer up → stop tracking, resume auto-rotation after 3 seconds of no interaction.
- Auto-rotation: 0.3 rad/s around Y-axis.

---

## Visual Design

### Color Palette (from converged concept)
| Role               | Hex       | Usage                                        |
|--------------------|-----------|----------------------------------------------|
| Background         | #0f172a   | Page and panel backgrounds                   |
| Surface            | #1e293b   | Cards, insets, chart backgrounds              |
| Primary (sky blue) | #38bdf8   | Wireframe shapes, active tab                  |
| Amber              | #fbbf24   | Chart A, interactive dot, hints               |
| Green              | #34d399   | "Correct" / overlap confirmation              |
| Pink               | #f472b6   | Failures, self-intersection highlight         |
| Cyan               | #22d3ee   | Chart B, second chart elements                |
| Light green        | #86efac   | Overlap zones                                 |
| Text               | #f1f5f9   | Primary text                                  |
| Muted              | #94a3b8   | Secondary text, labels                        |
| Grid               | #334155   | Dividers, wireframe grid, chart grid          |

### Typography
- **Title ("Manifold Chart Explorer"):** Syne, 800 weight, 28px. Gradient text: linear-gradient(135deg, #38bdf8, #22d3ee).
- **Tab labels:** DM Sans, 500 weight, 14px.
- **Manifold subtitle:** DM Sans, 400 weight, 13px, muted color.
- **Panel headers ("Manifold" / "Charts"):** JetBrains Mono, 400 weight, 11px, uppercase, letter-spacing 2px, muted color.
- **Teaching text:** DM Sans, 400 weight, 15px, text color. Italics for emphasized phrases.
- **Coordinate readouts:** JetBrains Mono, 400 weight, 11px, muted color.
- **Chart labels ("Chart A", "Chart B"):** DM Sans, 700 weight, 12px, matching chart color.
- **Annotation text:** DM Sans, 400 weight, 12px, muted or pink for warnings.

Load via: `@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:ital,wght@0,400;0,500;0,700;1,400&family=JetBrains+Mono:wght@400;500&display=swap');`

### Wireframe Rendering Style
- Longitude lines: stroke #38bdf8, width 1.2px, opacity 35%.
- Latitude lines: stroke #38bdf8, width 0.8px, opacity 25%.
- Subtle filled background shape (circle for sphere, ellipse for torus outline) at 6% primary opacity for depth.
- No hard outlines — the wireframe IS the shape.

### Chart Rendering Style
- Chart background: #1e293b rectangle with 1px #334155 border, border-radius 8px.
- Internal coordinate grid: 8×8 lines at 12% opacity, #334155.
- Chart fill: very subtle gradient of chart color at 4% opacity.
- Edge arrows (torus, Klein bottle): SVG arrow paths in chart color, 2px stroke, placed at edge midpoints.

### Transitions and Animations
- Manifold switch: 400ms cross-fade (opacity 1→0 outgoing, 0→1 incoming, ease-out).
- Dot placement: 200ms scale-up from 0 to full size (ease-out-back for slight bounce).
- Dot glow: continuous pulse animation, 2s cycle, opacity oscillates between 40% and 80%.
- Trail fade: each trail point lives for 1.5s, opacity decreasing linearly.
- Auto-rotation: smooth continuous via requestAnimationFrame, 0.3 rad/s.
- Teaching text change: 300ms fade transition.

### Atmospheric Details
- Subtle radial gradient on the background: #0f172a center → #0a0f1a edges. Creates depth.
- A very faint grid pattern (SVG pattern, 40px spacing, #334155 at 5% opacity) on the left panel background — gives a "mathematical paper" feel without overwhelming.
- The title has a subtle text-shadow: 0 0 30px rgba(56, 189, 248, 0.15).

---

## State Management

```
State shape:
{
  activeManifold: 0–4 (index into manifolds array),
  dot: { u: number, v: number } | null,    // parametric position of placed dot
  rotation: { x: number, y: number },       // camera rotation for 3D view
  isDragging: boolean,                       // whether user is dragging the 3D view
  isDraggingDot: boolean,                    // whether user is dragging the dot on chart
  trail: Array<{u, v, age}>,                // trail points for drag-to-explore
  autoRotate: boolean,                       // pauses on interaction, resumes after 3s
  teachingText: string,                      // context-sensitive bottom text
}
```

All state managed via React useState hooks. Expensive parametric computations (wireframe point arrays, chart projections) memoized with useMemo, keyed on rotation angles. Animation loop via requestAnimationFrame in a useEffect.

---

## SVG Structure Per Manifold

Each manifold is a React component receiving `{ dot, onDotPlace, rotation }` as props. Each renders two SVG groups: one for the manifold view, one for the charts view. The parent component positions them in the split layout.

### Rendering Pipeline (for 3D shapes)

1. Generate parametric points: loop over (u, v) grid → 3D coordinates.
2. Apply rotation matrix (rotX, rotY) to all points.
3. Apply perspective projection (d=4) → 2D screen coordinates.
4. Sort wireframe lines by average depth for correct layering (back-to-front).
5. Render as SVG `<path>` elements with opacity modulated by depth (farther = more transparent).

### Hit Testing (clicking on 3D shapes)

For the sphere: ray-sphere intersection.
- Convert click (screenX, screenY) to normalized coordinates.
- Inverse-project through the perspective transform.
- Solve ray-sphere intersection for unit sphere.
- Extract (u, v) parametric coords from the intersection point.

For torus/cylinder/Klein: approximate hit testing.
- Render invisible "hit zones" — a grid of small transparent SVG circles (r=12) at projected wireframe intersection points.
- On click, find nearest hit zone → use that (u, v).
- This avoids complex ray-torus intersection math.

---

## Implementation Notes for Claude Code

### File Structure
Single file: `manifold-explorer.jsx`, output to `/mnt/user-data/outputs/manifold-explorer.jsx`.

### Key Libraries
- React (useState, useEffect, useMemo, useCallback, useRef) — all available in the artifact environment.
- No external 3D libraries. Pure SVG + math.
- No external animation libraries. Use requestAnimationFrame.

### Performance Considerations
- Wireframe point count per shape: ~800–2000 projected points. Well within SVG budget.
- Memoize wireframe geometry — recompute only when rotation changes.
- Trail rendering: cap at 30 points, remove oldest on each frame.
- Chart grid: static SVG, no recomputation needed.

### Code Organization Suggestion
```
// 1. Constants (colors, sizes, parametric params)
// 2. Math utilities (project3D, stereographic, parametric functions)
// 3. Individual manifold components:
//    - CircleManifold
//    - SphereManifold  
//    - CylinderManifold
//    - TorusManifold
//    - KleinBottleManifold
// 4. Shared components (MappedDot, ChartPanel, WireframeRenderer)
// 5. Main ManifoldExplorer component (state, layout, tabs)
```

### Edge Cases
- Click outside shape → no dot placed, no error.
- Dot at chart boundary → show wrapping behavior (torus/Klein) or "edge of chart" indicator (circle/sphere/cylinder).
- Klein bottle self-intersection region → dot may appear to be at two 3D positions; show both with a small annotation.
- Window resize → SVG viewBox handles scaling automatically.

### Accessibility
- All interactive regions have `role="button"` and `aria-label`.
- Color-coded results (green/pink) always paired with icon (✓/✗).
- Tab navigation between manifolds works with keyboard (arrow keys).
- Teaching text is live-region (`aria-live="polite"`) so screen readers announce changes.

---

## Demo Script (2 minutes)

1. **Open on Circle.** "This is a circle — the simplest manifold. On the right, two flat line segments are its 'charts' — flat maps of the curve." Click a point on the circle. "See how the dot appears on the chart? That's the mapping."

2. **Switch to Sphere.** "Now a sphere — like Earth. Two disc-shaped charts, each missing one pole." Click near the equator. "This point is on both charts — the overlap zone." Click near the north pole. "But this point is only on Chart S — Chart N can't see it."

3. **Switch to Torus.** "A torus is a rectangle with edges glued." Drag the dot on the chart rectangle. Watch it exit right and re-enter left. "Exit right, enter left — like Pac-Man. The flat rectangle and the doughnut are two views of the same shape."

4. **Switch to Klein Bottle.** Drag the dot off the top edge. It re-enters from the bottom, mirrored. "See the flip? That's non-orientability. There's no consistent left and right on this surface."

5. **Return to Circle.** "From the simplest loop to surfaces that twist in 4D — each one has flat maps. That's what a manifold is: a shape you can chart."

---

## Summary of Deliverables

| Deliverable | Format | Location |
|---|---|---|
| This specification | Markdown | `/mnt/user-data/outputs/manifold-explorer-spec.md` |
| Working prototype | React .jsx | `/mnt/user-data/outputs/manifold-explorer.jsx` |
