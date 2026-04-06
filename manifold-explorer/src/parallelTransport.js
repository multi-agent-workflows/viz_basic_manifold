/**
 * Parallel transport animation utilities.
 *
 * Generates a closed rectangular loop in parameter space and computes
 * the transported vector angle at each point along the loop.
 */

const LOOP_POINTS = 120; // total points around the loop

/**
 * Generate a rectangular loop path in parameter space.
 * The loop goes: right along bottom → up right side → left along top → down left side.
 *
 * @param {number} u0 - left edge of rectangle
 * @param {number} v0 - bottom edge
 * @param {number} du - width in u
 * @param {number} dv - height in v
 * @returns {Array<{u, v, leg}>} - array of {u, v, leg} where leg is 0-3
 */
export function generateLoop(u0, v0, du, dv) {
  const pts = [];
  const perSide = LOOP_POINTS / 4;

  // Leg 0: bottom, left to right (u increases, v = v0)
  for (let i = 0; i < perSide; i++) {
    const t = i / perSide;
    pts.push({ u: u0 + du * t, v: v0, leg: 0 });
  }
  // Leg 1: right, bottom to top (u = u0+du, v increases)
  for (let i = 0; i < perSide; i++) {
    const t = i / perSide;
    pts.push({ u: u0 + du, v: v0 + dv * t, leg: 1 });
  }
  // Leg 2: top, right to left (u decreases, v = v0+dv)
  for (let i = 0; i < perSide; i++) {
    const t = i / perSide;
    pts.push({ u: u0 + du * (1 - t), v: v0 + dv, leg: 2 });
  }
  // Leg 3: left, top to bottom (u = u0, v decreases)
  for (let i = 0; i < perSide; i++) {
    const t = i / perSide;
    pts.push({ u: u0, v: v0 + dv * (1 - t), leg: 3 });
  }

  return pts;
}

/**
 * Compute the parallel-transported vector angle at each point of the loop
 * on the REGULAR torus (R, r).
 *
 * The holonomy of the Levi-Civita connection on a torus:
 * - Along a u-line (constant v): the tangent basis rotates, causing
 *   a transported vector to accumulate angle = -sin(v) * Δu / (R + r*cos(v)) * r
 *   Actually more precisely: the connection form ω = -r*sin(v)/(R+r*cos(v)) du
 *   So the angle change = ∫ ω = -r*sin(v)/(R+r*cos(v)) * Δu along a u-line
 * - Along a v-line (constant u): the connection form has no dv component
 *   for the standard embedding, so no rotation.
 *
 * We return the angle of the transported vector (starting at 0) at each loop point.
 *
 * @param {Array} loop - from generateLoop
 * @param {number} R - major radius
 * @param {number} r - minor radius
 * @returns {Array<number>} - transported angle at each point
 */
export function transportOnRegularTorus(loop, R = 1.0, r = 0.4) {
  const angles = [0];
  for (let i = 1; i < loop.length; i++) {
    const prev = loop[i - 1];
    const curr = loop[i];
    const du = curr.u - prev.u;
    // Connection form: ω = -r * sin(v) / (R + r * cos(v)) * du
    // Use midpoint v for better accuracy
    const vMid = (prev.v + curr.v) / 2;
    const omega = -r * Math.sin(vMid) / (R + r * Math.cos(vMid));
    angles.push(angles[i - 1] + omega * du);
  }
  return angles;
}

/**
 * On the flat torus (Clifford), parallel transport around ANY loop
 * returns the vector unchanged (zero holonomy, zero curvature).
 *
 * @param {Array} loop - from generateLoop
 * @returns {Array<number>} - all zeros
 */
export function transportOnFlatTorus(loop) {
  return loop.map(() => 0);
}

/**
 * Get the current animation index based on time.
 * @param {number} now - performance.now()
 * @param {number} period - loop period in ms
 * @param {number} totalPoints - length of loop
 * @returns {number} - index into loop array
 */
export function getTransportIndex(now, period, totalPoints) {
  const t = (now % period) / period;
  return Math.floor(t * totalPoints) % totalPoints;
}
