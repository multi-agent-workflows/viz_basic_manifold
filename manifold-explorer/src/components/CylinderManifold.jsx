import React, { useMemo, useRef, useCallback, useEffect } from 'react';
import { COLORS, FONTS, WIREFRAME, ANIMATION } from '../constants';
import { rotate3D, project3D, parametricCylinder, generateWireframe, wireframeToPath, normalizeAngle, clamp } from '../mathUtils';
import MappedDot from './shared/MappedDot';
import ChartPanel from './shared/ChartPanel';

const PI = Math.PI;
const TWO_PI = 2 * Math.PI;

export default function CylinderManifold({ dot, onDotPlace, rotation, onRotationChange, width, height, onTeachingText }) {
  const dragRef = useRef({ dragging: false, startX: 0, startY: 0, startRotX: 0, startRotY: 0, moved: false });
  const animRef = useRef({ rafId: null, lastTime: null, autoRotate: true, idleTimer: null });

  const rotX = rotation?.x ?? 0.3;
  const rotY = rotation?.y ?? 0;

  // --- Layout ---
  const leftW = width * 0.55;
  const rightW = width * 0.45;
  const rightX = leftW;
  const cylCx = leftW / 2;
  const cylCy = height / 2;
  const scale = 120;
  const d = WIREFRAME.perspectiveDistance;

  // --- Wireframe generation (memoized on rotation) ---
  const wireframeData = useMemo(() => {
    const wf = generateWireframe(parametricCylinder, 12, 8, 0, TWO_PI, -1, 1);

    const processLines = (lines, isLongitude) => {
      return lines.map((line) => {
        let totalDepth = 0;
        for (const [x, y, z] of line) {
          const [, , rz] = rotate3D(x, y, z, rotX, rotY);
          totalDepth += rz;
        }
        const avgDepth = totalDepth / line.length;
        const pathD = wireframeToPath(line, rotX, rotY, d, scale, cylCx, cylCy);
        return { pathD, avgDepth, isLongitude };
      });
    };

    const longLines = processLines(wf.uLines, true);
    const latLines = processLines(wf.vLines, false);
    const allLines = [...longLines, ...latLines].sort((a, b) => b.avgDepth - a.avgDepth);

    return allLines;
  }, [rotX, rotY, leftW, height]);

  // --- Grid intersection points for hit testing ---
  const gridPoints = useMemo(() => {
    const points = [];
    for (let i = 0; i <= 12; i++) {
      const theta = (TWO_PI * i) / 12;
      for (let j = 0; j <= 8; j++) {
        const h = -1 + (2 * j) / 8;
        const pt = parametricCylinder(theta, h);
        const [rx, ry, rz] = rotate3D(pt.x, pt.y, pt.z, rotX, rotY);
        const proj = project3D(rx, ry, rz, d);
        points.push({
          theta: theta > PI ? theta - TWO_PI : theta,
          thetaRaw: theta,
          h,
          screenX: cylCx + proj.x * scale,
          screenY: cylCy - proj.y * scale,
        });
      }
    }
    return points;
  }, [rotX, rotY, leftW, height]);

  // --- Auto-rotation ---
  useEffect(() => {
    const anim = animRef.current;

    const tick = (time) => {
      if (anim.lastTime === null) anim.lastTime = time;
      const dt = (time - anim.lastTime) / 1000;
      anim.lastTime = time;

      if (anim.autoRotate && !dragRef.current.dragging) {
        const newRotY = (rotation?.y ?? 0) + ANIMATION.autoRotateSpeed * dt;
        onRotationChange({ x: rotation?.x ?? 0.3, y: newRotY });
      }
      anim.rafId = requestAnimationFrame(tick);
    };

    anim.rafId = requestAnimationFrame(tick);
    return () => {
      if (anim.rafId) cancelAnimationFrame(anim.rafId);
      anim.lastTime = null;
    };
  }, [rotation, onRotationChange]);

  // --- Chart layout (must be before onPointerUp which references these) ---
  const chartPad = 16;
  const chartGap = 12;
  const chartAreaX = rightX + chartPad;
  const chartAreaW = rightW - chartPad * 2;
  const chartAreaTop = chartPad + 24;
  const chartAreaH = (height - chartAreaTop - chartPad - chartGap) / 2;
  const chartAY = chartAreaTop;
  const chartBY = chartAreaTop + chartAreaH + chartGap;
  const gapStripW = 4;

  // --- Drag handlers ---
  const onPointerDown = useCallback((e) => {
    const drag = dragRef.current;
    drag.dragging = true;
    drag.moved = false;
    drag.startX = e.clientX;
    drag.startY = e.clientY;
    drag.startRotX = rotX;
    drag.startRotY = rotY;
    animRef.current.autoRotate = false;
    if (animRef.current.idleTimer) clearTimeout(animRef.current.idleTimer);
    e.currentTarget.setPointerCapture(e.pointerId);
  }, [rotX, rotY]);

  const onPointerMove = useCallback((e) => {
    const drag = dragRef.current;
    if (!drag.dragging) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) drag.moved = true;
    const newRotY = drag.startRotY + dx * ANIMATION.rotationSensitivity;
    const newRotX = clamp(drag.startRotX + dy * ANIMATION.rotationSensitivity, -PI / 2, PI / 2);
    onRotationChange({ x: newRotX, y: newRotY });
  }, [onRotationChange]);

  const onPointerUp = useCallback((e) => {
    const drag = dragRef.current;
    const wasDrag = drag.moved;
    drag.dragging = false;

    if (animRef.current.idleTimer) clearTimeout(animRef.current.idleTimer);
    animRef.current.idleTimer = setTimeout(() => {
      animRef.current.autoRotate = true;
    }, ANIMATION.autoRotateResumeDelay);

    if (!wasDrag && onDotPlace) {
      const svg = e.currentTarget;
      const rect = svg.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      if (clickX < leftW) {
        let bestDist = Infinity;
        let bestPoint = null;
        for (const gp of gridPoints) {
          const dx = gp.screenX - clickX;
          const dy = gp.screenY - clickY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < bestDist) {
            bestDist = dist;
            bestPoint = gp;
          }
        }
        if (bestPoint && bestDist < 20) {
          onDotPlace({ u: bestPoint.thetaRaw, v: bestPoint.h });
        }
      } else if (clickX >= chartAreaX && clickX <= chartAreaX + chartAreaW) {
        // Chart A click: theta in (-pi, pi), h in [-1, 1]
        if (clickY >= chartAY && clickY <= chartAY + chartAreaH) {
          const xFrac = (clickX - chartAreaX) / (chartAreaW - gapStripW);
          if (xFrac >= 0 && xFrac <= 1) {
            const theta = xFrac * TWO_PI - PI; // map [0,1] to [-pi, pi]
            const yFrac = (clickY - chartAY) / chartAreaH;
            const h = 1 - 2 * yFrac; // map [0,1] to [1, -1] (y inverted)
            // Convert theta from (-pi, pi) to [0, 2pi) for dot.u
            const u = ((theta % TWO_PI) + TWO_PI) % TWO_PI;
            onDotPlace({ u, v: clamp(h, -1, 1) });
          }
        }
        // Chart B click: theta in (0, 2pi), h in [-1, 1]
        else if (clickY >= chartBY && clickY <= chartBY + chartAreaH) {
          const xFrac = (clickX - chartAreaX - gapStripW) / (chartAreaW - gapStripW);
          if (xFrac >= 0 && xFrac <= 1) {
            const theta = xFrac * TWO_PI; // map [0,1] to [0, 2pi)
            const yFrac = (clickY - chartBY) / chartAreaH;
            const h = 1 - 2 * yFrac;
            onDotPlace({ u: theta, v: clamp(h, -1, 1) });
          }
        }
      }
    }
  }, [gridPoints, onDotPlace, leftW, chartAreaX, chartAreaW, chartAY, chartBY, chartAreaH, gapStripW]);

  // --- Dot on cylinder wireframe ---
  const dotProjection = useMemo(() => {
    if (!dot) return null;
    const pt = parametricCylinder(dot.u, dot.v);
    const [rx, ry, rz] = rotate3D(pt.x, pt.y, pt.z, rotX, rotY);
    const proj = project3D(rx, ry, rz, d);
    return { x: cylCx + proj.x * scale, y: cylCy - proj.y * scale };
  }, [dot, rotX, rotY, leftW, height]);

  // --- Dot mapping to charts ---
  const dotChartA = useMemo(() => {
    if (!dot) return null;
    let theta = dot.u;
    theta = ((theta + PI) % TWO_PI + TWO_PI) % TWO_PI - PI;
    if (Math.abs(Math.abs(theta) - PI) < 0.001) return null;
    const xFrac = (theta + PI) / TWO_PI;
    const yFrac = (dot.v + 1) / 2;
    return {
      x: chartAreaX + xFrac * (chartAreaW - gapStripW),
      y: chartAY + (1 - yFrac) * chartAreaH,
      theta,
      h: dot.v,
    };
  }, [dot, chartAreaX, chartAreaW, chartAY, chartAreaH]);

  const dotChartB = useMemo(() => {
    if (!dot) return null;
    let theta = normalizeAngle(dot.u);
    if (theta < 0.001) return null;
    const xFrac = theta / TWO_PI;
    const yFrac = (dot.v + 1) / 2;
    return {
      x: chartAreaX + gapStripW + xFrac * (chartAreaW - gapStripW),
      y: chartBY + (1 - yFrac) * chartAreaH,
      theta,
      h: dot.v,
    };
  }, [dot, chartAreaX, chartAreaW, chartBY, chartAreaH]);

  // --- Teaching text ---
  useEffect(() => {
    if (!onTeachingText) return;
    if (!dot) {
      onTeachingText("The cylinder wraps in one direction and is flat in the other. Its charts are almost-complete rectangles.");
      return;
    }
    let theta = ((dot.u + PI) % TWO_PI + TWO_PI) % TWO_PI - PI;
    if (Math.abs(Math.abs(theta) - PI) < 0.2) {
      onTeachingText("Right at the seam, you need the second chart.");
    } else {
      onTeachingText("Both charts agree here \u2014 most of the cylinder is covered by both.");
    }
  }, [dot, onTeachingText]);

  // --- Render ---
  return (
    <svg
      width={width}
      height={height}
      style={{ cursor: 'grab', userSelect: 'none' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      aria-label="Cylinder manifold visualization"
    >
      {/* Background fill for left panel */}
      <rect x={0} y={0} width={leftW} height={height} fill={COLORS.background} opacity={WIREFRAME.backgroundFillOpacity} rx={8} />

      {/* Wireframe lines */}
      {wireframeData.map((line, i) => {
        const baseOpacity = line.isLongitude ? WIREFRAME.longitudeOpacity : WIREFRAME.latitudeOpacity;
        const strokeWidth = line.isLongitude ? WIREFRAME.longitudeWidth : WIREFRAME.latitudeWidth;
        const depthFactor = clamp(0.4 + 0.6 * (1 - (line.avgDepth + 1) / 2), 0.15, 1);
        return (
          <path
            key={i}
            d={line.pathD}
            fill="none"
            stroke={COLORS.primary}
            strokeWidth={strokeWidth}
            opacity={baseOpacity * depthFactor}
          />
        );
      })}

      {/* Dot on cylinder */}
      {dotProjection && (
        <MappedDot cx={dotProjection.x} cy={dotProjection.y} color={COLORS.amber} r={6} animate />
      )}

      {/* Vertical divider */}
      <line x1={rightX} y1={0} x2={rightX} y2={height} stroke={COLORS.grid} strokeWidth={1} opacity={0.4} />

      {/* Right panel header */}
      <text
        x={rightX + rightW / 2}
        y={16}
        textAnchor="middle"
        fill={COLORS.muted}
        fontSize={13}
        fontWeight={700}
        fontFamily={FONTS.body}
      >
        Charts
      </text>

      {/* Chart A */}
      <ChartPanel x={chartAreaX} y={chartAY} width={chartAreaW} height={chartAreaH} label="Chart A">
        {/* Amber fill for covered region */}
        <rect
          x={chartAreaX}
          y={chartAY}
          width={chartAreaW - gapStripW}
          height={chartAreaH}
          fill={COLORS.amber}
          opacity={0.04}
          rx={4}
        />
        {/* Overlap highlight (light green) */}
        <rect
          x={chartAreaX}
          y={chartAY}
          width={chartAreaW - gapStripW}
          height={chartAreaH}
          fill={COLORS.lightGreen}
          opacity={0.04}
          rx={4}
        />
        {/* Gap strip on RIGHT edge */}
        <rect
          x={chartAreaX + chartAreaW - gapStripW}
          y={chartAY}
          width={gapStripW}
          height={chartAreaH}
          fill={COLORS.muted}
          opacity={0.25}
        />
        <text
          x={chartAreaX + chartAreaW - gapStripW / 2}
          y={chartAY + chartAreaH / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={COLORS.muted}
          fontSize={8}
          fontFamily={FONTS.mono}
          transform={`rotate(-90, ${chartAreaX + chartAreaW - gapStripW / 2}, ${chartAY + chartAreaH / 2})`}
        >
          gap
        </text>
        {/* Color marker */}
        <rect x={chartAreaX + 4} y={chartAY + 4} width={6} height={6} fill={COLORS.amber} rx={1} />
        {/* Axis labels */}
        <text x={chartAreaX + chartAreaW / 2} y={chartAY + chartAreaH - 4} textAnchor="middle" fill={COLORS.muted} fontSize={9} fontFamily={FONTS.mono} opacity={0.6}>
          {'\u03b8 \u2208 (-\u03c0, \u03c0)'}
        </text>
        <text
          x={chartAreaX + 4}
          y={chartAY + chartAreaH / 2}
          textAnchor="middle"
          fill={COLORS.muted}
          fontSize={9}
          fontFamily={FONTS.mono}
          opacity={0.6}
          transform={`rotate(-90, ${chartAreaX + 4}, ${chartAY + chartAreaH / 2})`}
        >
          h
        </text>
        {/* Dot on Chart A */}
        {dotChartA && (
          <MappedDot
            cx={dotChartA.x}
            cy={dotChartA.y}
            color={COLORS.amber}
            r={5}
            label={`(${dotChartA.theta.toFixed(2)}, ${dotChartA.h.toFixed(2)})`}
            animate
          />
        )}
      </ChartPanel>

      {/* Chart B */}
      <ChartPanel x={chartAreaX} y={chartBY} width={chartAreaW} height={chartAreaH} label="Chart B">
        {/* Cyan fill for covered region */}
        <rect
          x={chartAreaX + gapStripW}
          y={chartBY}
          width={chartAreaW - gapStripW}
          height={chartAreaH}
          fill={COLORS.cyan}
          opacity={0.04}
          rx={4}
        />
        {/* Overlap highlight (light green) */}
        <rect
          x={chartAreaX + gapStripW}
          y={chartBY}
          width={chartAreaW - gapStripW}
          height={chartAreaH}
          fill={COLORS.lightGreen}
          opacity={0.04}
          rx={4}
        />
        {/* Gap strip on LEFT edge */}
        <rect
          x={chartAreaX}
          y={chartBY}
          width={gapStripW}
          height={chartAreaH}
          fill={COLORS.muted}
          opacity={0.25}
        />
        <text
          x={chartAreaX + gapStripW / 2}
          y={chartBY + chartAreaH / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={COLORS.muted}
          fontSize={8}
          fontFamily={FONTS.mono}
          transform={`rotate(-90, ${chartAreaX + gapStripW / 2}, ${chartBY + chartAreaH / 2})`}
        >
          gap
        </text>
        {/* Color marker */}
        <rect x={chartAreaX + 4} y={chartBY + 4} width={6} height={6} fill={COLORS.cyan} rx={1} />
        {/* Axis labels */}
        <text x={chartAreaX + chartAreaW / 2} y={chartBY + chartAreaH - 4} textAnchor="middle" fill={COLORS.muted} fontSize={9} fontFamily={FONTS.mono} opacity={0.6}>
          {'\u03b8 \u2208 (0, 2\u03c0)'}
        </text>
        <text
          x={chartAreaX + 4}
          y={chartBY + chartAreaH / 2}
          textAnchor="middle"
          fill={COLORS.muted}
          fontSize={9}
          fontFamily={FONTS.mono}
          opacity={0.6}
          transform={`rotate(-90, ${chartAreaX + 4}, ${chartBY + chartAreaH / 2})`}
        >
          h
        </text>
        {/* Dot on Chart B */}
        {dotChartB && (
          <MappedDot
            cx={dotChartB.x}
            cy={dotChartB.y}
            color={COLORS.cyan}
            r={5}
            label={`(${dotChartB.theta.toFixed(2)}, ${dotChartB.h.toFixed(2)})`}
            animate
          />
        )}
      </ChartPanel>
    </svg>
  );
}
