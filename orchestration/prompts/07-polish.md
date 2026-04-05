You are doing the final polish pass on the "Manifold Chart Explorer" React app.

## Project Context
The project is at `/Users/carloscotrini/Documents/git_bmai_fs26_cx/viz_basic_manifold/manifold-explorer`. Read the `CLAUDE.md` file there for project conventions.

## Your Task
Review all existing code, fix any bugs, and add polish: animations, accessibility, responsive design, and visual refinements. Do NOT rewrite components from scratch — make targeted edits.

## Step 1: Verify the app builds and runs
```bash
cd /Users/carloscotrini/Documents/git_bmai_fs26_cx/viz_basic_manifold/manifold-explorer
npm run build 2>&1
```
Fix any build errors first. Read error messages carefully and fix the root cause.

## Step 2: Fix import/integration issues
Read `src/App.jsx` and verify all manifold component imports work. Check that:
- All 5 manifold components exist and export default functions
- All shared component imports are correct (paths, named exports)
- Constants and mathUtils are imported correctly everywhere

If any component is missing or has import errors, fix them.

## Step 3: Visual Polish

### Background atmosphere
In App.jsx, ensure the main content area has:
- Radial gradient background: `radial-gradient(ellipse at center, #0f172a 0%, #0a0f1a 100%)`
- Faint grid pattern overlay (SVG pattern, 40px spacing, #334155 at 5% opacity)

### Dot animations
Ensure the dotPulse keyframe animation is defined in index.html or a global style:
```css
@keyframes dotPulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.8; }
}
```

Ensure MappedDot placement has a scale-up animation (200ms ease-out-back).

### Tab transitions
Verify the cross-fade between manifolds works (400ms ease-out).

### Teaching text transitions
Verify TeachingText fades in/out when text changes (300ms).

## Step 4: Accessibility

Add to all manifold components where missing:
- `role="button"` and `aria-label` on clickable SVG regions
- `tabIndex={0}` on interactive elements
- `onKeyDown` handlers for Enter/Space on clickable regions

In App.jsx:
- Tab bar: `role="tablist"`, each tab has `role="tab"`, `aria-selected`
- Content area: `role="tabpanel"`
- Teaching text: verify `aria-live="polite"`

## Step 5: Keyboard Navigation
Verify in App.jsx:
- Left/Right arrows switch manifolds
- Number keys 1-5 jump to specific manifold
- Escape resets dot to null

## Step 6: Responsive Layout
Check that:
- The app uses the full viewport (100vw x 100vh)
- Content area dimensions are measured and passed to manifold components
- SVG viewBox values adapt to the measured dimensions
- At smaller widths (<768px), consider stacking the panels vertically (optional, nice-to-have)

## Step 7: Final Build Test
```bash
cd /Users/carloscotrini/Documents/git_bmai_fs26_cx/viz_basic_manifold/manifold-explorer
npm run build 2>&1
```
The build must succeed with zero errors. Warnings are acceptable but fix any that indicate real issues.

## Important Guidelines
- Do NOT delete or rewrite working components — make surgical edits
- Read each file before editing it
- Fix actual bugs, don't add unnecessary complexity
- Keep all design tokens from constants.js — never hardcode colors/fonts
- If a manifold component is fundamentally broken, fix the core issue rather than working around it
