import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { COLORS, FONTS, LAYOUT, WIREFRAME, ANIMATION } from '../constants';
import { rotate3D, project3D, parametricMobiusBand, generateWireframe, wireframeToPath, normalizeAngle, clamp } from '../mathUtils';
import MappedDot from './shared/MappedDot';
import ChartPanel from './shared/ChartPanel';
import { interpolatePath, rainbowColor } from '../rainbowPath';

const TWO_PI = 2 * Math.PI;
const PI = Math.PI;
const MAJOR_R = 1.0;
const HALF_W = 0.4;
const U_LINES = 16;
const V_LINES = 8;
const SCALE = 120;
const PERSP_D = WIREFRAME.perspectiveDistance;

export default function MobiusBandManifold({ dot, onDotPlace, rotation, onRotationChange, width, height, onTeachingText, path = [] }) {
  const [isDraggingDot, setIsDraggingDot] = useState(false);
  const dragRef = useRef({ active: false, startX: 0, startY: 0, startRot: { x: 0, y: 0 } });
  const dotDragRef = useRef({ active: false });
  const animRef = useRef(null);
  const lastTimeRef = useRef(null);
  const interactTimeRef = useRef(0);
  const svgRef = useRef(null);

  // Layout
  const leftW = width * LAYOUT.leftPanelWidth;
  const rightW = width * LAYOUT.rightPanelWidth;
  const cx3d = leftW / 2;
  const cy3d = height / 2;

  // Chart rectangle
  const chartPad = 40;
  const chartX = leftW + chartPad;
  const chartY = chartPad;
  const chartW = rightW - chartPad * 2;
  const chartH = height - chartPad * 2;

  // Wireframe
  const wireframe = useMemo(() => {
    return generateWireframe(
      (u, v) => parametricMobiusBand(u, v, MAJOR_R, HALF_W),
      U_LINES, V_LINES, 0, TWO_PI, -1, 1
    );
  }, []);

  // Rainbow path
  const pathDots = useMemo(() => interpolatePath(path, TWO_PI, null), [path]);

  // Teaching text
  useEffect(() => {
    if (!onTeachingText) return;
    if (!dot) {
      onTeachingText("A M\u00F6bius band is a rectangle with one pair of edges glued with a twist. Drag the dot to see the flip.");
    }
  }, [dot, onTeachingText]);

  // Auto-rotation
  useEffect(() => {
    const animate = (time) => {
      if (lastTimeRef.current === null) lastTimeRef.current = time;
      const dt = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      const sinceInteract = time - interactTimeRef.current;
      if (sinceInteract > ANIMATION.autoRotateResumeDelay && !dragRef.current.active && !dotDragRef.current.active) {
        onRotationChange({ x: rotation.x, y: rotation.y + ANIMATION.autoRotateSpeed * dt });
      }
      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [rotation, onRotationChange]);

  // Helper: project (u,v) to SVG screen coords
  const projectToSVG = useCallback((u, v) => {
    const pt = parametricMobiusBand(u, v, MAJOR_R, HALF_W);
    const [rx, ry, rz] = rotate3D(pt.x, pt.y, pt.z, rotation.x, rotation.y);
    const p = project3D(rx, ry, rz, PERSP_D);
    return { x: cx3d + p.x * SCALE, y: cy3d - p.y * SCALE, depth: p.depth };
  }, [rotation.x, rotation.y, cx3d, cy3d]);

  // Helper: chart UV to pixel
  const uvToChart = useCallback((u, v) => {
    return {
      x: chartX + (u / TWO_PI) * chartW,
      y: chartY + ((1 - v) / 2) * chartH, // v=1 at top, v=-1 at bottom
    };
  }, [chartX, chartY, chartW, chartH]);

  // Helper: pixel to chart UV
  const chartToUV = useCallback((px, py) => {
    const u = ((px - chartX) / chartW) * TWO_PI;
    const v = 1 - 2 * ((py - chartY) / chartH);
    return { u, v };
  }, [chartX, chartY, chartW, chartH]);

  // Möbius wrapping: going past u=2π wraps around and flips v
  const wrapMobius = useCallback((u, v) => {
    let wu = normalizeAngle(u);
    let wv = v;
    let flipped = false;

    // If v goes out of [-1, 1], wrap u by π and flip v
    if (wv > 1) {
      wv = 2 - wv;
      wu = normalizeAngle(wu + PI);
      flipped = true;
    }
    if (wv < -1) {
      wv = -2 - wv;
      wu = normalizeAngle(wu + PI);
      flipped = true;
    }

    wv = clamp(wv, -1, 1);
    return { u: wu, v: wv, flipped };
  }, []);

  // Rotation drag
  const handleMouseDown = useCallback((e) => {
    const rect = svgRef.current.getBoundingClientRect();
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
      const rect = svgRef.current.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const raw = chartToUV(mx, my);
      const wrapped = wrapMobius(raw.u, raw.v);
      if (wrapped.flipped) {
        onTeachingText("The dot flipped sides \u2014 the M\u00F6bius band has only one side!");
      }
      onDotPlace({ u: wrapped.u, v: wrapped.v });
      interactTimeRef.current = performance.now();
      e.preventDefault();
    }
  }, [dot, onDotPlace, onRotationChange, chartToUV, wrapMobius, onTeachingText]);

  const handleMouseUp = useCallback(() => {
    dragRef.current.active = false;
    if (dotDragRef.current.active) {
      dotDragRef.current.active = false;
      setIsDraggingDot(false);
    }
  }, []);

  // Click to place dot
  const handleClick = useCallback((e) => {
    const rect = svgRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // Chart click
    if (mx >= chartX && mx <= chartX + chartW && my >= chartY && my <= chartY + chartH) {
      const raw = chartToUV(mx, my);
      const wrapped = wrapMobius(raw.u, raw.v);
      onDotPlace({ u: wrapped.u, v: wrapped.v });
      onTeachingText("A M\u00F6bius band is a rectangle with one pair of edges glued with a twist. Drag the dot to see the flip.");
      return;
    }

    // 3D click
    if (mx < leftW) {
      if (dragRef.current.startX !== undefined) {
        const dx = Math.abs(e.clientX - dragRef.current.startX);
        const dy = Math.abs(e.clientY - dragRef.current.startY);
        if (dx > 3 || dy > 3) return;
      }
      let best = null;
      let bestDist = 20;
      for (let i = 0; i <= U_LINES; i++) {
        for (let j = 0; j <= V_LINES; j++) {
          const u = (i / U_LINES) * TWO_PI;
          const v = -1 + (2 * j) / V_LINES;
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
        onTeachingText("A M\u00F6bius band is a rectangle with one pair of edges glued with a twist. Drag the dot to see the flip.");
      }
    }
  }, [leftW, chartX, chartY, chartW, chartH, projectToSVG, chartToUV, wrapMobius, onDotPlace, onTeachingText]);

  // Dot drag start
  const handleDotDragStart = useCallback((e) => {
    dotDragRef.current.active = true;
    setIsDraggingDot(true);
    interactTimeRef.current = performance.now();
    e.stopPropagation();
    e.preventDefault();
  }, []);

  // Render wireframe (depth-sorted)
  const renderedWireframe = useMemo(() => {
    const allLines = [];
    wireframe.uLines.forEach((line, i) => {
      const mid = Math.floor(line.length / 2);
      const [, , rz] = rotate3D(line[mid][0], line[mid][1], line[mid][2], rotation.x, rotation.y);
      allLines.push({
        key: `u${i}`,
        pathD: wireframeToPath(line, rotation.x, rotation.y, PERSP_D, SCALE, cx3d, cy3d),
        depth: rz, isU: true,
      });
    });
    wireframe.vLines.forEach((line, i) => {
      const mid = Math.floor(line.length / 2);
      const [, , rz] = rotate3D(line[mid][0], line[mid][1], line[mid][2], rotation.x, rotation.y);
      allLines.push({
        key: `v${i}`,
        pathD: wireframeToPath(line, rotation.x, rotation.y, PERSP_D, SCALE, cx3d, cy3d),
        depth: rz, isU: false,
      });
    });
    allLines.sort((a, b) => b.depth - a.depth);
    return allLines;
  }, [wireframe, rotation.x, rotation.y, cx3d, cy3d]);

  // Edge arrows for chart
  const edgeArrows = useMemo(() => {
    const arrows = [];
    const arrowSize = 8;

    // Left edge: arrows pointing RIGHT (normal wrap, like cylinder)
    for (let i = 1; i <= 3; i++) {
      const ay = chartY + (i / 4) * chartH;
      arrows.push(
        <polygon key={`left-${i}`}
          points={`${chartX - arrowSize},${ay - arrowSize / 2} ${chartX},${ay} ${chartX - arrowSize},${ay + arrowSize / 2}`}
          fill={COLORS.amber} opacity={0.85} />
      );
    }

    // Right edge: arrows pointing RIGHT (normal wrap)
    const rX = chartX + chartW;
    for (let i = 1; i <= 3; i++) {
      const ay = chartY + (i / 4) * chartH;
      arrows.push(
        <polygon key={`right-${i}`}
          points={`${rX},${ay - arrowSize / 2} ${rX + arrowSize},${ay} ${rX},${ay + arrowSize / 2}`}
          fill={COLORS.amber} opacity={0.85} />
      );
    }

    // Top edge: arrows pointing UP with twist indicator (pink outline)
    const bigArrow = 10;
    for (let i = 1; i <= 3; i++) {
      const ax = chartX + (i / 4) * chartW;
      arrows.push(
        <g key={`top-${i}`}>
          <polygon
            points={`${ax - bigArrow / 2},${chartY} ${ax},${chartY - bigArrow} ${ax + bigArrow / 2},${chartY}`}
            fill={COLORS.cyan} opacity={0.85} />
          <polygon
            points={`${ax - bigArrow / 2},${chartY} ${ax},${chartY - bigArrow} ${ax + bigArrow / 2},${chartY}`}
            fill="none" stroke={COLORS.pink} strokeWidth={1.5} opacity={0.7} />
        </g>
      );
    }

    // Bottom edge: arrows pointing DOWN REVERSED (twist — pink outline)
    const botY = chartY + chartH;
    for (let i = 1; i <= 3; i++) {
      const ax = chartX + (i / 4) * chartW;
      arrows.push(
        <g key={`bot-${i}`}>
          <polygon
            points={`${ax - bigArrow / 2},${botY} ${ax},${botY + bigArrow} ${ax + bigArrow / 2},${botY}`}
            fill={COLORS.cyan} opacity={0.85} />
          <polygon
            points={`${ax - bigArrow / 2},${botY} ${ax},${botY + bigArrow} ${ax + bigArrow / 2},${botY}`}
            fill="none" stroke={COLORS.pink} strokeWidth={1.5} opacity={0.7} />
        </g>
      );
    }

    return arrows;
  }, [chartX, chartY, chartW, chartH]);

  // Dot positions
  let dot3D = null;
  let dotChartPos = null;
  if (dot) {
    dot3D = projectToSVG(dot.u, dot.v);
    dotChartPos = uvToChart(dot.u, dot.v);
  }

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      style={{ cursor: dragRef.current.active ? 'grabbing' : 'default' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={handleClick}
    >
      {/* ===== LEFT PANEL: 3D Möbius Band ===== */}
      <rect x={0} y={0} width={leftW} height={height} fill="transparent"
        aria-label="M\u00F6bius band 3D view" style={{ cursor: dragRef.current.active ? 'grabbing' : 'grab' }} />

      <text x={cx3d} y={22} textAnchor="middle" fill={COLORS.muted} fontFamily={FONTS.body} fontSize={12} fontWeight={700}>
        M{'\u00D6'}BIUS BAND
      </text>

      {/* Wireframe */}
      {renderedWireframe.map(({ key, pathD, depth, isU }) => {
        const depthNorm = (depth + 1.5) / 3;
        const baseOpacity = isU ? WIREFRAME.longitudeOpacity : WIREFRAME.latitudeOpacity;
        const opacity = baseOpacity * (0.3 + 0.7 * (1 - clamp(depthNorm, 0, 1)));
        const strokeW = isU ? WIREFRAME.longitudeWidth : WIREFRAME.latitudeWidth;
        return <path key={key} d={pathD} fill="none" stroke={COLORS.primary} strokeWidth={strokeW} opacity={opacity} />;
      })}

      {/* Rainbow path on 3D */}
      {pathDots.map((pd, i) => {
        const p = projectToSVG(pd.u, pd.v);
        return <circle key={`pm${i}`} cx={p.x} cy={p.y} r={2} fill={pd.color} opacity={0.85} />;
      })}
      {path.map((wp, i) => {
        const p = projectToSVG(wp.u, wp.v);
        return <circle key={`wpm${i}`} cx={p.x} cy={p.y} r={4.5} fill={rainbowColor(i, path.length)} stroke="#fff" strokeWidth={1.5} />;
      })}

      {/* 3D dot */}
      {dot && dot3D && (
        <MappedDot cx={dot3D.x} cy={dot3D.y} color={COLORS.amber} r={6} animate={!isDraggingDot} />
      )}

      {/* Divider */}
      <line x1={leftW} y1={0} x2={leftW} y2={height} stroke={COLORS.grid} strokeWidth={1} opacity={0.4} />

      {/* ===== RIGHT PANEL: Chart ===== */}
      <ChartPanel x={chartX} y={chartY} width={chartW} height={chartH}
        label={`Chart \u2014 u \u2208 [0, 2\u03C0), v \u2208 [-1, 1]`}
        uSteps={U_LINES} vSteps={V_LINES}>
        {/* Rainbow path on chart */}
        {pathDots.map((pd, i) => {
          const pos = uvToChart(pd.u, pd.v);
          return <circle key={`pmc${i}`} cx={pos.x} cy={pos.y} r={2} fill={pd.color} opacity={0.85} />;
        })}
        {path.map((wp, i) => {
          const pos = uvToChart(wp.u, wp.v);
          return <circle key={`wpmc${i}`} cx={pos.x} cy={pos.y} r={4.5} fill={rainbowColor(i, path.length)} stroke="#fff" strokeWidth={1.5} />;
        })}
      </ChartPanel>

      {/* Axis labels */}
      <text x={chartX + chartW / 2} y={chartY + chartH + 22} textAnchor="middle" fill={COLORS.muted} fontFamily={FONTS.mono} fontSize={10}>
        {"u \u2208 [0, 2\u03C0)"}
      </text>
      <text x={chartX - 20} y={chartY + chartH / 2} textAnchor="middle" fill={COLORS.muted} fontFamily={FONTS.mono} fontSize={10}
        transform={`rotate(-90, ${chartX - 20}, ${chartY + chartH / 2})`}>
        {"v \u2208 [-1, 1]"}
      </text>

      {/* Edge arrows */}
      {edgeArrows}

      {/* Twist annotation */}
      <text x={chartX + chartW / 2} y={chartY - 18} textAnchor="middle" fill={COLORS.pink} fontFamily={FONTS.body} fontSize={12} fontWeight={600}>
        {"The twist \u2014 top and bottom edges are reversed"}
      </text>

      {/* Chart dot (draggable) */}
      {dot && dotChartPos && (
        <g onMouseDown={handleDotDragStart} style={{ cursor: isDraggingDot ? 'grabbing' : 'grab' }}
          role="button" aria-label="Drag dot to explore M\u00F6bius band identification">
          <circle cx={dotChartPos.x} cy={dotChartPos.y} r={18} fill="transparent" />
          <MappedDot cx={dotChartPos.x} cy={dotChartPos.y} color={COLORS.amber} r={7} animate={!isDraggingDot}
            label={`(${(dot.u / PI).toFixed(1)}\u03C0, ${dot.v.toFixed(2)})`} />
        </g>
      )}
    </svg>
  );
}
