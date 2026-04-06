import React, { useMemo, useRef, useCallback, useEffect } from 'react';
import { COLORS, FONTS, WIREFRAME, ANIMATION } from '../constants';
import { rotate3D, project3D, parametricCylinder, generateWireframe, wireframeToPath, clamp } from '../mathUtils';
import MappedDot from './shared/MappedDot';
import ChartPanel from './shared/ChartPanel';
import { interpolatePath, rainbowColor } from '../rainbowPath';

const PI = Math.PI;
const TWO_PI = 2 * Math.PI;
const U_STEPS = 12;
const V_STEPS = 8;

export default function CylinderManifold({ dot, onDotPlace, rotation, onRotationChange, width, height, onTeachingText, path = [] }) {
  const dragRef = useRef({ dragging: false, startX: 0, startY: 0, startRotX: 0, startRotY: 0, moved: false });
  const animRef = useRef({ rafId: null, lastTime: null, autoRotate: true, idleTimer: null });

  const rotX = rotation?.x ?? 0.3;
  const rotY = rotation?.y ?? 0;

  const leftW = width * 0.55;
  const rightW = width * 0.45;
  const rightX = leftW;
  const cylCx = leftW / 2;
  const cylCy = height / 2;
  const scale = 120;
  const d = WIREFRAME.perspectiveDistance;

  const wireframeData = useMemo(() => {
    const wf = generateWireframe(parametricCylinder, U_STEPS, V_STEPS, 0, TWO_PI, -1, 1);
    const processLines = (lines, isLongitude) => lines.map((line) => {
      let totalDepth = 0;
      for (const [x, y, z] of line) { const [, , rz] = rotate3D(x, y, z, rotX, rotY); totalDepth += rz; }
      return { pathD: wireframeToPath(line, rotX, rotY, d, scale, cylCx, cylCy), avgDepth: totalDepth / line.length, isLongitude };
    });
    return [...processLines(wf.uLines, true), ...processLines(wf.vLines, false)].sort((a, b) => b.avgDepth - a.avgDepth);
  }, [rotX, rotY, leftW, height]);

  const gridPoints = useMemo(() => {
    const points = [];
    for (let i = 0; i <= U_STEPS; i++) {
      const theta = (TWO_PI * i) / U_STEPS;
      for (let j = 0; j <= V_STEPS; j++) {
        const h = -1 + (2 * j) / V_STEPS;
        const pt = parametricCylinder(theta, h);
        const [rx, ry, rz] = rotate3D(pt.x, pt.y, pt.z, rotX, rotY);
        const proj = project3D(rx, ry, rz, d);
        points.push({ theta: theta > PI ? theta - TWO_PI : theta, thetaRaw: theta, h, screenX: cylCx + proj.x * scale, screenY: cylCy - proj.y * scale });
      }
    }
    return points;
  }, [rotX, rotY, leftW, height]);

  // Rainbow path
  const pathDots = useMemo(() => interpolatePath(path, TWO_PI, null), [path]);

  useEffect(() => {
    const anim = animRef.current;
    const tick = (time) => {
      if (anim.lastTime === null) anim.lastTime = time;
      const dt = (time - anim.lastTime) / 1000; anim.lastTime = time;
      if (anim.autoRotate && !dragRef.current.dragging) {
        onRotationChange({ x: rotation?.x ?? 0.3, y: (rotation?.y ?? 0) + ANIMATION.autoRotateSpeed * dt });
      }
      anim.rafId = requestAnimationFrame(tick);
    };
    anim.rafId = requestAnimationFrame(tick);
    return () => { if (anim.rafId) cancelAnimationFrame(anim.rafId); anim.lastTime = null; };
  }, [rotation, onRotationChange]);

  const chartPad = 16;
  const chartAreaX = rightX + chartPad;
  const chartAreaW = rightW - chartPad * 2;
  const chartAreaTop = chartPad + 24;
  const chartAreaH = height - chartAreaTop - chartPad;

  const onPointerDown = useCallback((e) => {
    const drag = dragRef.current;
    drag.dragging = true; drag.moved = false; drag.startX = e.clientX; drag.startY = e.clientY;
    drag.startRotX = rotX; drag.startRotY = rotY;
    animRef.current.autoRotate = false;
    if (animRef.current.idleTimer) clearTimeout(animRef.current.idleTimer);
    e.currentTarget.setPointerCapture(e.pointerId);
  }, [rotX, rotY]);

  const onPointerMove = useCallback((e) => {
    const drag = dragRef.current; if (!drag.dragging) return;
    const dx = e.clientX - drag.startX, dy = e.clientY - drag.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) drag.moved = true;
    onRotationChange({ x: clamp(drag.startRotX + dy * ANIMATION.rotationSensitivity, -PI / 2, PI / 2), y: drag.startRotY + dx * ANIMATION.rotationSensitivity });
  }, [onRotationChange]);

  const onPointerUp = useCallback((e) => {
    const drag = dragRef.current; const wasDrag = drag.moved; drag.dragging = false;
    if (animRef.current.idleTimer) clearTimeout(animRef.current.idleTimer);
    animRef.current.idleTimer = setTimeout(() => { animRef.current.autoRotate = true; }, ANIMATION.autoRotateResumeDelay);

    if (!wasDrag && onDotPlace) {
      const svg = e.currentTarget; const rect = svg.getBoundingClientRect();
      const clickX = e.clientX - rect.left, clickY = e.clientY - rect.top;
      if (clickX < leftW) {
        let bestDist = Infinity, bestPoint = null;
        for (const gp of gridPoints) { const dist = Math.hypot(gp.screenX - clickX, gp.screenY - clickY); if (dist < bestDist) { bestDist = dist; bestPoint = gp; } }
        if (bestPoint && bestDist < 20) onDotPlace({ u: bestPoint.thetaRaw, v: bestPoint.h });
      } else if (clickX >= chartAreaX && clickX <= chartAreaX + chartAreaW && clickY >= chartAreaTop && clickY <= chartAreaTop + chartAreaH) {
        const xFrac = (clickX - chartAreaX) / chartAreaW;
        const theta = xFrac * TWO_PI - PI;
        const yFrac = (clickY - chartAreaTop) / chartAreaH;
        const h = 1 - 2 * yFrac;
        const u = ((theta % TWO_PI) + TWO_PI) % TWO_PI;
        onDotPlace({ u, v: clamp(h, -1, 1) });
      }
    }
  }, [gridPoints, onDotPlace, leftW, chartAreaX, chartAreaW, chartAreaTop, chartAreaH]);

  const dotProjection = useMemo(() => {
    if (!dot) return null;
    const pt = parametricCylinder(dot.u, dot.v);
    const [rx, ry, rz] = rotate3D(pt.x, pt.y, pt.z, rotX, rotY);
    const proj = project3D(rx, ry, rz, d);
    return { x: cylCx + proj.x * scale, y: cylCy - proj.y * scale };
  }, [dot, rotX, rotY, leftW, height]);

  const dotChart = useMemo(() => {
    if (!dot) return null;
    let theta = ((dot.u + PI) % TWO_PI + TWO_PI) % TWO_PI - PI;
    const xFrac = (theta + PI) / TWO_PI;
    const yFrac = (dot.v + 1) / 2;
    return { x: chartAreaX + xFrac * chartAreaW, y: chartAreaTop + (1 - yFrac) * chartAreaH, theta, h: dot.v };
  }, [dot, chartAreaX, chartAreaW, chartAreaTop, chartAreaH]);

  useEffect(() => {
    if (!onTeachingText) return;
    if (!dot) { onTeachingText("The cylinder wraps in one direction and is flat in the other. Its chart is an almost-complete rectangle."); return; }
    let theta = ((dot.u + PI) % TWO_PI + TWO_PI) % TWO_PI - PI;
    if (Math.abs(Math.abs(theta) - PI) < 0.2) onTeachingText("Near the chart boundary \u2014 the seam where the chart can't reach.");
    else onTeachingText("The grid lines on the chart match the wireframe on the cylinder.");
  }, [dot, onTeachingText]);

  // Helper: map (u, v) to chart pixel position
  const uvToChartPx = (u, v) => {
    let theta = ((u + PI) % TWO_PI + TWO_PI) % TWO_PI - PI;
    const xFrac = (theta + PI) / TWO_PI;
    const yFrac = (v + 1) / 2;
    return { x: chartAreaX + xFrac * chartAreaW, y: chartAreaTop + (1 - yFrac) * chartAreaH };
  };

  return (
    <svg width={width} height={height} style={{ cursor: 'grab', userSelect: 'none' }}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} aria-label="Cylinder manifold visualization">
      <rect x={0} y={0} width={leftW} height={height} fill={COLORS.background} opacity={WIREFRAME.backgroundFillOpacity} rx={8} />

      {wireframeData.map((line, i) => (
        <path key={i} d={line.pathD} fill="none" stroke={COLORS.primary}
          strokeWidth={line.isLongitude ? WIREFRAME.longitudeWidth : WIREFRAME.latitudeWidth}
          opacity={(line.isLongitude ? WIREFRAME.longitudeOpacity : WIREFRAME.latitudeOpacity) * clamp(0.4 + 0.6 * (1 - (line.avgDepth + 1) / 2), 0.15, 1)} />
      ))}

      {/* Rainbow path dots on cylinder */}
      {pathDots.map((pd, i) => {
        const pt = parametricCylinder(pd.u, pd.v);
        const [rx, ry, rz] = rotate3D(pt.x, pt.y, pt.z, rotX, rotY);
        const proj = project3D(rx, ry, rz, d);
        return <circle key={`pc${i}`} cx={cylCx + proj.x * scale} cy={cylCy - proj.y * scale} r={2} fill={pd.color} opacity={0.85} />;
      })}
      {path.map((wp, i) => {
        const pt = parametricCylinder(wp.u, wp.v);
        const [rx, ry, rz] = rotate3D(pt.x, pt.y, pt.z, rotX, rotY);
        const proj = project3D(rx, ry, rz, d);
        return <circle key={`wpc${i}`} cx={cylCx + proj.x * scale} cy={cylCy - proj.y * scale} r={4.5} fill={rainbowColor(i, path.length)} stroke="#fff" strokeWidth={1.5} />;
      })}

      {dotProjection && <MappedDot cx={dotProjection.x} cy={dotProjection.y} color={COLORS.amber} r={6} animate />}

      <line x1={rightX} y1={0} x2={rightX} y2={height} stroke={COLORS.grid} strokeWidth={1} opacity={0.4} />
      <text x={rightX + rightW / 2} y={16} textAnchor="middle" fill={COLORS.muted} fontSize={13} fontWeight={700} fontFamily={FONTS.body}>Chart</text>

      <ChartPanel x={chartAreaX} y={chartAreaTop} width={chartAreaW} height={chartAreaH} label={`\u03B8 \u2208 (-\u03C0, \u03C0) \u00D7 h \u2208 [-1, 1]`} uSteps={U_STEPS} vSteps={V_STEPS}>
        <rect x={chartAreaX} y={chartAreaTop} width={chartAreaW} height={chartAreaH} fill={COLORS.amber} opacity={0.04} rx={4} />
        <text x={chartAreaX + chartAreaW / 2} y={chartAreaTop + chartAreaH - 4} textAnchor="middle" fill={COLORS.muted} fontSize={9} fontFamily={FONTS.mono} opacity={0.6}>{'\u03b8 \u2208 (-\u03c0, \u03c0)'}</text>
        <text x={chartAreaX + 4} y={chartAreaTop + chartAreaH / 2} textAnchor="middle" fill={COLORS.muted} fontSize={9} fontFamily={FONTS.mono} opacity={0.6}
          transform={`rotate(-90, ${chartAreaX + 4}, ${chartAreaTop + chartAreaH / 2})`}>h</text>

        {/* Rainbow path dots on chart */}
        {pathDots.map((pd, i) => {
          const pos = uvToChartPx(pd.u, pd.v);
          return <circle key={`pcc${i}`} cx={pos.x} cy={pos.y} r={2} fill={pd.color} opacity={0.85} />;
        })}
        {path.map((wp, i) => {
          const pos = uvToChartPx(wp.u, wp.v);
          return <circle key={`wpcc${i}`} cx={pos.x} cy={pos.y} r={4.5} fill={rainbowColor(i, path.length)} stroke="#fff" strokeWidth={1.5} />;
        })}

        {dotChart && <MappedDot cx={dotChart.x} cy={dotChart.y} color={COLORS.amber} r={5} label={`(${dotChart.theta.toFixed(2)}, ${dotChart.h.toFixed(2)})`} animate />}
      </ChartPanel>
    </svg>
  );
}
