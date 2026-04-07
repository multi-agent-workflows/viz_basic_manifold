import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { COLORS, FONTS, LAYOUT, WIREFRAME, ANIMATION } from '../constants';
import { rotate3D, project3D, parametricTorus, generateWireframe, wireframeToPath, normalizeAngle, clamp } from '../mathUtils';
import MappedDot from './shared/MappedDot';
import ChartPanel from './shared/ChartPanel';
import { interpolatePath, rainbowColor } from '../rainbowPath';

const TWO_PI = 2 * Math.PI;
const PI = Math.PI;
const MAJOR_R = 1.0;
const MINOR_R = 0.4;
const PERSPECTIVE_D = WIREFRAME.perspectiveDistance;
const SCALE = 120;
const U_LINES = 16;
const V_LINES = 12;
const MAX_TRAIL = 30;
export default function TorusManifold({ dot, onDotPlace, rotation, onRotationChange, width, height, onTeachingText, path = [] }) {
  const [isDraggingDot, setIsDraggingDot] = useState(false);
  const [trail, setTrail] = useState([]);
  const [trailTick, setTrailTick] = useState(0);

  const isDragging3D = useRef(false);
  const lastPointer = useRef({ x: 0, y: 0 });
  const lastInteraction = useRef(0);
  const animFrameRef = useRef(null);
  const trailFrameRef = useRef(null);
  const prevDotRef = useRef(null);
  const isDraggingDotRef = useRef(false);
  const svgRef = useRef(null);
  const rotationRef = useRef(rotation);

  isDraggingDotRef.current = isDraggingDot;
  rotationRef.current = rotation;

  const leftW = width * LAYOUT.leftPanelWidth;
  const rightX = leftW;
  const rightW = width * LAYOUT.rightPanelWidth;
  const cx3D = leftW / 2;
  const cy3D = height / 2;

  const chartPad = 24;
  const chartW = rightW - chartPad * 2;
  const chartH = height - 60;
  const chartX = rightX + chartPad;
  const chartY = 30;

  // Rainbow path
  const pathDots = useMemo(() => interpolatePath(path, TWO_PI, TWO_PI), [path]);

  useEffect(() => {
    if (!dot) onTeachingText('Click on the torus to place a dot and explore how it maps to a flat chart.');
  }, [dot, onTeachingText]);

  const wireframe = useMemo(() => generateWireframe(parametricTorus, U_LINES, V_LINES, 0, TWO_PI, 0, TWO_PI), []);

  const gridPoints = useMemo(() => {
    const pts = [];
    for (let i = 0; i <= 32; i++) for (let j = 0; j <= 24; j++) pts.push({ u: TWO_PI * (i / 32), v: TWO_PI * (j / 24) });
    return pts;
  }, []);

  useEffect(() => {
    let running = true; let lastTime = performance.now();
    const tick = (now) => {
      if (!running) return;
      const dt = (now - lastTime) / 1000; lastTime = now;
      if (!isDragging3D.current && now - lastInteraction.current > ANIMATION.autoRotateResumeDelay) {
        const cur = rotationRef.current;
        onRotationChange({ x: cur.x, y: cur.y + ANIMATION.autoRotateSpeed * dt });
      }
      animFrameRef.current = requestAnimationFrame(tick);
    };
    animFrameRef.current = requestAnimationFrame(tick);
    return () => { running = false; if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); };
  }, [onRotationChange]);

  useEffect(() => {
    let running = true;
    const pruneTick = () => {
      if (!running) return;
      const now = performance.now();
      setTrail(prev => { const f = prev.filter(p => now - p.time < ANIMATION.trailLifetime); return f.length !== prev.length ? f : prev; });
      setTrailTick(t => t + 1);
      trailFrameRef.current = requestAnimationFrame(pruneTick);
    };
    trailFrameRef.current = requestAnimationFrame(pruneTick);
    return () => { running = false; if (trailFrameRef.current) cancelAnimationFrame(trailFrameRef.current); };
  }, []);

  const onPointerDown3D = useCallback((e) => {
    if (isDraggingDotRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    if (e.clientX - rect.left > leftW) return;
    isDragging3D.current = true; lastPointer.current = { x: e.clientX, y: e.clientY };
    lastInteraction.current = performance.now(); e.currentTarget.setPointerCapture(e.pointerId);
  }, [leftW]);

  const onPointerMove3D = useCallback((e) => {
    if (isDragging3D.current) {
      const dx = e.clientX - lastPointer.current.x, dy = e.clientY - lastPointer.current.y;
      lastPointer.current = { x: e.clientX, y: e.clientY }; lastInteraction.current = performance.now();
      const cur = rotationRef.current;
      onRotationChange({ x: cur.x + dy * ANIMATION.rotationSensitivity, y: cur.y + dx * ANIMATION.rotationSensitivity });
    }
  }, [onRotationChange]);

  const onPointerUp3D = useCallback(() => { isDragging3D.current = false; }, []);

  const onClick3D = useCallback((e) => {
    if (isDragging3D.current || isDraggingDotRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const px = e.clientX - rect.left, py = e.clientY - rect.top;
    if (px > leftW) return;
    const rot = rotationRef.current;
    let bestDist = Infinity, bestPt = null;
    for (const gp of gridPoints) {
      const pt3d = parametricTorus(gp.u, gp.v, MAJOR_R, MINOR_R);
      const [rx, ry, rz] = rotate3D(pt3d.x, pt3d.y, pt3d.z, rot.x, rot.y);
      const proj = project3D(rx, ry, rz, PERSPECTIVE_D);
      const dist = Math.hypot(px - (cx3D + proj.x * SCALE), py - (cy3D - proj.y * SCALE));
      if (dist < bestDist) { bestDist = dist; bestPt = gp; }
    }
    if (bestPt && bestDist < 20) { onDotPlace({ u: bestPt.u, v: bestPt.v }); setTrail([]); prevDotRef.current = null; }
  }, [gridPoints, cx3D, cy3D, leftW, onDotPlace]);

  const onClickChart = useCallback((e) => {
    if (isDraggingDotRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const px = e.clientX - rect.left, py = e.clientY - rect.top;
    if (px >= chartX && px <= chartX + chartW && py >= chartY && py <= chartY + chartH) {
      const u = ((px - chartX) / chartW) * TWO_PI, v = ((py - chartY) / chartH) * TWO_PI;
      onDotPlace({ u: clamp(u, 0.001, TWO_PI - 0.001), v: clamp(v, 0.001, TWO_PI - 0.001) });
      setTrail([]); prevDotRef.current = null;
    }
  }, [chartX, chartW, chartY, chartH, onDotPlace]);

  const onDotPointerDown = useCallback((e) => {
    e.stopPropagation(); setIsDraggingDot(true);
    prevDotRef.current = dot ? { u: dot.u, v: dot.v } : null;
    e.currentTarget.setPointerCapture(e.pointerId);
  }, [dot]);

  const onDotPointerMove = useCallback((e) => {
    if (!isDraggingDotRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    let u = ((e.clientX - rect.left - chartX) / chartW) * TWO_PI;
    let v = ((e.clientY - rect.top - chartY) / chartH) * TWO_PI;
    u = normalizeAngle(u); v = normalizeAngle(v);
    if (prevDotRef.current) {
      if (Math.abs(u - prevDotRef.current.u) > PI) onTeachingText('Exit right, enter left \u2014 just like a video game screen.');
      else if (Math.abs(v - prevDotRef.current.v) > PI) onTeachingText('Exit top, enter bottom \u2014 the other direction wraps too.');
    }
    prevDotRef.current = { u, v }; onDotPlace({ u, v });
    setTrail(prev => { const next = [...prev, { u, v, time: performance.now() }]; return next.length > MAX_TRAIL ? next.slice(-MAX_TRAIL) : next; });
  }, [chartX, chartY, chartW, chartH, onDotPlace, onTeachingText]);

  const onDotPointerUp = useCallback(() => { setIsDraggingDot(false); }, []);

  const wireframeElements = useMemo(() => {
    const allLines = [];
    wireframe.uLines.forEach((line, i) => {
      const mid = line[Math.floor(line.length / 2)];
      const [, , mz] = rotate3D(mid[0], mid[1], mid[2], rotation.x, rotation.y);
      allLines.push({ key: `u${i}`, d: wireframeToPath(line, rotation.x, rotation.y, PERSPECTIVE_D, SCALE, cx3D, cy3D), depth: mz, opacity: WIREFRAME.longitudeOpacity, width: WIREFRAME.longitudeWidth });
    });
    wireframe.vLines.forEach((line, i) => {
      const mid = line[Math.floor(line.length / 2)];
      const [, , mz] = rotate3D(mid[0], mid[1], mid[2], rotation.x, rotation.y);
      allLines.push({ key: `v${i}`, d: wireframeToPath(line, rotation.x, rotation.y, PERSPECTIVE_D, SCALE, cx3D, cy3D), depth: mz, opacity: WIREFRAME.latitudeOpacity, width: WIREFRAME.latitudeWidth });
    });
    allLines.sort((a, b) => b.depth - a.depth);
    return allLines.map(l => <path key={l.key} d={l.d} fill="none" stroke={COLORS.primary} strokeWidth={l.width} opacity={clamp(l.opacity * (0.3 + 0.7 * (1 - (l.depth + 1.5) / 3)), 0.05, 1)} />);
  }, [wireframe, rotation, cx3D, cy3D]);

  const dotOn3D = useMemo(() => {
    if (!dot) return null;
    const pt = parametricTorus(dot.u, dot.v, MAJOR_R, MINOR_R);
    const [rx, ry, rz] = rotate3D(pt.x, pt.y, pt.z, rotation.x, rotation.y);
    const proj = project3D(rx, ry, rz, PERSPECTIVE_D);
    return { x: cx3D + proj.x * SCALE, y: cy3D - proj.y * SCALE };
  }, [dot, rotation, cx3D, cy3D]);

  const dotOnChart = useMemo(() => {
    if (!dot) return null;
    return { x: chartX + (dot.u / TWO_PI) * chartW, y: chartY + (dot.v / TWO_PI) * chartH, u: dot.u, v: dot.v };
  }, [dot, chartX, chartY, chartW, chartH]);

  const now = performance.now();
  const trailOnChart = trail.map((tp, i) => {
    const opacity = Math.max(0, 1 - (now - tp.time) / ANIMATION.trailLifetime) * 0.6;
    if (opacity <= 0) return null;
    return <circle key={`tc${i}`} cx={chartX + (tp.u / TWO_PI) * chartW} cy={chartY + (tp.v / TWO_PI) * chartH} r={3} fill={COLORS.amber} opacity={opacity} />;
  });
  const trailOn3D = trail.map((tp, i) => {
    const opacity = Math.max(0, 1 - (now - tp.time) / ANIMATION.trailLifetime) * 0.6;
    if (opacity <= 0) return null;
    const pt = parametricTorus(tp.u, tp.v, MAJOR_R, MINOR_R);
    const [rx, ry, rz] = rotate3D(pt.x, pt.y, pt.z, rotation.x, rotation.y);
    const proj = project3D(rx, ry, rz, PERSPECTIVE_D);
    return <circle key={`t3d${i}`} cx={cx3D + proj.x * SCALE} cy={cy3D - proj.y * SCALE} r={2.5} fill={COLORS.amber} opacity={opacity} />;
  });

  const arrowSize = 8;
  const hArrows = [0.25, 0.5, 0.75].flatMap((frac, i) => {
    const ay = chartY + chartH * frac;
    return [
      <polygon key={`ha-l${i}`} points={`${chartX - arrowSize - 2},${ay - arrowSize / 2} ${chartX - 2},${ay} ${chartX - arrowSize - 2},${ay + arrowSize / 2}`} fill={COLORS.amber} opacity={0.7} />,
      <polygon key={`ha-r${i}`} points={`${chartX + chartW + 2},${ay - arrowSize / 2} ${chartX + chartW + arrowSize + 2},${ay} ${chartX + chartW + 2},${ay + arrowSize / 2}`} fill={COLORS.amber} opacity={0.7} />,
    ];
  });
  const vArrows = [0.25, 0.5, 0.75].flatMap((frac, i) => {
    const ax = chartX + chartW * frac;
    return [
      <polygon key={`va-t${i}`} points={`${ax - arrowSize / 2},${chartY - arrowSize - 2} ${ax},${chartY - 2} ${ax + arrowSize / 2},${chartY - arrowSize - 2}`} fill={COLORS.cyan} opacity={0.7} />,
      <polygon key={`va-b${i}`} points={`${ax - arrowSize / 2},${chartY + chartH + 2} ${ax},${chartY + chartH + arrowSize + 2} ${ax + arrowSize / 2},${chartY + chartH + 2}`} fill={COLORS.cyan} opacity={0.7} />,
    ];
  });

  return (
    <svg ref={svgRef} width={width} height={height}
      style={{ cursor: isDragging3D.current ? 'grabbing' : isDraggingDot ? 'grabbing' : 'default' }}
      onPointerDown={onPointerDown3D} onPointerMove={(e) => { onPointerMove3D(e); onDotPointerMove(e); }}
      onPointerUp={(e) => { onPointerUp3D(e); onDotPointerUp(e); }} onClick={onClick3D}>
      <line x1={leftW} y1={0} x2={leftW} y2={height} stroke={COLORS.grid} strokeWidth={1} opacity={0.3} />

      {/* LEFT PANEL: 3D Torus */}
      <g aria-label="3D torus view">
        <circle cx={cx3D} cy={cy3D} r={SCALE * 1.6} fill={COLORS.primary} opacity={WIREFRAME.backgroundFillOpacity} />
        {wireframeElements}
        {trailOn3D}

        {/* Rainbow path dots on torus */}
        {pathDots.map((pd, i) => {
          const pt = parametricTorus(pd.u, pd.v, MAJOR_R, MINOR_R);
          const [rx, ry, rz] = rotate3D(pt.x, pt.y, pt.z, rotation.x, rotation.y);
          const proj = project3D(rx, ry, rz, PERSPECTIVE_D);
          return <circle key={`pt${i}`} cx={cx3D + proj.x * SCALE} cy={cy3D - proj.y * SCALE} r={2} fill={pd.color} opacity={0.85} />;
        })}
        {path.map((wp, i) => {
          const pt = parametricTorus(wp.u, wp.v, MAJOR_R, MINOR_R);
          const [rx, ry, rz] = rotate3D(pt.x, pt.y, pt.z, rotation.x, rotation.y);
          const proj = project3D(rx, ry, rz, PERSPECTIVE_D);
          return <circle key={`wpt${i}`} cx={cx3D + proj.x * SCALE} cy={cy3D - proj.y * SCALE} r={4.5} fill={rainbowColor(i, path.length)} stroke="#fff" strokeWidth={1.5} />;
        })}

        {dotOn3D && <MappedDot cx={dotOn3D.x} cy={dotOn3D.y} color={COLORS.amber} r={5} />}
        <text x={cx3D} y={height - 16} textAnchor="middle" fill={COLORS.muted} fontSize={13} fontFamily={FONTS.body} fontWeight={600}>Torus (T{'\u00B2'})</text>
        {!dot && <text x={cx3D} y={height - 36} textAnchor="middle" fill={COLORS.muted} fontSize={11} fontFamily={FONTS.body} opacity={0.6}>Click on the torus to place a dot</text>}
      </g>

      {/* RIGHT PANEL: Single Chart */}
      <g aria-label="Chart view" onClick={onClickChart}>
        <ChartPanel x={chartX} y={chartY} width={chartW} height={chartH}
          label={`Chart \u2014 (u, v) \u2208 [0, 2\u03C0) \u00D7 [0, 2\u03C0)`} uSteps={U_LINES} vSteps={V_LINES}>
          <rect x={chartX + 1} y={chartY + 1} width={chartW - 2} height={chartH - 2} fill={COLORS.amber} opacity={0.04} rx={7} ry={7} />
          {trailOnChart}

          {/* Rainbow path dots on chart */}
          {pathDots.map((pd, i) => (
            <circle key={`ptc${i}`} cx={chartX + (pd.u / TWO_PI) * chartW} cy={chartY + (pd.v / TWO_PI) * chartH} r={2} fill={pd.color} opacity={0.85} />
          ))}
          {path.map((wp, i) => (
            <circle key={`wptc${i}`} cx={chartX + (wp.u / TWO_PI) * chartW} cy={chartY + (wp.v / TWO_PI) * chartH} r={4.5} fill={rainbowColor(i, path.length)} stroke="#fff" strokeWidth={1.5} />
          ))}

          {dotOnChart && (
            <g style={{ cursor: isDraggingDot ? 'grabbing' : 'grab' }} onPointerDown={onDotPointerDown}>
              <MappedDot cx={dotOnChart.x} cy={dotOnChart.y} color={COLORS.amber} r={6}
                label={`(${(dotOnChart.u / PI).toFixed(2)}\u03C0, ${(dotOnChart.v / PI).toFixed(2)}\u03C0)`} />
              <circle cx={dotOnChart.x} cy={dotOnChart.y} r={16} fill="transparent" style={{ cursor: 'grab' }} />
            </g>
          )}
        </ChartPanel>
        {hArrows}{vArrows}
      </g>
    </svg>
  );
}
