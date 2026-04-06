import React, { useMemo, useRef, useEffect, useCallback } from 'react';
import { COLORS, FONTS, LAYOUT, WIREFRAME, ANIMATION } from '../constants';
import {
  rotate3D,
  project3D,
  stereographicS,
  inverseStereographicS,
  parametricSphere,
  generateWireframe,
  wireframeToPath,
  clamp,
} from '../mathUtils';
import MappedDot from './shared/MappedDot';
import ChartPanel from './shared/ChartPanel';
import { interpolatePath, rainbowColor } from '../rainbowPath';

const U_LINES = 12;
const V_LINES = 11;
const PI = Math.PI;
const TWO_PI = 2 * PI;

// Mercator projection: (lon, lat) -> (x, y)
// lon in [0, 2pi), lat in (-pi/2, pi/2)
// x = lon, y = ln(tan(pi/4 + lat/2))
// Undefined at poles (lat = +/- pi/2)
const MERCATOR_LAT_LIMIT = 1.4; // ~80 degrees, avoids infinity near poles

function mercatorProject(lon, lat) {
  if (Math.abs(lat) > MERCATOR_LAT_LIMIT) return null;
  const x = lon;
  const y = Math.log(Math.tan(PI / 4 + lat / 2));
  return { x, y };
}

function mercatorInverse(mx, my) {
  const lon = mx;
  const lat = 2 * Math.atan(Math.exp(my)) - PI / 2;
  return { lon, lat };
}

// Get the y range for the Mercator chart at our latitude limit
const MERCATOR_Y_MAX = Math.log(Math.tan(PI / 4 + MERCATOR_LAT_LIMIT / 2));

export default function SphereManifold({
  dot, onDotPlace, rotation, onRotationChange, width, height, onTeachingText, path = [],
}) {
  const dragRef = useRef({ dragging: false, startX: 0, startY: 0, startRotX: 0, startRotY: 0, moved: false });
  const animRef = useRef({ frameId: null, lastTime: null, lastInteraction: 0 });
  const rotationRef = useRef(rotation);
  rotationRef.current = rotation;

  const leftW = width * LAYOUT.leftPanelWidth;
  const rightW = width * LAYOUT.rightPanelWidth;
  const rightX = leftW;
  const sphereCx = leftW / 2;
  const sphereCy = height / 2;
  const scale = Math.min(leftW, height) * 0.32;

  const wireframe = useMemo(
    () => generateWireframe(parametricSphere, U_LINES, V_LINES, 0, TWO_PI, -PI / 2, PI / 2),
    []
  );

  const sortedLines = useMemo(() => {
    const d = WIREFRAME.perspectiveDistance;
    const allLines = [];
    wireframe.uLines.forEach((line) => {
      let depthSum = 0;
      line.forEach(([x, y, z]) => { const [, , rz] = rotate3D(x, y, z, rotation.x, rotation.y); depthSum += rz; });
      allLines.push({ path: wireframeToPath(line, rotation.x, rotation.y, d, scale, sphereCx, sphereCy), avgDepth: depthSum / line.length, type: 'longitude' });
    });
    wireframe.vLines.forEach((line) => {
      let depthSum = 0;
      line.forEach(([x, y, z]) => { const [, , rz] = rotate3D(x, y, z, rotation.x, rotation.y); depthSum += rz; });
      allLines.push({ path: wireframeToPath(line, rotation.x, rotation.y, d, scale, sphereCx, sphereCy), avgDepth: depthSum / line.length, type: 'latitude' });
    });
    allLines.sort((a, b) => b.avgDepth - a.avgDepth);
    const depths = allLines.map(l => l.avgDepth);
    const minD = Math.min(...depths), maxD = Math.max(...depths), range = maxD - minD || 1;
    allLines.forEach(l => { l.normalizedDepth = (l.avgDepth - minD) / range; });
    return allLines;
  }, [rotation.x, rotation.y, wireframe, scale, sphereCx, sphereCy]);

  const spherePoint = useMemo(() => { if (!dot) return null; return parametricSphere(dot.u, dot.v); }, [dot]);

  const projectedDot = useMemo(() => {
    if (!spherePoint) return null;
    const [rx, ry, rz] = rotate3D(spherePoint.x, spherePoint.y, spherePoint.z, rotation.x, rotation.y);
    const p = project3D(rx, ry, rz, WIREFRAME.perspectiveDistance);
    return { x: sphereCx + p.x * scale, y: sphereCy - p.y * scale, depth: p.depth };
  }, [spherePoint, rotation.x, rotation.y, scale, sphereCx, sphereCy]);

  // Stereographic chart: project FROM south pole -> north pole at center
  const stereoProj = useMemo(() => {
    if (!spherePoint) return null;
    return stereographicS(spherePoint.x, spherePoint.y, spherePoint.z);
  }, [spherePoint]);

  // Mercator chart
  const mercatorProj = useMemo(() => {
    if (!dot) return null;
    return mercatorProject(dot.u, dot.v);
  }, [dot]);

  // Rainbow path
  const pathDots = useMemo(() => interpolatePath(path, TWO_PI, null), [path]);

  useEffect(() => {
    if (!onTeachingText) return;
    if (!dot) onTeachingText('Two charts of the sphere: stereographic (north pole at center) and Mercator (can\u2019t show the poles).');
    else if (dot.v > 1.2) onTeachingText("Near the north pole \u2014 the center of the stereographic chart. Mercator can\u2019t reach here.");
    else if (dot.v < -1.2) onTeachingText("Near the south pole \u2014 the stereographic chart can\u2019t see this point. Mercator can\u2019t either.");
    else onTeachingText("Both charts can see this point. Notice how distances distort differently in each projection.");
  }, [dot, onTeachingText]);

  // Auto-rotation
  useEffect(() => {
    const anim = animRef.current;
    const tick = (now) => {
      if (anim.lastTime === null) { anim.lastTime = now; anim.frameId = requestAnimationFrame(tick); return; }
      const dt = (now - anim.lastTime) / 1000; anim.lastTime = now;
      if (now - anim.lastInteraction < ANIMATION.autoRotateResumeDelay) { anim.frameId = requestAnimationFrame(tick); return; }
      const cur = rotationRef.current;
      onRotationChange({ x: cur.x, y: cur.y + ANIMATION.autoRotateSpeed * dt });
      anim.frameId = requestAnimationFrame(tick);
    };
    anim.frameId = requestAnimationFrame(tick);
    return () => { if (anim.frameId) cancelAnimationFrame(anim.frameId); anim.lastTime = null; };
  }, [onRotationChange]);

  // Pointer handlers
  const handlePointerDown = useCallback((e) => {
    const svg = e.currentTarget; const rect = svg.getBoundingClientRect();
    if (e.clientX - rect.left > leftW) return;
    const drag = dragRef.current;
    drag.dragging = true; drag.startX = e.clientX; drag.startY = e.clientY;
    drag.startRotX = rotationRef.current.x; drag.startRotY = rotationRef.current.y; drag.moved = false;
    animRef.current.lastInteraction = performance.now();
    e.currentTarget.setPointerCapture(e.pointerId);
  }, [leftW]);

  const handlePointerMove = useCallback((e) => {
    const drag = dragRef.current; if (!drag.dragging) return;
    const dx = e.clientX - drag.startX, dy = e.clientY - drag.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) drag.moved = true;
    animRef.current.lastInteraction = performance.now();
    onRotationChange({ x: drag.startRotX + dy * ANIMATION.rotationSensitivity, y: drag.startRotY + dx * ANIMATION.rotationSensitivity });
  }, [onRotationChange]);

  const handlePointerUp = useCallback((e) => {
    const drag = dragRef.current; if (!drag.dragging) return; drag.dragging = false;
    if (!drag.moved) {
      const svg = e.currentTarget; const rect = svg.getBoundingClientRect();
      const clickX = e.clientX - rect.left - sphereCx, clickY = e.clientY - rect.top - sphereCy;
      const nx = clickX / scale, ny = -clickY / scale;
      if (nx * nx + ny * ny <= 1) {
        const nz = Math.sqrt(1 - nx * nx - ny * ny);
        const [ix, iy, iz] = rotate3D(nx, ny, nz, -rotationRef.current.x, 0);
        const [ox, oy, oz] = rotate3D(ix, iy, iz, 0, -rotationRef.current.y);
        let u = Math.atan2(oz, ox); if (u < 0) u += TWO_PI;
        const v = Math.asin(clamp(oy, -1, 1));
        onDotPlace({ u, v });
      }
    }
  }, [sphereCx, sphereCy, scale, onDotPlace]);

  // --- Right panel layout: two charts stacked ---
  const chartPadding = 10;
  const chartAreaX = rightX + chartPadding;
  const chartAreaW = rightW - chartPadding * 2;
  const topSectionH = height * 0.55; // stereographic gets more space (disc)
  const bottomSectionH = height - topSectionH;

  // Stereographic disc
  const discRadius = Math.min(chartAreaW, topSectionH - 30) * 0.38;
  const discCx = chartAreaX + chartAreaW / 2;
  const discCy = topSectionH / 2 + 5;
  const discScale = discRadius / 2.5;

  // Mercator rectangle
  const mercPad = 8;
  const mercX = chartAreaX + mercPad;
  const mercW = chartAreaW - mercPad * 2;
  const mercY = topSectionH + 20;
  const mercH = bottomSectionH - 40;

  // Click handler for right panel charts
  const handleChartClick = useCallback((e) => {
    const svg = e.currentTarget; const rect = svg.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    if (mx <= leftW) return;

    // Check stereographic disc click
    const dnx = mx - discCx, dny = my - discCy;
    if (dnx * dnx + dny * dny <= discRadius * discRadius) {
      const su = dnx / discScale, sv = -dny / discScale;
      const [ox, oy, oz] = inverseStereographicS(su, sv);
      let u = Math.atan2(oz, ox); if (u < 0) u += TWO_PI;
      const v = Math.asin(clamp(oy, -1, 1));
      onDotPlace({ u, v });
      return;
    }

    // Check Mercator rectangle click
    if (mx >= mercX && mx <= mercX + mercW && my >= mercY && my <= mercY + mercH) {
      const xFrac = (mx - mercX) / mercW;
      const yFrac = (my - mercY) / mercH;
      const mxVal = xFrac * TWO_PI;
      const myVal = MERCATOR_Y_MAX - yFrac * 2 * MERCATOR_Y_MAX; // top = +ymax, bottom = -ymax
      const inv = mercatorInverse(mxVal, myVal);
      onDotPlace({ u: inv.lon, v: clamp(inv.lat, -MERCATOR_LAT_LIMIT, MERCATOR_LAT_LIMIT) });
    }
  }, [leftW, discCx, discCy, discRadius, discScale, mercX, mercW, mercY, mercH, onDotPlace]);

  // Stereographic grid (radial + concentric, matching wireframe)
  const stereoGrid = useMemo(() => {
    const elements = [];
    for (let i = 0; i < U_LINES; i++) {
      const angle = (i / U_LINES) * TWO_PI;
      elements.push(<line key={`r${i}`} x1={discCx} y1={discCy} x2={discCx + Math.cos(angle) * discRadius} y2={discCy + Math.sin(angle) * discRadius} stroke={COLORS.primary} strokeWidth={0.8} opacity={0.35} />);
    }
    for (let j = 1; j <= V_LINES; j++) {
      const lat = -PI / 2 + (PI * j) / (V_LINES + 1);
      // stereographicS: project from south pole. radius = cos(lat)/(1+sin(lat))...
      // Actually for stereographicS, the formula projects FROM south pole (0,-1,0).
      // For a point at latitude lat: x=cos(lat)cos(lon), y=sin(lat), z=cos(lat)sin(lon)
      // stereographicS: u = x/(1+y) = cos(lat)cos(lon)/(1+sin(lat)), v = z/(1+y)
      // At lon=0: u = cos(lat)/(1+sin(lat)), v = 0
      // So the radius in stereographic coords = cos(lat)/(1+sin(lat))
      const denom = 1 + Math.sin(lat);
      if (Math.abs(denom) < 0.01) continue;
      const stereoR = Math.cos(lat) / denom;
      const pixelR = Math.abs(stereoR) * discScale;
      if (pixelR > discRadius) continue;
      elements.push(<circle key={`c${j}`} cx={discCx} cy={discCy} r={pixelR} fill="none" stroke={COLORS.primary} strokeWidth={0.8} opacity={0.35} />);
    }
    return elements;
  }, [discCx, discCy, discRadius, discScale]);

  // Stereographic dot position
  const stereoDot = useMemo(() => {
    if (!stereoProj) return null;
    const px = stereoProj.u * discScale, py = -stereoProj.v * discScale;
    if (px * px + py * py > discRadius * discRadius) return null;
    return { x: px, y: py };
  }, [stereoProj, discScale, discRadius]);

  // Mercator dot position (pixel coords within mercator rect)
  const mercatorDot = useMemo(() => {
    if (!mercatorProj) return null;
    const px = (mercatorProj.x / TWO_PI) * mercW;
    const py = ((MERCATOR_Y_MAX - mercatorProj.y) / (2 * MERCATOR_Y_MAX)) * mercH;
    return { x: mercX + px, y: mercY + py };
  }, [mercatorProj, mercW, mercH, mercX, mercY]);

  // Helper: map (u, v) to mercator pixel coords
  const uvToMercPx = (u, v) => {
    const mp = mercatorProject(u, v);
    if (!mp) return null;
    const px = (mp.x / TWO_PI) * mercW;
    const py = ((MERCATOR_Y_MAX - mp.y) / (2 * MERCATOR_Y_MAX)) * mercH;
    return { x: mercX + px, y: mercY + py };
  };

  // Helper: map (u, v) to stereo pixel coords
  const uvToStereoPx = (u, v) => {
    const sp = parametricSphere(u, v);
    const proj = stereographicS(sp.x, sp.y, sp.z);
    if (!proj) return null;
    const px = proj.u * discScale, py = -proj.v * discScale;
    if (px * px + py * py > discRadius * discRadius) return null;
    return { x: discCx + px, y: discCy + py };
  };

  return (
    <svg width={width} height={height} style={{ display: 'block', cursor: 'grab' }}
      onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onClick={handleChartClick}>
      <defs>
        <style>{`
          @keyframes dotScaleIn { from { transform: scale(0); } to { transform: scale(1); } }
          @keyframes dotPulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 0.6; } }
        `}</style>
        <clipPath id="discClipN"><circle cx={discCx} cy={discCy} r={discRadius} /></clipPath>
        <clipPath id="mercClip"><rect x={mercX} y={mercY} width={mercW} height={mercH} rx={6} /></clipPath>
      </defs>

      {/* ===== LEFT PANEL: Wireframe Sphere ===== */}
      <g aria-label="Interactive sphere" role="button">
        <circle cx={sphereCx} cy={sphereCy} r={scale} fill={COLORS.primary} opacity={WIREFRAME.backgroundFillOpacity} />
        {sortedLines.map((line, i) => {
          const baseOpacity = line.type === 'longitude' ? WIREFRAME.longitudeOpacity : WIREFRAME.latitudeOpacity;
          const sw = line.type === 'longitude' ? WIREFRAME.longitudeWidth : WIREFRAME.latitudeWidth;
          return <path key={i} d={line.path} fill="none" stroke={COLORS.primary} strokeWidth={sw} opacity={baseOpacity * (0.3 + 0.7 * line.normalizedDepth)} />;
        })}

        {/* Rainbow path on sphere */}
        {pathDots.map((pd, i) => {
          const sp = parametricSphere(pd.u, pd.v);
          const [rx, ry, rz] = rotate3D(sp.x, sp.y, sp.z, rotation.x, rotation.y);
          const p = project3D(rx, ry, rz, WIREFRAME.perspectiveDistance);
          return <circle key={`ps${i}`} cx={sphereCx + p.x * scale} cy={sphereCy - p.y * scale} r={2} fill={pd.color} opacity={0.85} />;
        })}
        {path.map((wp, i) => {
          const sp = parametricSphere(wp.u, wp.v);
          const [rx, ry, rz] = rotate3D(sp.x, sp.y, sp.z, rotation.x, rotation.y);
          const p = project3D(rx, ry, rz, WIREFRAME.perspectiveDistance);
          return <circle key={`wps${i}`} cx={sphereCx + p.x * scale} cy={sphereCy - p.y * scale} r={4.5} fill={rainbowColor(i, path.length)} stroke="#fff" strokeWidth={1.5} />;
        })}

        {projectedDot && <MappedDot cx={projectedDot.x} cy={projectedDot.y} color={COLORS.amber} r={6} animate />}
      </g>

      {/* Vertical divider */}
      <line x1={rightX} y1={0} x2={rightX} y2={height} stroke={COLORS.grid} strokeWidth={1} opacity={0.4} />

      {/* ===== RIGHT PANEL: Two Charts ===== */}
      <text x={rightX + rightW / 2} y={14} textAnchor="middle" fill={COLORS.muted} fontSize={11} fontFamily={FONTS.body} fontWeight={700} letterSpacing={1.5}>CHARTS</text>

      {/* --- Stereographic Chart (top) --- */}
      <g>
        <circle cx={discCx} cy={discCy} r={discRadius} fill={COLORS.surface} stroke={COLORS.amber} strokeWidth={1} opacity={0.8} />
        <g clipPath="url(#discClipN)">{stereoGrid}</g>
        <text x={discCx} y={discCy + discRadius + 14} textAnchor="middle" fill={COLORS.amber} fontSize={11} fontFamily={FONTS.body} fontWeight={700}>Stereographic (N at center)</text>

        {/* Rainbow path on stereo chart */}
        {pathDots.map((pd, i) => {
          const pos = uvToStereoPx(pd.u, pd.v);
          if (!pos) return null;
          return <circle key={`psd${i}`} cx={pos.x} cy={pos.y} r={2} fill={pd.color} opacity={0.85} />;
        })}
        {path.map((wp, i) => {
          const pos = uvToStereoPx(wp.u, wp.v);
          if (!pos) return null;
          return <circle key={`wpsd${i}`} cx={pos.x} cy={pos.y} r={4.5} fill={rainbowColor(i, path.length)} stroke="#fff" strokeWidth={1.5} />;
        })}

        {dot && stereoDot && <MappedDot cx={discCx + stereoDot.x} cy={discCy + stereoDot.y} color={COLORS.amber} r={5} animate />}
        {dot && !stereoProj && <text x={discCx} y={discCy + 5} textAnchor="middle" fill={COLORS.amber} fontSize={18} fontFamily={FONTS.mono} opacity={0.7}>&#215;</text>}
      </g>

      {/* --- Mercator Chart (bottom) --- */}
      <g>
        <ChartPanel x={mercX} y={mercY} width={mercW} height={mercH} label="Mercator" uSteps={U_LINES} vSteps={V_LINES}>
          <rect x={mercX} y={mercY} width={mercW} height={mercH} fill={COLORS.cyan} opacity={0.03} rx={6} />
        </ChartPanel>

        {/* Rainbow path on Mercator chart */}
        <g clipPath="url(#mercClip)">
          {pathDots.map((pd, i) => {
            const pos = uvToMercPx(pd.u, pd.v);
            if (!pos) return null;
            return <circle key={`pmd${i}`} cx={pos.x} cy={pos.y} r={2} fill={pd.color} opacity={0.85} />;
          })}
          {path.map((wp, i) => {
            const pos = uvToMercPx(wp.u, wp.v);
            if (!pos) return null;
            return <circle key={`wpmd${i}`} cx={pos.x} cy={pos.y} r={4.5} fill={rainbowColor(i, path.length)} stroke="#fff" strokeWidth={1.5} />;
          })}
          {mercatorDot && <MappedDot cx={mercatorDot.x} cy={mercatorDot.y} color={COLORS.cyan} r={5} animate />}
        </g>
        {dot && !mercatorProj && <text x={mercX + mercW / 2} y={mercY + mercH / 2 + 5} textAnchor="middle" fill={COLORS.cyan} fontSize={14} fontFamily={FONTS.mono} opacity={0.7}>&#215; (near pole)</text>}

        {/* Axis labels */}
        <text x={mercX} y={mercY + mercH + 12} fill={COLORS.muted} fontSize={8} fontFamily={FONTS.mono} textAnchor="start">0</text>
        <text x={mercX + mercW / 2} y={mercY + mercH + 12} fill={COLORS.muted} fontSize={8} fontFamily={FONTS.mono} textAnchor="middle">{'\u03C0'}</text>
        <text x={mercX + mercW} y={mercY + mercH + 12} fill={COLORS.muted} fontSize={8} fontFamily={FONTS.mono} textAnchor="end">{'2\u03C0'}</text>
        <text x={mercX - 4} y={mercY + 4} fill={COLORS.muted} fontSize={8} fontFamily={FONTS.mono} textAnchor="end">{'N'}</text>
        <text x={mercX - 4} y={mercY + mercH} fill={COLORS.muted} fontSize={8} fontFamily={FONTS.mono} textAnchor="end">{'S'}</text>
      </g>
    </svg>
  );
}
