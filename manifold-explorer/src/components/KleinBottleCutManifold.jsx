import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { COLORS, FONTS, LAYOUT, WIREFRAME, ANIMATION } from '../constants';
import { rotate3D, project3D, parametricKleinBottle, generateWireframe, wireframeToPath, normalizeAngle, clamp } from '../mathUtils';
import MappedDot from './shared/MappedDot';
import ChartPanel from './shared/ChartPanel';
import { interpolatePath, rainbowColor } from '../rainbowPath';

const TWO_PI = 2 * Math.PI;
const PI = Math.PI;

export default function KleinBottleCutManifold({ dot, onDotPlace, rotation, onRotationChange, width, height, onTeachingText, path = [] }) {
  // --- Layout ---
  const leftW = width * LAYOUT.leftPanelWidth;
  const rightW = width * LAYOUT.rightPanelWidth;

  // 3D view center
  const cx3d = leftW / 2;
  const cy3d = height / 2;
  const scale3d = 7;
  const perspD = 40;

  // Chart rectangles (two stacked vertically with gap)
  const chartPad = 40;
  const chartX = leftW + chartPad;
  const chartGap = 28; // gap between the two halves
  const totalChartH = height - chartPad * 2 - chartGap;
  const chartW = rightW - chartPad * 2;
  const halfH = totalChartH / 2;
  const chartAY = chartPad; // Half A (v ∈ [0, π])
  const chartBY = chartPad + halfH + chartGap; // Half B (v ∈ [π, 2π])

  // --- State ---
  const [isDraggingDot, setIsDraggingDot] = useState(false);

  // Refs for drag / animation
  const dragRef = useRef({ active: false, startX: 0, startY: 0, startRot: { x: 0, y: 0 } });
  const dotDragRef = useRef({ active: false });
  const animRef = useRef(null);
  const lastTimeRef = useRef(null);
  const interactTimeRef = useRef(0);

  // --- Wireframe (memoized, static geometry) ---
  const wireframe = useMemo(() => {
    return generateWireframe(parametricKleinBottle, 16, 12, 0, TWO_PI, 0, TWO_PI);
  }, []);

  // --- Cut line at v = π ---
  const cutLine3D = useMemo(() => {
    const line = [];
    const resolution = 60;
    for (let i = 0; i <= resolution; i++) {
      const u = (i / resolution) * TWO_PI;
      const pt = parametricKleinBottle(u, PI);
      line.push([pt.x, pt.y, pt.z]);
    }
    return line;
  }, []);

  // --- Auto-rotation ---
  useEffect(() => {
    const animate = (time) => {
      if (lastTimeRef.current === null) lastTimeRef.current = time;
      const dt = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      const sinceInteract = time - interactTimeRef.current;
      if (sinceInteract > ANIMATION.autoRotateResumeDelay && !dragRef.current.active && !dotDragRef.current.active) {
        onRotationChange({
          x: rotation.x,
          y: rotation.y + ANIMATION.autoRotateSpeed * dt,
        });
      }

      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [rotation, onRotationChange]);

  // --- Default teaching text ---
  useEffect(() => {
    onTeachingText("Cut a Klein bottle in half \u2014 each piece, with its edge identifications, forms a M\u00F6bius band.");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Helper: project a Klein bottle (u,v) point to SVG screen coords ---
  const projectToSVG = useCallback((u, v) => {
    const pt = parametricKleinBottle(u, v);
    const [rx, ry, rz] = rotate3D(pt.x, pt.y, pt.z, rotation.x, rotation.y);
    const p = project3D(rx, ry, rz, perspD);
    return { x: cx3d + p.x * scale3d, y: cy3d - p.y * scale3d, depth: p.depth };
  }, [rotation.x, rotation.y, cx3d, cy3d, scale3d, perspD]);

  // --- Helper: chart UV to pixel (maps to the correct half) ---
  const uvToChart = useCallback((u, v) => {
    if (v < PI) {
      // Half A: v ∈ [0, π]
      return {
        x: chartX + (u / TWO_PI) * chartW,
        y: chartAY + (1 - v / PI) * halfH,
      };
    } else {
      // Half B: v ∈ [π, 2π]
      return {
        x: chartX + (u / TWO_PI) * chartW,
        y: chartBY + (1 - (v - PI) / PI) * halfH,
      };
    }
  }, [chartX, chartAY, chartBY, chartW, halfH]);

  // --- Helper: pixel to chart UV ---
  const chartToUV = useCallback((px, py) => {
    // Determine which half was clicked
    if (py >= chartAY && py <= chartAY + halfH) {
      // Half A: v ∈ [0, π]
      const u = ((px - chartX) / chartW) * TWO_PI;
      const v = (1 - (py - chartAY) / halfH) * PI;
      return { u: normalizeAngle(u), v: clamp(v, 0, PI - 0.001) };
    } else if (py >= chartBY && py <= chartBY + halfH) {
      // Half B: v ∈ [π, 2π]
      const u = ((px - chartX) / chartW) * TWO_PI;
      const v = PI + (1 - (py - chartBY) / halfH) * PI;
      return { u: normalizeAngle(u), v: clamp(v, PI, TWO_PI - 0.001) };
    }
    return null;
  }, [chartX, chartAY, chartBY, chartW, halfH]);

  // --- Rainbow path interpolation ---
  const pathDots = useMemo(() => interpolatePath(path, TWO_PI, TWO_PI), [path]);

  // --- Rotation drag handlers ---
  const handleMouseDown = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left;

    if (mx < leftW) {
      dragRef.current = { active: true, startX: e.clientX, startY: e.clientY, startRot: { ...rotation } };
      interactTimeRef.current = performance.now();
      e.preventDefault();
    }
  }, [rotation, leftW]);

  const handleMouseMove = useCallback((e) => {
    if (dragRef.current.active) {
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      onRotationChange({
        x: dragRef.current.startRot.x + dy * ANIMATION.rotationSensitivity,
        y: dragRef.current.startRot.y + dx * ANIMATION.rotationSensitivity,
      });
      interactTimeRef.current = performance.now();
    }

    if (dotDragRef.current.active && dot) {
      const rect = e.currentTarget.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const uv = chartToUV(mx, my);
      if (uv) {
        onDotPlace({ u: uv.u, v: uv.v });
      }
      interactTimeRef.current = performance.now();
      e.preventDefault();
    }
  }, [dot, onDotPlace, onRotationChange, chartToUV]);

  const handleMouseUp = useCallback(() => {
    dragRef.current.active = false;
    if (dotDragRef.current.active) {
      dotDragRef.current.active = false;
      setIsDraggingDot(false);
    }
  }, []);

  // --- Click to place dot ---
  const handleClick = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // Chart click (right panel)
    if (mx >= chartX && mx <= chartX + chartW) {
      const uv = chartToUV(mx, my);
      if (uv) {
        onDotPlace({ u: uv.u, v: uv.v });
        onTeachingText("Cut a Klein bottle in half \u2014 each piece, with its edge identifications, forms a M\u00F6bius band.");
        return;
      }
    }

    // 3D view click (left panel)
    if (mx < leftW) {
      if (dragRef.current.startX !== undefined) {
        const dx = Math.abs(e.clientX - dragRef.current.startX);
        const dy = Math.abs(e.clientY - dragRef.current.startY);
        if (dx > 3 || dy > 3) return;
      }
      let best = null;
      let bestDist = 20;
      for (let i = 0; i <= 16; i++) {
        for (let j = 0; j <= 12; j++) {
          const u = (i / 16) * TWO_PI;
          const v = (j / 12) * TWO_PI;
          const p = projectToSVG(u, v);
          const dist = Math.hypot(p.x - mx, p.y - my);
          if (dist < bestDist) {
            bestDist = dist;
            best = { u, v };
          }
        }
      }
      if (best) {
        onDotPlace(best);
        onTeachingText("Cut a Klein bottle in half \u2014 each piece, with its edge identifications, forms a M\u00F6bius band.");
      }
    }
  }, [leftW, chartX, chartW, projectToSVG, chartToUV, onDotPlace, onTeachingText]);

  // --- Dot drag start ---
  const handleDotDragStart = useCallback((e) => {
    dotDragRef.current.active = true;
    setIsDraggingDot(true);
    interactTimeRef.current = performance.now();
    e.stopPropagation();
    e.preventDefault();
  }, []);

  // --- Render wireframe lines (depth-sorted, colored by v) ---
  const renderedWireframe = useMemo(() => {
    const allLines = [];

    // u-lines (constant u): span v from 0 to 2π
    wireframe.uLines.forEach((line, i) => {
      const pathD = wireframeToPath(line, rotation.x, rotation.y, perspD, scale3d, cx3d, cy3d);
      const mid = Math.floor(line.length / 2);
      const [, , rz] = rotate3D(line[mid][0], line[mid][1], line[mid][2], rotation.x, rotation.y);

      // Split into amber (first half, v < π) and cyan (second half, v ≥ π)
      const halfIdx = Math.floor(line.length / 2);
      const amberHalf = line.slice(0, halfIdx + 1);
      const cyanHalf = line.slice(halfIdx);

      const amberPath = wireframeToPath(amberHalf, rotation.x, rotation.y, perspD, scale3d, cx3d, cy3d);
      const cyanPath = wireframeToPath(cyanHalf, rotation.x, rotation.y, perspD, scale3d, cx3d, cy3d);

      allLines.push({
        key: `ua${i}`,
        pathD: amberPath,
        depth: rz,
        isU: true,
        color: COLORS.amber,
      });
      allLines.push({
        key: `uc${i}`,
        pathD: cyanPath,
        depth: rz,
        isU: true,
        color: COLORS.cyan,
      });
    });

    // v-lines (constant v): color based on v value
    wireframe.vLines.forEach((line, j) => {
      const v = (j / 12) * TWO_PI;
      const pathD = wireframeToPath(line, rotation.x, rotation.y, perspD, scale3d, cx3d, cy3d);
      const mid = Math.floor(line.length / 2);
      const [, , rz] = rotate3D(line[mid][0], line[mid][1], line[mid][2], rotation.x, rotation.y);

      allLines.push({
        key: `v${j}`,
        pathD,
        depth: rz,
        isU: false,
        color: v < PI ? COLORS.amber : COLORS.cyan,
      });
    });

    allLines.sort((a, b) => b.depth - a.depth);
    return allLines;
  }, [wireframe, rotation.x, rotation.y, cx3d, cy3d, scale3d, perspD]);

  // --- Cut line path ---
  const cutLinePath = useMemo(() => {
    return wireframeToPath(cutLine3D, rotation.x, rotation.y, perspD, scale3d, cx3d, cy3d);
  }, [cutLine3D, rotation.x, rotation.y, cx3d, cy3d, scale3d, perspD]);

  // --- Dot positions ---
  let dot3D = null;
  let dotChartPos = null;
  if (dot) {
    dot3D = projectToSVG(dot.u, dot.v);
    dotChartPos = uvToChart(dot.u, dot.v);
  }

  // --- Edge arrows ---
  const edgeArrows = useMemo(() => {
    const arrows = [];
    const arrowSize = 8;
    const bigArrowSize = 10;

    // Left/right edges of Half A: amber arrows (normal wrap)
    for (let i = 1; i <= 2; i++) {
      const ay = chartAY + (i / 3) * halfH;
      arrows.push(
        <polygon key={`la${i}`} points={`${chartX - arrowSize},${ay - arrowSize / 2} ${chartX},${ay} ${chartX - arrowSize},${ay + arrowSize / 2}`} fill={COLORS.amber} opacity={0.85} />
      );
      arrows.push(
        <polygon key={`ra${i}`} points={`${chartX + chartW},${ay - arrowSize / 2} ${chartX + chartW + arrowSize},${ay} ${chartX + chartW},${ay + arrowSize / 2}`} fill={COLORS.amber} opacity={0.85} />
      );
    }

    // Left/right edges of Half B: amber arrows (normal wrap)
    for (let i = 1; i <= 2; i++) {
      const ay = chartBY + (i / 3) * halfH;
      arrows.push(
        <polygon key={`lb${i}`} points={`${chartX - arrowSize},${ay - arrowSize / 2} ${chartX},${ay} ${chartX - arrowSize},${ay + arrowSize / 2}`} fill={COLORS.amber} opacity={0.85} />
      );
      arrows.push(
        <polygon key={`rb${i}`} points={`${chartX + chartW},${ay - arrowSize / 2} ${chartX + chartW + arrowSize},${ay} ${chartX + chartW},${ay + arrowSize / 2}`} fill={COLORS.amber} opacity={0.85} />
      );
    }

    // Top edge of Half A (v=0): pink-outlined arrows (Klein twist connection)
    for (let i = 1; i <= 3; i++) {
      const ax = chartX + (i / 4) * chartW;
      arrows.push(
        <g key={`topA${i}`}>
          <polygon points={`${ax - bigArrowSize / 2},${chartAY} ${ax},${chartAY - bigArrowSize} ${ax + bigArrowSize / 2},${chartAY}`} fill={COLORS.cyan} opacity={0.7} />
          <polygon points={`${ax - bigArrowSize / 2},${chartAY} ${ax},${chartAY - bigArrowSize} ${ax + bigArrowSize / 2},${chartAY}`} fill="none" stroke={COLORS.pink} strokeWidth={1.5} opacity={0.8} />
        </g>
      );
    }

    // Bottom edge of Half B (v=2π): pink-outlined arrows (Klein twist connection)
    const botBY = chartBY + halfH;
    for (let i = 1; i <= 3; i++) {
      const ax = chartX + (i / 4) * chartW;
      arrows.push(
        <g key={`botB${i}`}>
          <polygon points={`${ax - bigArrowSize / 2},${botBY} ${ax},${botBY + bigArrowSize} ${ax + bigArrowSize / 2},${botBY}`} fill={COLORS.cyan} opacity={0.7} />
          <polygon points={`${ax - bigArrowSize / 2},${botBY} ${ax},${botBY + bigArrowSize} ${ax + bigArrowSize / 2},${botBY}`} fill="none" stroke={COLORS.pink} strokeWidth={1.5} opacity={0.8} />
        </g>
      );
    }

    return arrows;
  }, [chartX, chartAY, chartBY, chartW, halfH]);

  return (
    <svg
      width={width}
      height={height}
      style={{ cursor: dragRef.current.active ? 'grabbing' : 'default' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={handleClick}
    >
      {/* ===== LEFT PANEL: Klein Bottle 3D Wireframe (cut coloring) ===== */}
      <rect
        x={0} y={0} width={leftW} height={height}
        fill="transparent"
        aria-label="Klein bottle 3D view (cut) - click to place dot, drag to rotate"
        style={{ cursor: dragRef.current.active ? 'grabbing' : 'grab' }}
      />

      {/* Panel title */}
      <text x={cx3d} y={22} textAnchor="middle" fill={COLORS.muted} fontFamily={FONTS.body} fontSize={12} fontWeight={700}>
        KLEIN BOTTLE (CUT)
      </text>

      {/* Wireframe lines (depth-sorted, colored by half) */}
      {renderedWireframe.map(({ key, pathD, depth, isU, color }) => {
        const depthNorm = (depth + 3) / 6;
        const baseOpacity = isU ? WIREFRAME.longitudeOpacity : WIREFRAME.latitudeOpacity;
        const opacity = baseOpacity * (0.3 + 0.7 * (1 - clamp(depthNorm, 0, 1)));
        const strokeW = isU ? WIREFRAME.longitudeWidth : WIREFRAME.latitudeWidth;
        return (
          <path key={key} d={pathD} fill="none" stroke={color} strokeWidth={strokeW} opacity={opacity} />
        );
      })}

      {/* Cut line at v = π (pink dashed) */}
      <path
        d={cutLinePath}
        fill="none"
        stroke={COLORS.pink}
        strokeWidth={2}
        strokeDasharray="6,4"
        opacity={0.9}
      />

      {/* Rainbow path dots on 3D */}
      {pathDots.map((pd, i) => {
        const p = projectToSVG(pd.u, pd.v);
        return <circle key={`pk${i}`} cx={p.x} cy={p.y} r={2} fill={pd.color} opacity={0.85} />;
      })}
      {path.map((wp, i) => {
        const p = projectToSVG(wp.u, wp.v);
        return <circle key={`wpk${i}`} cx={p.x} cy={p.y} r={4.5} fill={rainbowColor(i, path.length)} stroke="#fff" strokeWidth={1.5} />;
      })}

      {/* 3D dot */}
      {dot && dot3D && (
        <MappedDot cx={dot3D.x} cy={dot3D.y} color={dot.v < PI ? COLORS.amber : COLORS.cyan} r={6} animate={!isDraggingDot} />
      )}

      {/* ===== RIGHT PANEL: Two Chart Halves ===== */}

      {/* Half A (v ∈ [0, π]) — amber */}
      <ChartPanel x={chartX} y={chartAY} width={chartW} height={halfH} label="Half A — v ∈ [0, π]" uSteps={16} vSteps={6}>
        {/* Amber tint overlay */}
        <rect x={chartX} y={chartAY} width={chartW} height={halfH} fill={COLORS.amber} opacity={0.04} rx={8} ry={8} />

        {/* Rainbow path dots for Half A */}
        {pathDots.filter(pd => pd.v < PI).map((pd, i) => {
          const pos = uvToChart(pd.u, pd.v);
          return <circle key={`pka${i}`} cx={pos.x} cy={pos.y} r={2} fill={pd.color} opacity={0.85} />;
        })}
        {path.filter(wp => wp.v < PI).map((wp, i) => {
          const pos = uvToChart(wp.u, wp.v);
          return <circle key={`wpka${i}`} cx={pos.x} cy={pos.y} r={4.5} fill={rainbowColor(path.indexOf(wp), path.length)} stroke="#fff" strokeWidth={1.5} />;
        })}
      </ChartPanel>

      {/* Cut line between the two halves (pink dashed) */}
      <line
        x1={chartX} y1={chartAY + halfH + chartGap / 2}
        x2={chartX + chartW} y2={chartAY + halfH + chartGap / 2}
        stroke={COLORS.pink}
        strokeWidth={2}
        strokeDasharray="6,4"
        opacity={0.9}
      />
      <text
        x={chartX + chartW / 2}
        y={chartAY + halfH + chartGap / 2 - 6}
        textAnchor="middle"
        fill={COLORS.pink}
        fontFamily={FONTS.mono}
        fontSize={10}
        fontWeight={700}
      >
        cut (v = π)
      </text>

      {/* Bottom of Half A: pink dashed boundary */}
      <line
        x1={chartX} y1={chartAY + halfH}
        x2={chartX + chartW} y2={chartAY + halfH}
        stroke={COLORS.pink}
        strokeWidth={1.5}
        strokeDasharray="4,3"
        opacity={0.7}
      />

      {/* Top of Half B: pink dashed boundary */}
      <line
        x1={chartX} y1={chartBY}
        x2={chartX + chartW} y2={chartBY}
        stroke={COLORS.pink}
        strokeWidth={1.5}
        strokeDasharray="4,3"
        opacity={0.7}
      />

      {/* Half B (v ∈ [π, 2π]) — cyan */}
      <ChartPanel x={chartX} y={chartBY} width={chartW} height={halfH} label="Half B — v ∈ [π, 2π]" uSteps={16} vSteps={6}>
        {/* Cyan tint overlay */}
        <rect x={chartX} y={chartBY} width={chartW} height={halfH} fill={COLORS.cyan} opacity={0.04} rx={8} ry={8} />

        {/* Rainbow path dots for Half B */}
        {pathDots.filter(pd => pd.v >= PI).map((pd, i) => {
          const pos = uvToChart(pd.u, pd.v);
          return <circle key={`pkb${i}`} cx={pos.x} cy={pos.y} r={2} fill={pd.color} opacity={0.85} />;
        })}
        {path.filter(wp => wp.v >= PI).map((wp, i) => {
          const pos = uvToChart(wp.u, wp.v);
          return <circle key={`wpkb${i}`} cx={pos.x} cy={pos.y} r={4.5} fill={rainbowColor(path.indexOf(wp), path.length)} stroke="#fff" strokeWidth={1.5} />;
        })}
      </ChartPanel>

      {/* Edge arrows */}
      {edgeArrows}

      {/* Axis labels for Half A */}
      <text x={chartX + chartW / 2} y={chartAY + halfH + 14} textAnchor="middle" fill={COLORS.muted} fontFamily={FONTS.mono} fontSize={9}>
        {"u \u2208 [0, 2\u03c0)"}
      </text>
      <text x={chartX - 16} y={chartAY + halfH / 2} textAnchor="middle" fill={COLORS.muted} fontFamily={FONTS.mono} fontSize={9} transform={`rotate(-90, ${chartX - 16}, ${chartAY + halfH / 2})`}>
        {"v \u2208 [0, \u03c0]"}
      </text>

      {/* Axis labels for Half B */}
      <text x={chartX + chartW / 2} y={chartBY + halfH + 14} textAnchor="middle" fill={COLORS.muted} fontFamily={FONTS.mono} fontSize={9}>
        {"u \u2208 [0, 2\u03c0)"}
      </text>
      <text x={chartX - 16} y={chartBY + halfH / 2} textAnchor="middle" fill={COLORS.muted} fontFamily={FONTS.mono} fontSize={9} transform={`rotate(-90, ${chartX - 16}, ${chartBY + halfH / 2})`}>
        {"v \u2208 [\u03c0, 2\u03c0]"}
      </text>

      {/* Annotation */}
      <text
        x={chartX + chartW / 2}
        y={chartBY + halfH + 32}
        textAnchor="middle"
        fill={COLORS.muted}
        fontFamily={FONTS.body}
        fontSize={11}
        fontStyle="italic"
      >
        {"Each half + its edge identifications = a M\u00F6bius band"}
      </text>

      {/* Chart dot (draggable) */}
      {dot && dotChartPos && (
        <g
          onMouseDown={handleDotDragStart}
          style={{ cursor: isDraggingDot ? 'grabbing' : 'grab' }}
          role="button"
          aria-label="Drag dot to explore Klein bottle cut decomposition"
        >
          <circle cx={dotChartPos.x} cy={dotChartPos.y} r={18} fill="transparent" />
          <MappedDot
            cx={dotChartPos.x}
            cy={dotChartPos.y}
            color={dot.v < PI ? COLORS.amber : COLORS.cyan}
            r={7}
            animate={!isDraggingDot}
            label={`(${(dot.u / PI).toFixed(1)}\u03c0, ${(dot.v / PI).toFixed(1)}\u03c0)`}
          />
        </g>
      )}
    </svg>
  );
}
