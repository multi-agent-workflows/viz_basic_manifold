/**
 * Rainbow path utilities for interpolating between user-placed points.
 */

const DOTS_PER_SEGMENT = 30;

/**
 * Generate a rainbow HSL color for point index i out of total points.
 * Hue goes from 0 (red) through 300 (magenta), avoiding wrap-back to red.
 */
export function rainbowColor(i, total) {
  const hue = total <= 1 ? 0 : (i / (total - 1)) * 300;
  return `hsl(${hue}, 85%, 60%)`;
}

/**
 * Interpolate HSL hue between two point indices.
 * t is 0..1 between pointIndex and pointIndex+1.
 */
export function rainbowColorInterp(pointIndex, t, totalPoints) {
  const hue0 = totalPoints <= 1 ? 0 : (pointIndex / (totalPoints - 1)) * 300;
  const hue1 = totalPoints <= 1 ? 0 : ((pointIndex + 1) / (totalPoints - 1)) * 300;
  const hue = hue0 + (hue1 - hue0) * t;
  return `hsl(${hue}, 85%, 60%)`;
}

/**
 * Compute the shortest-path delta for a periodic coordinate.
 * If the direct distance |b - a| > period/2, go the other way around.
 * Returns the delta to add to a to reach b via the shortest path.
 */
function shortestDelta(a, b, period) {
  if (!period) return b - a; // non-periodic: plain linear
  let delta = b - a;
  // Normalize delta to [-period/2, period/2]
  while (delta > period / 2) delta -= period;
  while (delta < -period / 2) delta += period;
  return delta;
}

/**
 * Generate interpolated dots between consecutive path points.
 * Returns array of { u, v, color } for each tiny dot.
 *
 * uPeriod / vPeriod: if the coordinate is periodic (e.g. 2*PI for angles),
 * interpolation takes the shortest path around the wrap.
 * Pass null/undefined for non-periodic coordinates.
 */
export function interpolatePath(path, uPeriod, vPeriod) {
  if (path.length < 2) return [];

  const dots = [];
  for (let i = 0; i < path.length - 1; i++) {
    const p0 = path[i];
    const p1 = path[i + 1];
    const du = shortestDelta(p0.u, p1.u, uPeriod);
    const dv = shortestDelta(p0.v, p1.v, vPeriod);
    for (let j = 0; j <= DOTS_PER_SEGMENT; j++) {
      const t = j / DOTS_PER_SEGMENT;
      let u = p0.u + du * t;
      let v = p0.v + dv * t;
      // Normalize back into [0, period) if periodic
      if (uPeriod) {
        while (u < 0) u += uPeriod;
        while (u >= uPeriod) u -= uPeriod;
      }
      if (vPeriod) {
        while (v < 0) v += vPeriod;
        while (v >= vPeriod) v -= vPeriod;
      }
      const color = rainbowColorInterp(i, t, path.length);
      dots.push({ u, v, color });
    }
  }
  return dots;
}
