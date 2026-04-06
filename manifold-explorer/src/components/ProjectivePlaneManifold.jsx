import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { COLORS, FONTS, LAYOUT, WIREFRAME, ANIMATION } from '../constants';
import { rotate3D, project3D, parametricCrossCap, generateWireframe, wireframeToPath, clamp } from '../mathUtils';
import MappedDot from './shared/MappedDot';
import ChartPanel from './shared/ChartPanel';
import { interpolatePath, rainbowColor } from '../rainbowPath';

const PI = Math.PI;
const SCALE = 220;
const PERSP_D = WIREFRAME.perspectiveDistance;
const U_LINES = 12;
const V_LINES = 12;

export default function ProjectivePlaneManifold({ dot, onDotPlace, rotation, onRotationChange, width, height, onTeachingText, path = [] }) {
  const [isDraggingDot, setIsDraggingDot] = useState(false);
  const dragRef = useRef({ active: false, startX: 0, startY: 0, startRot: { x: 0, y: 0 } });
  const dotDragRef = useRef({ active: false });
  const animRef = useRef(null);
  const lastTimeRef = useRef(null);
  const interactTimeRef = useRef(0);

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
    return generateWireframe(parametricCrossCap, U_LINES, V_LINES, 0, PI, 0, PI);
  }, []);

  // Rainbow path (u and v are NOT periodic)
  const pathDots = useMemo(() => interpolatePath(path, null, null), [path]);

  // Default teaching text
  useEffect(() => {
    onTeachingText("The projective plane \u2014 a sphere where opposite points are the same. It can't live in 3D without crossing itself.");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-rotation
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

  // Project (u,v) to SVG coords
  const projectToSVG = useCallback((u, v) => {
    const pt = parametricCrossCap(u, v);
    const [rx, ry, rz] = rotate3D(pt.x, pt.y, pt.z, rotation.x, rotation.y);
    const p = project3D(rx, ry, rz, PERSP_D);
    return { x: cx3d + p.x * SCALE, y: cy3d - p.y * SCALE, depth: p.depth };
  }, [rotation.x, rotation.y, cx3d, cy3d]);

  // Chart UV to pixel
  const uvToChart = useCallback((u, v) => {
    return {
      x: chartX + (u / PI) * chartW,
      y: chartY + (1 - v / PI) * chartH,
    };
  }, [chartX, chartY, chartW, chartH]);

  // Pixel to chart UV
  const chartToUV = useCallback((px, py) => {
    const u = clamp(((px - chartX) / chartW) * PI, 0, PI);
    const v = clamp((1 - (py - chartY) / chartH) * PI, 0, PI);
    return { u, v };
  }, [chartX, chartY, chartW, chartH]);

  // Check if near self-intersection (the cross-cap has self-intersections)
  const isNearSelfIntersection = useCallback((u, v) => {
    const pt = parametricCrossCap(u, v);
    return Math.abs(pt.x) < 0.05 && Math.abs(pt.y) < 0.05 && Math.abs(pt.z) < 0.05;
  }, []);

  // Rotation drag handlers
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
      const { u, v } = chartToUV(mx, my);
      onDotPlace({ u, v });
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

  // Click to place dot
  const handleClick = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // Chart click
    if (mx >= chartX && mx <= chartX + chartW && my >= chartY && my <= chartY + chartH) {
      const { u, v } = chartToUV(mx, my);
      onDotPlace({ u, v });
      if (isNearSelfIntersection(u, v)) {
        onTeachingText("Here the surface crosses itself \u2014 unavoidable when RP\u00b2 lives in 3D.");
      } else {
        onTeachingText("The projective plane \u2014 a sphere where opposite points are the same. It can't live in 3D without crossing itself.");
      }
      return;
    }

    // 3D view click
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
          const u = (i / U_LINES) * PI;
          const v = (j / V_LINES) * PI;
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
        if (isNearSelfIntersection(best.u, best.v)) {
          onTeachingText("Here the surface crosses itself \u2014 unavoidable when RP\u00b2 lives in 3D.");
        } else {
          onTeachingText("The projective plane \u2014 a sphere where opposite points are the same. It can't live in 3D without crossing itself.");
        }
      }
    }
  }, [leftW, chartX, chartY, chartW, chartH, projectToSVG, chartToUV, onDotPlace, onTeachingText, isNearSelfIntersection]);

  // Dot drag start
  const handleDotDragStart = useCallback((e) => {
    dotDragRef.current.active = true;
    setIsDraggingDot(true);
    interactTimeRef.current = performance.now();
    e.stopPropagation();
    e.preventDefault();
  }, []);

  // Depth-sorted wireframe
  const renderedWireframe = useMemo(() => {
    const allLines = [];

    wireframe.uLines.forEach((line, i) => {
      const pathD = wireframeToPath(line, rotation.x, rotation.y, PERSP_D, SCALE, cx3d, cy3d);
      const mid = Math.floor(line.length / 2);
      const [, , rz] = rotate3D(line[mid][0], line[mid][1], line[mid][2], rotation.x, rotation.y);
      allLines.push({ key: `u${i}`, pathD, depth: rz, isU: true });
    });

    wireframe.vLines.forEach((line, i) => {
      const pathD = wireframeToPath(line, rotation.x, rotation.y, PERSP_D, SCALE, cx3d, cy3d);
      const mid = Math.floor(line.length / 2);
      const [, , rz] = rotate3D(line[mid][0], line[mid][1], line[mid][2], rotation.x, rotation.y);
      allLines.push({ key: `v${i}`, pathD, depth: rz, isU: false });
    });

    allLines.sort((a, b) => b.depth - a.depth);
    return allLines;
  }, [wireframe, rotation.x, rotation.y, cx3d, cy3d]);

  // Edge arrows for antipodal identification
  const edgeArrows = useMemo(() => {
    const arrows = [];
    const arrowSize = 8;

    // Left edge (u=0): arrows going UP, pink outline
    const leftX = chartX;
    for (let i = 1; i <= 3; i++) {
      const ay = chartY + (i / 4) * chartH;
      arrows.push(
        <g key={`left-${i}`}>
          <polygon
            points={`${leftX - arrowSize / 2},${ay} ${leftX},${ay - arrowSize} ${leftX + arrowSize / 2},${ay}`}
            fill={COLORS.cyan}
            opacity={0.85}
          />
          <polygon
            points={`${leftX - arrowSize / 2},${ay} ${leftX},${ay - arrowSize} ${leftX + arrowSize / 2},${ay}`}
            fill="none"
            stroke={COLORS.pink}
            strokeWidth={1.5}
            opacity={0.7}
          />
        </g>
      );
    }

    // Right edge (u=pi): arrows going DOWN (reversed), pink outline
    const rightX = chartX + chartW;
    for (let i = 1; i <= 3; i++) {
      const ay = chartY + (i / 4) * chartH;
      arrows.push(
        <g key={`right-${i}`}>
          <polygon
            points={`${rightX - arrowSize / 2},${ay} ${rightX},${ay + arrowSize} ${rightX + arrowSize / 2},${ay}`}
            fill={COLORS.cyan}
            opacity={0.85}
          />
          <polygon
            points={`${rightX - arrowSize / 2},${ay} ${rightX},${ay + arrowSize} ${rightX + arrowSize / 2},${ay}`}
            fill="none"
            stroke={COLORS.pink}
            strokeWidth={1.5}
            opacity={0.7}
          />
        </g>
      );
    }

    // Bottom edge (v=0): arrows going LEFT (reversed), pink outline
    const botY = chartY + chartH;
    for (let i = 1; i <= 3; i++) {
      const ax = chartX + (i / 4) * chartW;
      arrows.push(
        <g key={`bot-${i}`}>
          <polygon
            points={`${ax},${botY - arrowSize / 2} ${ax - arrowSize},${botY} ${ax},${botY + arrowSize / 2}`}
            fill={COLORS.cyan}
            opacity={0.85}
          />
          <polygon
            points={`${ax},${botY - arrowSize / 2} ${ax - arrowSize},${botY} ${ax},${botY + arrowSize / 2}`}
            fill="none"
            stroke={COLORS.pink}
            strokeWidth={1.5}
            opacity={0.7}
          />
        </g>
      );
    }

    // Top edge (v=pi): arrows going RIGHT, pink outline
    const topY = chartY;
    for (let i = 1; i <= 3; i++) {
      const ax = chartX + (i / 4) * chartW;
      arrows.push(
        <g key={`top-${i}`}>
          <polygon
            points={`${ax},${topY - arrowSize / 2} ${ax + arrowSize},${topY} ${ax},${topY + arrowSize / 2}`}
            fill={COLORS.cyan}
            opacity={0.85}
          />
          <polygon
            points={`${ax},${topY - arrowSize / 2} ${ax + arrowSize},${topY} ${ax},${topY + arrowSize / 2}`}
            fill="none"
            stroke={COLORS.pink}
            strokeWidth={1.5}
            opacity={0.7}
          />
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
      width={width}
      height={height}
      style={{ cursor: dragRef.current.active ? 'grabbing' : 'default' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={handleClick}
    >
      {/* ===== LEFT PANEL: Cross-Cap 3D Wireframe ===== */}
      <rect
        x={0} y={0} width={leftW} height={height}
        fill="transparent"
        aria-label="Projective plane 3D view - click to place dot, drag to rotate"
        style={{ cursor: dragRef.current.active ? 'grabbing' : 'grab' }}
      />

      {/* Panel title */}
      <text
        x={cx3d} y={22}
        textAnchor="middle"
        fill={COLORS.muted}
        fontFamily={FONTS.body}
        fontSize={12}
        fontWeight={700}
      >
        PROJECTIVE PLANE (RP\u00b2)
      </text>

      {/* Wireframe lines (depth-sorted) */}
      {renderedWireframe.map(({ key, pathD, depth, isU }) => {
        const depthNorm = (depth + 1) / 2;
        const baseOpacity = isU ? WIREFRAME.longitudeOpacity : WIREFRAME.latitudeOpacity;
        const opacity = baseOpacity * (0.3 + 0.7 * (1 - clamp(depthNorm, 0, 1)));
        const strokeW = isU ? WIREFRAME.longitudeWidth : WIREFRAME.latitudeWidth;

        return (
          <path
            key={key}
            d={pathD}
            fill="none"
            stroke={COLORS.primary}
            strokeWidth={strokeW}
            opacity={opacity}
          />
        );
      })}

      {/* Rainbow path dots on 3D view */}
      {pathDots.map((pd, i) => {
        const p = projectToSVG(pd.u, pd.v);
        return <circle key={`pr${i}`} cx={p.x} cy={p.y} r={2} fill={pd.color} opacity={0.85} />;
      })}
      {path.map((wp, i) => {
        const p = projectToSVG(wp.u, wp.v);
        return <circle key={`wpr${i}`} cx={p.x} cy={p.y} r={4.5} fill={rainbowColor(i, path.length)} stroke="#fff" strokeWidth={1.5} />;
      })}

      {/* 3D dot */}
      {dot && dot3D && (
        <MappedDot cx={dot3D.x} cy={dot3D.y} color={COLORS.amber} r={6} animate={!isDraggingDot} />
      )}

      {/* ===== RIGHT PANEL: Parameter Space Chart ===== */}
      <ChartPanel
        x={chartX}
        y={chartY}
        width={chartW}
        height={chartH}
        label="Parameter space (u, v)"
        uSteps={U_LINES}
        vSteps={V_LINES}
      >
        {/* Rainbow path dots on chart */}
        {pathDots.map((pd, i) => {
          const pos = uvToChart(pd.u, pd.v);
          return <circle key={`prc${i}`} cx={pos.x} cy={pos.y} r={2} fill={pd.color} opacity={0.85} />;
        })}
        {path.map((wp, i) => {
          const pos = uvToChart(wp.u, wp.v);
          return <circle key={`wprc${i}`} cx={pos.x} cy={pos.y} r={4.5} fill={rainbowColor(i, path.length)} stroke="#fff" strokeWidth={1.5} />;
        })}
      </ChartPanel>

      {/* Axis labels */}
      <text
        x={chartX + chartW / 2}
        y={chartY + chartH + 20}
        textAnchor="middle"
        fill={COLORS.muted}
        fontFamily={FONTS.mono}
        fontSize={10}
      >
        {"u \u2208 [0, \u03c0]"}
      </text>
      <text
        x={chartX - 20}
        y={chartY + chartH / 2}
        textAnchor="middle"
        fill={COLORS.muted}
        fontFamily={FONTS.mono}
        fontSize={10}
        transform={`rotate(-90, ${chartX - 20}, ${chartY + chartH / 2})`}
      >
        {"v \u2208 [0, \u03c0]"}
      </text>

      {/* Edge arrows (antipodal identification) */}
      {edgeArrows}

      {/* Twist annotation */}
      <text
        x={chartX + chartW / 2}
        y={chartY - 18}
        textAnchor="middle"
        fill={COLORS.pink}
        fontFamily={FONTS.body}
        fontSize={12}
        fontWeight={600}
      >
        {"Antipodal edges identified \u2014 arrows reversed"}
      </text>

      {/* Chart dot (draggable) */}
      {dot && dotChartPos && (
        <g
          onMouseDown={handleDotDragStart}
          style={{ cursor: isDraggingDot ? 'grabbing' : 'grab' }}
          role="button"
          aria-label="Drag dot to explore projective plane"
        >
          <circle cx={dotChartPos.x} cy={dotChartPos.y} r={18} fill="transparent" />
          <MappedDot
            cx={dotChartPos.x}
            cy={dotChartPos.y}
            color={COLORS.amber}
            r={7}
            animate={!isDraggingDot}
            label={`(${(dot.u / PI).toFixed(1)}\u03c0, ${(dot.v / PI).toFixed(1)}\u03c0)`}
          />
        </g>
      )}
    </svg>
  );
}
