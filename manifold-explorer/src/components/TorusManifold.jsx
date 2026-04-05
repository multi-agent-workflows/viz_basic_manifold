import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { COLORS, FONTS, LAYOUT, WIREFRAME, ANIMATION } from '../constants';
import { rotate3D, project3D, parametricTorus, generateWireframe, wireframeToPath, normalizeAngle, clamp } from '../mathUtils';
import MappedDot from './shared/MappedDot';
import ChartPanel from './shared/ChartPanel';

const TWO_PI = 2 * Math.PI;
const PI = Math.PI;
const MAJOR_R = 1.0;
const MINOR_R = 0.4;
const PERSPECTIVE_D = WIREFRAME.perspectiveDistance;
const SCALE = 120;
const U_LINES = 16;
const V_LINES = 12;
const MAX_TRAIL = 30;

// Gap strip width as fraction of chart dimension (thin visual indicator)
const GAP_FRAC = 0.025;

// Threshold: if dot is within this distance of a gap edge, hide it on that chart
const GAP_THRESHOLD = 0.15;

/**
 * Remap angle u (in [0, 2pi)) to Chart A range (-pi, pi).
 * Returns null if u is too close to the gap at +/-pi.
 */
function toChartA(u, v) {
  // Remap u from [0,2pi) to (-pi, pi): subtract pi
  let ua = u - PI;
  let va = v - PI;
  // Wrap to (-pi, pi]
  if (ua > PI) ua -= TWO_PI;
  if (ua < -PI) ua += TWO_PI;
  if (va > PI) va -= TWO_PI;
  if (va < -PI) va += TWO_PI;
  // Near gap at +/-pi?
  const nearGapU = Math.abs(Math.abs(ua) - PI) < GAP_THRESHOLD;
  const nearGapV = Math.abs(Math.abs(va) - PI) < GAP_THRESHOLD;
  if (nearGapU || nearGapV) return null;
  return { u: ua, v: va };
}

/**
 * Remap to Chart B range (0, 2pi). u,v already in [0,2pi).
 * Returns null if u or v is too close to 0.
 */
function toChartB(u, v) {
  const nearGapU = u < GAP_THRESHOLD || u > TWO_PI - GAP_THRESHOLD;
  const nearGapV = v < GAP_THRESHOLD || v > TWO_PI - GAP_THRESHOLD;
  if (nearGapU || nearGapV) return null;
  return { u, v };
}

export default function TorusManifold({ dot, onDotPlace, rotation, onRotationChange, width, height, onTeachingText }) {
  // --- State ---
  const [isDraggingDot, setIsDraggingDot] = useState(false);
  const [trail, setTrail] = useState([]);
  const [trailTick, setTrailTick] = useState(0);

  // --- Refs ---
  const isDragging3D = useRef(false);
  const lastPointer = useRef({ x: 0, y: 0 });
  const lastInteraction = useRef(0);
  const animFrameRef = useRef(null);
  const trailFrameRef = useRef(null);
  const prevDotRef = useRef(null);
  const isDraggingDotRef = useRef(false);
  const svgRef = useRef(null);
  const rotationRef = useRef(rotation);

  // Keep refs in sync
  isDraggingDotRef.current = isDraggingDot;
  rotationRef.current = rotation;

  // --- Layout ---
  const leftW = width * LAYOUT.leftPanelWidth;
  const rightX = leftW;
  const rightW = width * LAYOUT.rightPanelWidth;
  const cx3D = leftW / 2;
  const cy3D = height / 2;

  const chartPad = 24;
  const chartW = rightW - chartPad * 2;
  const chartH = (height - 80) / 2;
  const chartX = rightX + chartPad;
  const chartAY = 30;
  const chartBY = chartAY + chartH + 20;

  // --- Default teaching text ---
  useEffect(() => {
    if (!dot) {
      onTeachingText('A torus is a rectangle with opposite edges glued. Two overlapping charts cover it completely.');
    }
  }, [dot, onTeachingText]);

  // --- Wireframe geometry (memoized, does not depend on rotation) ---
  const wireframe = useMemo(() => {
    return generateWireframe(parametricTorus, U_LINES, V_LINES, 0, TWO_PI, 0, TWO_PI);
  }, []);

  // --- Grid intersections for hit testing ---
  const gridPoints = useMemo(() => {
    const pts = [];
    const uSteps = 32;
    const vSteps = 24;
    for (let i = 0; i <= uSteps; i++) {
      for (let j = 0; j <= vSteps; j++) {
        const u = TWO_PI * (i / uSteps);
        const v = TWO_PI * (j / vSteps);
        pts.push({ u, v });
      }
    }
    return pts;
  }, []);

  // --- Auto-rotation ---
  useEffect(() => {
    let running = true;
    let lastTime = performance.now();

    const tick = (now) => {
      if (!running) return;
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      if (!isDragging3D.current && now - lastInteraction.current > ANIMATION.autoRotateResumeDelay) {
        const cur = rotationRef.current;
        onRotationChange({
          x: cur.x,
          y: cur.y + ANIMATION.autoRotateSpeed * dt,
        });
      }
      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);
    return () => {
      running = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [onRotationChange]);

  // --- Trail pruning via rAF ---
  useEffect(() => {
    let running = true;
    const pruneTick = () => {
      if (!running) return;
      const now = performance.now();
      setTrail(prev => {
        const filtered = prev.filter(p => now - p.time < ANIMATION.trailLifetime);
        return filtered.length !== prev.length ? filtered : prev;
      });
      setTrailTick(t => t + 1);
      trailFrameRef.current = requestAnimationFrame(pruneTick);
    };
    trailFrameRef.current = requestAnimationFrame(pruneTick);
    return () => {
      running = false;
      if (trailFrameRef.current) cancelAnimationFrame(trailFrameRef.current);
    };
  }, []);

  // --- 3D Rotation drag handlers ---
  const onPointerDown3D = useCallback((e) => {
    if (isDraggingDotRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const px = e.clientX - rect.left;
    if (px > leftW) return;

    isDragging3D.current = true;
    lastPointer.current = { x: e.clientX, y: e.clientY };
    lastInteraction.current = performance.now();
    e.currentTarget.setPointerCapture(e.pointerId);
  }, [leftW]);

  const onPointerMove3D = useCallback((e) => {
    if (isDragging3D.current) {
      const dx = e.clientX - lastPointer.current.x;
      const dy = e.clientY - lastPointer.current.y;
      lastPointer.current = { x: e.clientX, y: e.clientY };
      lastInteraction.current = performance.now();
      const cur = rotationRef.current;
      onRotationChange({
        x: cur.x + dy * ANIMATION.rotationSensitivity,
        y: cur.y + dx * ANIMATION.rotationSensitivity,
      });
    }
  }, [onRotationChange]);

  const onPointerUp3D = useCallback(() => {
    isDragging3D.current = false;
  }, []);

  // --- Click on torus to place dot ---
  const onClick3D = useCallback((e) => {
    if (isDragging3D.current || isDraggingDotRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    if (px > leftW) return;

    const rot = rotationRef.current;
    let bestDist = Infinity;
    let bestPt = null;
    for (const gp of gridPoints) {
      const pt3d = parametricTorus(gp.u, gp.v, MAJOR_R, MINOR_R);
      const [rx, ry, rz] = rotate3D(pt3d.x, pt3d.y, pt3d.z, rot.x, rot.y);
      const proj = project3D(rx, ry, rz, PERSPECTIVE_D);
      const sx = cx3D + proj.x * SCALE;
      const sy = cy3D - proj.y * SCALE;
      const dist = Math.hypot(px - sx, py - sy);
      if (dist < bestDist) {
        bestDist = dist;
        bestPt = gp;
      }
    }
    if (bestPt && bestDist < 20) {
      onDotPlace({ u: bestPt.u, v: bestPt.v });
      setTrail([]);
      prevDotRef.current = null;
      onTeachingText('A torus is a rectangle with opposite edges glued. Two overlapping charts cover it completely.');
    }
  }, [gridPoints, cx3D, cy3D, leftW, onDotPlace, onTeachingText]);

  // --- Chart click to place dot (works for both Chart A and Chart B) ---
  const onClickChart = useCallback((e) => {
    if (isDraggingDotRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    // Check Chart A click: maps (-pi, pi) x (-pi, pi) -> u in [0,2pi)
    if (px >= chartX && px <= chartX + chartW && py >= chartAY && py <= chartAY + chartH) {
      // Chart A: pixel -> (-pi, pi), then remap to [0, 2pi)
      const ua = ((px - chartX) / chartW) * TWO_PI - PI;
      const va = ((py - chartAY) / chartH) * TWO_PI - PI;
      let u = ua + PI;
      let v = va + PI;
      if (u >= TWO_PI) u -= TWO_PI;
      if (v >= TWO_PI) v -= TWO_PI;
      if (u < 0) u += TWO_PI;
      if (v < 0) v += TWO_PI;
      onDotPlace({ u: clamp(u, 0, TWO_PI - 0.001), v: clamp(v, 0, TWO_PI - 0.001) });
      setTrail([]);
      prevDotRef.current = null;
      onTeachingText('A torus is a rectangle with opposite edges glued. Two overlapping charts cover it completely.');
      return;
    }

    // Check Chart B click: maps (0, 2pi) x (0, 2pi)
    if (px >= chartX && px <= chartX + chartW && py >= chartBY && py <= chartBY + chartH) {
      const u = ((px - chartX) / chartW) * TWO_PI;
      const v = ((py - chartBY) / chartH) * TWO_PI;
      onDotPlace({ u: clamp(u, 0.001, TWO_PI - 0.001), v: clamp(v, 0.001, TWO_PI - 0.001) });
      setTrail([]);
      prevDotRef.current = null;
      onTeachingText('A torus is a rectangle with opposite edges glued. Two overlapping charts cover it completely.');
    }
  }, [chartX, chartW, chartAY, chartBY, chartH, onDotPlace, onTeachingText]);

  // --- Dot dragging on Chart A ---
  const onDotPointerDown = useCallback((e) => {
    e.stopPropagation();
    setIsDraggingDot(true);
    prevDotRef.current = dot ? { u: dot.u, v: dot.v } : null;
    e.currentTarget.setPointerCapture(e.pointerId);
  }, [dot]);

  const onDotPointerMove = useCallback((e) => {
    if (!isDraggingDotRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    // Drag is on Chart A coordinates: (-pi, pi) x (-pi, pi)
    let ua = ((px - chartX) / chartW) * TWO_PI - PI;
    let va = ((py - chartAY) / chartH) * TWO_PI - PI;

    // Wrap to (-pi, pi)
    if (ua < -PI) ua += TWO_PI;
    if (ua > PI) ua -= TWO_PI;
    if (va < -PI) va += TWO_PI;
    if (va > PI) va -= TWO_PI;

    // Convert back to [0, 2pi) for internal storage
    let u = ua + PI;
    let v = va + PI;
    if (u >= TWO_PI) u -= TWO_PI;
    if (u < 0) u += TWO_PI;
    if (v >= TWO_PI) v -= TWO_PI;
    if (v < 0) v += TWO_PI;

    u = normalizeAngle(u);
    v = normalizeAngle(v);

    // Detect wrapping for teaching text
    if (prevDotRef.current) {
      const du = Math.abs(u - prevDotRef.current.u);
      const dv = Math.abs(v - prevDotRef.current.v);
      if (du > PI) {
        onTeachingText('Exit right, enter left \u2014 just like a video game screen. The flat map and the torus are two views of the same thing.');
      } else if (dv > PI) {
        onTeachingText('Exit top, enter bottom \u2014 the other direction wraps too.');
      }
    }
    prevDotRef.current = { u, v };

    onDotPlace({ u, v });

    // Add to trail
    setTrail(prev => {
      const next = [...prev, { u, v, time: performance.now() }];
      return next.length > MAX_TRAIL ? next.slice(next.length - MAX_TRAIL) : next;
    });
  }, [chartX, chartAY, chartW, chartH, onDotPlace, onTeachingText]);

  const onDotPointerUp = useCallback(() => {
    setIsDraggingDot(false);
  }, []);

  // --- Render wireframe lines with depth sorting ---
  const wireframeElements = useMemo(() => {
    const allLines = [];

    wireframe.uLines.forEach((line, i) => {
      const midIdx = Math.floor(line.length / 2);
      const mid = line[midIdx];
      const [, , mz] = rotate3D(mid[0], mid[1], mid[2], rotation.x, rotation.y);
      const pathD = wireframeToPath(line, rotation.x, rotation.y, PERSPECTIVE_D, SCALE, cx3D, cy3D);
      allLines.push({
        key: `u${i}`,
        d: pathD,
        depth: mz,
        opacity: WIREFRAME.longitudeOpacity,
        width: WIREFRAME.longitudeWidth,
      });
    });

    wireframe.vLines.forEach((line, i) => {
      const midIdx = Math.floor(line.length / 2);
      const mid = line[midIdx];
      const [, , mz] = rotate3D(mid[0], mid[1], mid[2], rotation.x, rotation.y);
      const pathD = wireframeToPath(line, rotation.x, rotation.y, PERSPECTIVE_D, SCALE, cx3D, cy3D);
      allLines.push({
        key: `v${i}`,
        d: pathD,
        depth: mz,
        opacity: WIREFRAME.latitudeOpacity,
        width: WIREFRAME.latitudeWidth,
      });
    });

    // Sort back-to-front
    allLines.sort((a, b) => b.depth - a.depth);

    return allLines.map(l => {
      const depthOpacity = 0.3 + 0.7 * (1 - (l.depth + 1.5) / 3);
      return (
        <path
          key={l.key}
          d={l.d}
          fill="none"
          stroke={COLORS.primary}
          strokeWidth={l.width}
          opacity={clamp(l.opacity * depthOpacity, 0.05, 1)}
        />
      );
    });
  }, [wireframe, rotation, cx3D, cy3D]);

  // --- Project dot onto 3D torus ---
  const dotOn3D = useMemo(() => {
    if (!dot) return null;
    const pt = parametricTorus(dot.u, dot.v, MAJOR_R, MINOR_R);
    const [rx, ry, rz] = rotate3D(pt.x, pt.y, pt.z, rotation.x, rotation.y);
    const proj = project3D(rx, ry, rz, PERSPECTIVE_D);
    return { x: cx3D + proj.x * SCALE, y: cy3D - proj.y * SCALE, depth: proj.depth };
  }, [dot, rotation, cx3D, cy3D]);

  // --- Dot positions on charts ---
  const dotOnChartA = useMemo(() => {
    if (!dot) return null;
    const mapped = toChartA(dot.u, dot.v);
    if (!mapped) return null;
    // Map (-pi, pi) to pixel coords
    const x = chartX + ((mapped.u + PI) / TWO_PI) * chartW;
    const y = chartAY + ((mapped.v + PI) / TWO_PI) * chartH;
    return { x, y, u: mapped.u, v: mapped.v };
  }, [dot, chartX, chartAY, chartW, chartH]);

  const dotOnChartB = useMemo(() => {
    if (!dot) return null;
    const mapped = toChartB(dot.u, dot.v);
    if (!mapped) return null;
    // Map (0, 2pi) to pixel coords
    const x = chartX + (mapped.u / TWO_PI) * chartW;
    const y = chartBY + (mapped.v / TWO_PI) * chartH;
    return { x, y, u: mapped.u, v: mapped.v };
  }, [dot, chartX, chartBY, chartW, chartH]);

  // --- Trail rendering ---
  const now = performance.now();

  // Trail on Chart A
  const trailOnChartA = trail.map((tp, i) => {
    const age = now - tp.time;
    const opacity = Math.max(0, 1 - age / ANIMATION.trailLifetime) * 0.6;
    if (opacity <= 0) return null;
    const mapped = toChartA(tp.u, tp.v);
    if (!mapped) return null;
    const tx = chartX + ((mapped.u + PI) / TWO_PI) * chartW;
    const ty = chartAY + ((mapped.v + PI) / TWO_PI) * chartH;
    return (
      <circle key={`tca${i}`} cx={tx} cy={ty} r={3} fill={COLORS.amber} opacity={opacity} />
    );
  });

  // Trail on Chart B
  const trailOnChartB = trail.map((tp, i) => {
    const age = now - tp.time;
    const opacity = Math.max(0, 1 - age / ANIMATION.trailLifetime) * 0.6;
    if (opacity <= 0) return null;
    const mapped = toChartB(tp.u, tp.v);
    if (!mapped) return null;
    const tx = chartX + (mapped.u / TWO_PI) * chartW;
    const ty = chartBY + (mapped.v / TWO_PI) * chartH;
    return (
      <circle key={`tcb${i}`} cx={tx} cy={ty} r={3} fill={COLORS.cyan} opacity={opacity} />
    );
  });

  const trailOn3D = trail.map((tp, i) => {
    const age = now - tp.time;
    const opacity = Math.max(0, 1 - age / ANIMATION.trailLifetime) * 0.6;
    if (opacity <= 0) return null;
    const pt = parametricTorus(tp.u, tp.v, MAJOR_R, MINOR_R);
    const [rx, ry, rz] = rotate3D(pt.x, pt.y, pt.z, rotation.x, rotation.y);
    const proj = project3D(rx, ry, rz, PERSPECTIVE_D);
    const sx = cx3D + proj.x * SCALE;
    const sy = cy3D - proj.y * SCALE;
    return (
      <circle key={`t3d${i}`} cx={sx} cy={sy} r={2.5} fill={COLORS.amber} opacity={opacity} />
    );
  });

  // --- Wrapping arrows on Chart A only ---
  const arrowSize = 8;

  // Horizontal wrapping arrows (amber, pointing right) at left and right edges of Chart A
  const hArrowFracs = [0.25, 0.5, 0.75];
  const hArrows = hArrowFracs.flatMap((frac, i) => {
    const ay = chartAY + chartH * frac;
    return [
      <polygon
        key={`ha-l${i}`}
        points={`${chartX - arrowSize - 2},${ay - arrowSize / 2} ${chartX - 2},${ay} ${chartX - arrowSize - 2},${ay + arrowSize / 2}`}
        fill={COLORS.amber}
        opacity={0.7}
      />,
      <polygon
        key={`ha-r${i}`}
        points={`${chartX + chartW + 2},${ay - arrowSize / 2} ${chartX + chartW + arrowSize + 2},${ay} ${chartX + chartW + 2},${ay + arrowSize / 2}`}
        fill={COLORS.amber}
        opacity={0.7}
      />,
    ];
  });

  // Vertical wrapping arrows (cyan, pointing down) at top and bottom edges of Chart A
  const vArrowFracs = [0.25, 0.5, 0.75];
  const vArrows = vArrowFracs.flatMap((frac, i) => {
    const ax = chartX + chartW * frac;
    return [
      <polygon
        key={`va-t${i}`}
        points={`${ax - arrowSize / 2},${chartAY - arrowSize - 2} ${ax},${chartAY - 2} ${ax + arrowSize / 2},${chartAY - arrowSize - 2}`}
        fill={COLORS.cyan}
        opacity={0.7}
      />,
      <polygon
        key={`va-b${i}`}
        points={`${ax - arrowSize / 2},${chartAY + chartH + 2} ${ax},${chartAY + chartH + arrowSize + 2} ${ax + arrowSize / 2},${chartAY + chartH + 2}`}
        fill={COLORS.cyan}
        opacity={0.7}
      />,
    ];
  });

  // --- Gap strip and overlap rendering helpers ---
  const gapW = chartW * GAP_FRAC;
  const gapH = chartH * GAP_FRAC;

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      style={{ cursor: isDragging3D.current ? 'grabbing' : isDraggingDot ? 'grabbing' : 'default' }}
      onPointerDown={onPointerDown3D}
      onPointerMove={(e) => {
        onPointerMove3D(e);
        onDotPointerMove(e);
      }}
      onPointerUp={(e) => {
        onPointerUp3D(e);
        onDotPointerUp(e);
      }}
      onClick={onClick3D}
    >
      {/* Divider line */}
      <line
        x1={leftW}
        y1={0}
        x2={leftW}
        y2={height}
        stroke={COLORS.grid}
        strokeWidth={1}
        opacity={0.3}
      />

      {/* --- LEFT PANEL: 3D Torus --- */}
      <g aria-label="3D torus view">
        {/* Background glow */}
        <circle
          cx={cx3D}
          cy={cy3D}
          r={SCALE * 1.6}
          fill={COLORS.primary}
          opacity={WIREFRAME.backgroundFillOpacity}
        />

        {/* Wireframe */}
        {wireframeElements}

        {/* Trail on 3D torus */}
        {trailOn3D}

        {/* Dot on 3D torus */}
        {dotOn3D && (
          <MappedDot cx={dotOn3D.x} cy={dotOn3D.y} color={COLORS.amber} r={5} />
        )}

        {/* Label */}
        <text
          x={cx3D}
          y={height - 16}
          textAnchor="middle"
          fill={COLORS.muted}
          fontSize={13}
          fontFamily={FONTS.body}
          fontWeight={600}
        >
          Torus (T{'\u00B2'})
        </text>

        {/* Interaction hint */}
        {!dot && (
          <text
            x={cx3D}
            y={height - 36}
            textAnchor="middle"
            fill={COLORS.muted}
            fontSize={11}
            fontFamily={FONTS.body}
            opacity={0.6}
          >
            Click on the torus to place a dot
          </text>
        )}
      </g>

      {/* --- RIGHT PANEL: Two Charts --- */}
      <g aria-label="Chart view" onClick={onClickChart}>

        {/* ========== CHART A: (u,v) in (-pi, pi) x (-pi, pi) ========== */}
        <ChartPanel
          x={chartX}
          y={chartAY}
          width={chartW}
          height={chartH}
          label={`Chart A \u2014 (u, v) \u2208 (-\u03C0, \u03C0) \u00D7 (-\u03C0, \u03C0)`}
        >
          {/* Faint amber fill for the main region */}
          <rect
            x={chartX + 1}
            y={chartAY + 1}
            width={chartW - 2}
            height={chartH - 2}
            fill={COLORS.amber}
            opacity={0.04}
            rx={7}
            ry={7}
          />

          {/* Overlap region (light green): everything except the gap strips */}
          <rect
            x={chartX + 1}
            y={chartAY + 1}
            width={chartW - gapW - 2}
            height={chartH - gapH - 2}
            fill={COLORS.lightGreen}
            opacity={0.06}
            rx={4}
            ry={4}
          />

          {/* Gap strip: right edge (u = pi gap) */}
          <rect
            x={chartX + chartW - gapW}
            y={chartAY}
            width={gapW}
            height={chartH}
            fill={COLORS.grid}
            opacity={0.25}
          />

          {/* Gap strip: bottom edge (v = pi gap) */}
          <rect
            x={chartX}
            y={chartAY + chartH - gapH}
            width={chartW}
            height={gapH}
            fill={COLORS.grid}
            opacity={0.25}
          />

          {/* Gap labels */}
          <text
            x={chartX + chartW - gapW / 2}
            y={chartAY + chartH / 2}
            textAnchor="middle"
            fill={COLORS.muted}
            fontSize={8}
            fontFamily={FONTS.mono}
            opacity={0.5}
            transform={`rotate(-90, ${chartX + chartW - gapW / 2}, ${chartAY + chartH / 2})`}
          >
            u={'\u03C0'}
          </text>
          <text
            x={chartX + chartW / 2}
            y={chartAY + chartH - gapH / 2 + 3}
            textAnchor="middle"
            fill={COLORS.muted}
            fontSize={8}
            fontFamily={FONTS.mono}
            opacity={0.5}
          >
            v={'\u03C0'}
          </text>

          {/* Trail on Chart A */}
          {trailOnChartA}

          {/* Dot on Chart A */}
          {dotOnChartA && (
            <g
              style={{ cursor: isDraggingDot ? 'grabbing' : 'grab' }}
              onPointerDown={onDotPointerDown}
            >
              <MappedDot
                cx={dotOnChartA.x}
                cy={dotOnChartA.y}
                color={COLORS.amber}
                r={6}
                label={`(${(dotOnChartA.u / PI).toFixed(2)}\u03C0, ${(dotOnChartA.v / PI).toFixed(2)}\u03C0)`}
              />
              {/* Larger invisible hit target for dragging */}
              <circle
                cx={dotOnChartA.x}
                cy={dotOnChartA.y}
                r={16}
                fill="transparent"
                style={{ cursor: 'grab' }}
              />
            </g>
          )}
        </ChartPanel>

        {/* Wrapping arrows (Chart A only) */}
        {hArrows}
        {vArrows}

        {/* ========== CHART B: (u,v) in (0, 2pi) x (0, 2pi) ========== */}
        <ChartPanel
          x={chartX}
          y={chartBY}
          width={chartW}
          height={chartH}
          label={`Chart B \u2014 (u, v) \u2208 (0, 2\u03C0) \u00D7 (0, 2\u03C0)`}
        >
          {/* Faint cyan fill for the main region */}
          <rect
            x={chartX + 1}
            y={chartBY + 1}
            width={chartW - 2}
            height={chartH - 2}
            fill={COLORS.cyan}
            opacity={0.04}
            rx={7}
            ry={7}
          />

          {/* Overlap region (light green): everything except the gap strips */}
          <rect
            x={chartX + gapW + 1}
            y={chartBY + gapH + 1}
            width={chartW - gapW - 2}
            height={chartH - gapH - 2}
            fill={COLORS.lightGreen}
            opacity={0.06}
            rx={4}
            ry={4}
          />

          {/* Gap strip: left edge (u = 0 gap) */}
          <rect
            x={chartX}
            y={chartBY}
            width={gapW}
            height={chartH}
            fill={COLORS.grid}
            opacity={0.25}
          />

          {/* Gap strip: top edge (v = 0 gap) */}
          <rect
            x={chartX}
            y={chartBY}
            width={chartW}
            height={gapH}
            fill={COLORS.grid}
            opacity={0.25}
          />

          {/* Gap labels */}
          <text
            x={chartX + gapW / 2}
            y={chartBY + chartH / 2}
            textAnchor="middle"
            fill={COLORS.muted}
            fontSize={8}
            fontFamily={FONTS.mono}
            opacity={0.5}
            transform={`rotate(-90, ${chartX + gapW / 2}, ${chartBY + chartH / 2})`}
          >
            u=0
          </text>
          <text
            x={chartX + chartW / 2}
            y={chartBY + gapH / 2 + 3}
            textAnchor="middle"
            fill={COLORS.muted}
            fontSize={8}
            fontFamily={FONTS.mono}
            opacity={0.5}
          >
            v=0
          </text>

          {/* Trail on Chart B */}
          {trailOnChartB}

          {/* Dot on Chart B */}
          {dotOnChartB && (
            <g>
              <MappedDot
                cx={dotOnChartB.x}
                cy={dotOnChartB.y}
                color={COLORS.cyan}
                r={6}
                label={`(${(dotOnChartB.u / PI).toFixed(2)}\u03C0, ${(dotOnChartB.v / PI).toFixed(2)}\u03C0)`}
              />
            </g>
          )}
        </ChartPanel>

        {/* Drag hint */}
        {dot && !isDraggingDot && (
          <text
            x={chartX + chartW / 2}
            y={chartBY + chartH + 16}
            textAnchor="middle"
            fill={COLORS.muted}
            fontSize={11}
            fontFamily={FONTS.body}
            opacity={0.5}
          >
            Drag the dot on Chart A to explore wrapping
          </text>
        )}
      </g>
    </svg>
  );
}
