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
  { id: 'cylinder', name: 'Cylinder',    icon: '◇', subtitle: '2D — Flat in one direction' },
  { id: 'sphere',  name: 'Sphere',       icon: '◎', subtitle: '2D — Why flat maps lie' },
  { id: 'mobius',  name: 'M\u00F6bius Band', icon: '\u27C0', subtitle: '2D — The one-sided twist' },
  { id: 'torus',   name: 'Torus',        icon: '◯', subtitle: '2D — The video game screen' },
  { id: 'klein',   name: 'Klein Bottle', icon: '∞', subtitle: '2D — The twist' },
];
