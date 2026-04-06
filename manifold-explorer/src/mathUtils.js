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

export function parametricMobiusBand(u, v, R = 1.0, w = 0.4) {
  // u in [0, 2pi) goes around the band, v in [-1, 1] across the width
  // R = major radius, w = half-width
  const halfAngle = u / 2;
  return {
    x: (R + w * v * Math.cos(halfAngle)) * Math.cos(u),
    y: (R + w * v * Math.cos(halfAngle)) * Math.sin(u),
    z: w * v * Math.sin(halfAngle),
  };
}

export function parametricKleinBottle(u, v) {
  // Classic Klein bottle immersion (the recognizable "bottle" shape)
  const cu = Math.cos(u), su = Math.sin(u);
  const cv = Math.cos(v), sv = Math.sin(v);

  if (u < Math.PI) {
    const r = 4 * (1 - cu / 2);
    return {
      x: 6 * cu * (1 + su) + r * cu * cv,
      y: 16 * su + r * su * cv,
      z: r * sv,
    };
  } else {
    const r = 4 * (1 - cu / 2);
    return {
      x: 6 * cu * (1 + su) - r * cv,
      y: 16 * su,
      z: r * sv,
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
