import React, { useMemo, useRef, useEffect, useCallback } from 'react';
import { COLORS, FONTS, LAYOUT, WIREFRAME, ANIMATION } from '../constants';
import {
  rotate3D,
  project3D,
  stereographicN,
  stereographicS,
  inverseStereographicN,
  inverseStereographicS,
  parametricSphere,
  generateWireframe,
  wireframeToPath,
  clamp,
} from '../mathUtils';
import MappedDot from './shared/MappedDot';
import ChartPanel from './shared/ChartPanel';

export default function SphereManifold({
  dot,
  onDotPlace,
  rotation,
  onRotationChange,
  width,
  height,
  onTeachingText,
}) {
  const dragRef = useRef({
    dragging: false,
    startX: 0,
    startY: 0,
    startRotX: 0,
    startRotY: 0,
    moved: false,
  });
  const animRef = useRef({
    frameId: null,
    lastTime: null,
    lastInteraction: 0,
  });
  // Keep rotation in a ref so the animation loop always sees the latest value
  const rotationRef = useRef(rotation);
  rotationRef.current = rotation;

  // Layout
  const leftW = width * LAYOUT.leftPanelWidth;
  const rightW = width * LAYOUT.rightPanelWidth;
  const rightX = leftW;
  const sphereCx = leftW / 2;
  const sphereCy = height / 2;
  const scale = Math.min(leftW, height) * 0.32;

  // Wireframe generation (static geometry, never changes)
  const wireframe = useMemo(
    () =>
      generateWireframe(
        parametricSphere,
        12,
        11,
        0,
        2 * Math.PI,
        -Math.PI / 2,
        Math.PI / 2
      ),
    []
  );

  // Compute sorted wireframe paths with depth info
  const sortedLines = useMemo(() => {
    const d = WIREFRAME.perspectiveDistance;
    const allLines = [];

    wireframe.uLines.forEach((line) => {
      let depthSum = 0;
      line.forEach(([x, y, z]) => {
        const [, , rz] = rotate3D(x, y, z, rotation.x, rotation.y);
        depthSum += rz;
      });
      const avgDepth = depthSum / line.length;
      allLines.push({
        path: wireframeToPath(line, rotation.x, rotation.y, d, scale, sphereCx, sphereCy),
        avgDepth,
        type: 'longitude',
      });
    });

    wireframe.vLines.forEach((line) => {
      let depthSum = 0;
      line.forEach(([x, y, z]) => {
        const [, , rz] = rotate3D(x, y, z, rotation.x, rotation.y);
        depthSum += rz;
      });
      const avgDepth = depthSum / line.length;
      allLines.push({
        path: wireframeToPath(line, rotation.x, rotation.y, d, scale, sphereCx, sphereCy),
        avgDepth,
        type: 'latitude',
      });
    });

    // Sort back-to-front (highest depth = farthest back = rendered first)
    allLines.sort((a, b) => b.avgDepth - a.avgDepth);

    // Normalize depths for opacity modulation
    const depths = allLines.map((l) => l.avgDepth);
    const minD = Math.min(...depths);
    const maxD = Math.max(...depths);
    const range = maxD - minD || 1;
    allLines.forEach((l) => {
      // 0 = farthest back, 1 = closest to camera
      l.normalizedDepth = (l.avgDepth - minD) / range;
    });

    return allLines;
  }, [rotation.x, rotation.y, wireframe, scale, sphereCx, sphereCy]);

  // Dot on sphere (3D Cartesian point)
  const spherePoint = useMemo(() => {
    if (!dot) return null;
    return parametricSphere(dot.u, dot.v);
  }, [dot]);

  // Projected dot position on screen
  const projectedDot = useMemo(() => {
    if (!spherePoint) return null;
    const [rx, ry, rz] = rotate3D(
      spherePoint.x,
      spherePoint.y,
      spherePoint.z,
      rotation.x,
      rotation.y
    );
    const p = project3D(rx, ry, rz, WIREFRAME.perspectiveDistance);
    return {
      x: sphereCx + p.x * scale,
      y: sphereCy - p.y * scale,
      depth: p.depth,
    };
  }, [spherePoint, rotation.x, rotation.y, scale, sphereCx, sphereCy]);

  // Chart projections
  // Chart N shows north pole at center (projects FROM south pole)
  const chartN = useMemo(() => {
    if (!spherePoint) return null;
    return stereographicS(spherePoint.x, spherePoint.y, spherePoint.z);
  }, [spherePoint]);

  // Chart S shows south pole at center (projects FROM north pole)
  const chartS = useMemo(() => {
    if (!spherePoint) return null;
    return stereographicN(spherePoint.x, spherePoint.y, spherePoint.z);
  }, [spherePoint]);

  // Teaching text updates
  useEffect(() => {
    if (!onTeachingText) return;
    if (!dot) {
      onTeachingText(
        'Two flat maps, each missing one point. Together, they cover everything.'
      );
    } else if (dot.v > 1.2) {
      onTeachingText(
        "This point is near the North Pole \u2014 Chart S can\u2019t see it, but Chart N can."
      );
    } else if (dot.v < -1.2) {
      onTeachingText(
        "This point is near the South Pole \u2014 Chart N can\u2019t see it, but Chart S can."
      );
    } else if (Math.abs(dot.v) < 0.5) {
      onTeachingText(
        'The equator is on both maps \u2014 where they agree.'
      );
    } else {
      onTeachingText(
        'Two flat maps, each missing one point. Together, they cover everything.'
      );
    }
  }, [dot, onTeachingText]);

  // Auto-rotation via requestAnimationFrame
  useEffect(() => {
    const anim = animRef.current;

    const tick = (now) => {
      if (anim.lastTime === null) {
        anim.lastTime = now;
        anim.frameId = requestAnimationFrame(tick);
        return;
      }
      const dt = (now - anim.lastTime) / 1000;
      anim.lastTime = now;

      // If user recently interacted, pause auto-rotate
      if (now - anim.lastInteraction < ANIMATION.autoRotateResumeDelay) {
        anim.frameId = requestAnimationFrame(tick);
        return;
      }

      const cur = rotationRef.current;
      onRotationChange({
        x: cur.x,
        y: cur.y + ANIMATION.autoRotateSpeed * dt,
      });

      anim.frameId = requestAnimationFrame(tick);
    };

    anim.frameId = requestAnimationFrame(tick);
    return () => {
      if (anim.frameId) cancelAnimationFrame(anim.frameId);
      anim.lastTime = null;
    };
    // Only mount/unmount — we read rotation from the ref
  }, [onRotationChange]);

  // Pointer handlers for drag-to-rotate
  const handlePointerDown = useCallback(
    (e) => {
      // Only handle events within the left panel
      const svg = e.currentTarget;
      const rect = svg.getBoundingClientRect();
      const localX = e.clientX - rect.left;
      if (localX > leftW) return;

      const drag = dragRef.current;
      drag.dragging = true;
      drag.startX = e.clientX;
      drag.startY = e.clientY;
      drag.startRotX = rotationRef.current.x;
      drag.startRotY = rotationRef.current.y;
      drag.moved = false;
      animRef.current.lastInteraction = performance.now();
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [leftW]
  );

  const handlePointerMove = useCallback(
    (e) => {
      const drag = dragRef.current;
      if (!drag.dragging) return;
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        drag.moved = true;
      }
      animRef.current.lastInteraction = performance.now();
      onRotationChange({
        x: drag.startRotX + dy * ANIMATION.rotationSensitivity,
        y: drag.startRotY + dx * ANIMATION.rotationSensitivity,
      });
    },
    [onRotationChange]
  );

  const handlePointerUp = useCallback(
    (e) => {
      const drag = dragRef.current;
      if (!drag.dragging) return;
      drag.dragging = false;

      if (!drag.moved) {
        // Click on sphere: hit test
        const svg = e.currentTarget;
        const rect = svg.getBoundingClientRect();
        const clickX = e.clientX - rect.left - sphereCx;
        const clickY = e.clientY - rect.top - sphereCy;

        const nx = clickX / scale;
        const ny = -clickY / scale;

        if (nx * nx + ny * ny <= 1) {
          const nz = Math.sqrt(1 - nx * nx - ny * ny);

          // Inverse rotate: undo X rotation then undo Y rotation
          const [ix, iy, iz] = rotate3D(nx, ny, nz, -rotationRef.current.x, 0);
          const [ox, oy, oz] = rotate3D(ix, iy, iz, 0, -rotationRef.current.y);

          let u = Math.atan2(oz, ox);
          if (u < 0) u += 2 * Math.PI;
          const v = Math.asin(clamp(oy, -1, 1));
          onDotPlace({ u, v });
        }
      }
    },
    [sphereCx, sphereCy, scale, onDotPlace]
  );

  // Right panel chart layout
  const chartPadding = 12;
  const chartAreaX = rightX + chartPadding;
  const chartAreaW = rightW - chartPadding * 2;
  const chartHalfH = (height - chartPadding * 3) / 2;
  const chartNY = chartPadding;
  const chartSY = chartPadding * 2 + chartHalfH;

  const discRadius = Math.min(chartAreaW, chartHalfH) * 0.35;

  // Chart disc centers
  const discNCx = chartAreaX + chartAreaW / 2;
  const discNCy = chartNY + chartHalfH / 2 + 10;
  const discSCx = chartAreaX + chartAreaW / 2;
  const discSCy = chartSY + chartHalfH / 2 + 10;

  // Disc scale: stereographic distance 1 (equator) maps to ~40% of disc radius
  const discScale = discRadius / 2.5;

  // Click handler for chart discs in the right panel
  const handleChartClick = useCallback(
    (e) => {
      const svg = e.currentTarget;
      const rect = svg.getBoundingClientRect();
      const localX = e.clientX - rect.left;
      // Only handle clicks in the right panel
      if (localX <= leftW) return;

      // Check Chart N disc (uses inverse of stereographicS since Chart N shows north pole at center)
      const dnx = e.clientX - rect.left - discNCx;
      const dny = e.clientY - rect.top - discNCy;
      if (dnx * dnx + dny * dny <= discRadius * discRadius) {
        const su = dnx / discScale;
        const sv = -dny / discScale;
        const [ox, oy, oz] = inverseStereographicS(su, sv);
        let u = Math.atan2(oz, ox);
        if (u < 0) u += 2 * Math.PI;
        const v = Math.asin(clamp(oy, -1, 1));
        onDotPlace({ u, v });
        return;
      }

      // Check Chart S disc (uses inverse of stereographicN since Chart S shows south pole at center)
      const dsx = e.clientX - rect.left - discSCx;
      const dsy = e.clientY - rect.top - discSCy;
      if (dsx * dsx + dsy * dsy <= discRadius * discRadius) {
        const su = dsx / discScale;
        const sv = -dsy / discScale;
        const [ox, oy, oz] = inverseStereographicN(su, sv);
        let u = Math.atan2(oz, ox);
        if (u < 0) u += 2 * Math.PI;
        const v = Math.asin(clamp(oy, -1, 1));
        onDotPlace({ u, v });
        return;
      }
    },
    [leftW, discNCx, discNCy, discSCx, discSCy, discRadius, discScale, onDotPlace]
  );

  // Chart grid elements (concentric circles + radial lines)
  const chartGridN = useMemo(() => {
    const elements = [];
    for (let i = 1; i <= 8; i++) {
      elements.push(
        <circle
          key={`cn${i}`}
          cx={discNCx}
          cy={discNCy}
          r={(discRadius * i) / 8}
          fill="none"
          stroke={COLORS.grid}
          strokeWidth={0.5}
          opacity={0.15}
        />
      );
    }
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4;
      elements.push(
        <line
          key={`rn${i}`}
          x1={discNCx}
          y1={discNCy}
          x2={discNCx + Math.cos(angle) * discRadius}
          y2={discNCy + Math.sin(angle) * discRadius}
          stroke={COLORS.grid}
          strokeWidth={0.5}
          opacity={0.15}
        />
      );
    }
    return elements;
  }, [discNCx, discNCy, discRadius]);

  const chartGridS = useMemo(() => {
    const elements = [];
    for (let i = 1; i <= 8; i++) {
      elements.push(
        <circle
          key={`cs${i}`}
          cx={discSCx}
          cy={discSCy}
          r={(discRadius * i) / 8}
          fill="none"
          stroke={COLORS.grid}
          strokeWidth={0.5}
          opacity={0.15}
        />
      );
    }
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4;
      elements.push(
        <line
          key={`rs${i}`}
          x1={discSCx}
          y1={discSCy}
          x2={discSCx + Math.cos(angle) * discRadius}
          y2={discSCy + Math.sin(angle) * discRadius}
          stroke={COLORS.grid}
          strokeWidth={0.5}
          opacity={0.15}
        />
      );
    }
    return elements;
  }, [discSCx, discSCy, discRadius]);

  // Chart dot positions (pixel offset from disc center)
  const chartNDot = useMemo(() => {
    if (!chartN) return null;
    const px = chartN.u * discScale;
    const py = -chartN.v * discScale;
    if (px * px + py * py > discRadius * discRadius) return null;
    return { x: px, y: py };
  }, [chartN, discScale, discRadius]);

  const chartSDot = useMemo(() => {
    if (!chartS) return null;
    const px = chartS.u * discScale;
    const py = -chartS.v * discScale;
    if (px * px + py * py > discRadius * discRadius) return null;
    return { x: px, y: py };
  }, [chartS, discScale, discRadius]);

  const inOverlap = dot && Math.abs(dot.v) < Math.PI / 4;

  return (
    <svg
      width={width}
      height={height}
      style={{ display: 'block', cursor: 'grab' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onClick={handleChartClick}
    >
      {/* CSS animation keyframes */}
      <defs>
        <style>{`
          @keyframes dotScaleIn {
            from { transform: scale(0); }
            to { transform: scale(1); }
          }
          @keyframes dotPulse {
            0%, 100% { opacity: 0.3; }
            50% { opacity: 0.6; }
          }
        `}</style>
        <clipPath id="discClipN">
          <circle cx={discNCx} cy={discNCy} r={discRadius} />
        </clipPath>
        <clipPath id="discClipS">
          <circle cx={discSCx} cy={discSCy} r={discRadius} />
        </clipPath>
      </defs>

      {/* ===== LEFT PANEL: Wireframe Sphere ===== */}
      <g aria-label="Interactive sphere" role="button">
        {/* Faint filled circle behind wireframe */}
        <circle
          cx={sphereCx}
          cy={sphereCy}
          r={scale}
          fill={COLORS.primary}
          opacity={WIREFRAME.backgroundFillOpacity}
        />

        {/* Depth-sorted wireframe lines */}
        {sortedLines.map((line, i) => {
          const baseOpacity =
            line.type === 'longitude'
              ? WIREFRAME.longitudeOpacity
              : WIREFRAME.latitudeOpacity;
          // normalizedDepth: 0 = farthest, 1 = nearest
          // Farther lines should be more transparent
          const depthFactor = 0.3 + 0.7 * line.normalizedDepth;
          const sw =
            line.type === 'longitude'
              ? WIREFRAME.longitudeWidth
              : WIREFRAME.latitudeWidth;
          return (
            <path
              key={i}
              d={line.path}
              fill="none"
              stroke={COLORS.primary}
              strokeWidth={sw}
              opacity={baseOpacity * depthFactor}
            />
          );
        })}

        {/* Dot on sphere surface */}
        {projectedDot && (
          <MappedDot
            cx={projectedDot.x}
            cy={projectedDot.y}
            color={COLORS.amber}
            r={6}
            animate
          />
        )}
      </g>

      {/* ===== Vertical divider ===== */}
      <line
        x1={rightX}
        y1={0}
        x2={rightX}
        y2={height}
        stroke={COLORS.grid}
        strokeWidth={1}
        opacity={0.4}
      />

      {/* ===== RIGHT PANEL: Stereographic Charts ===== */}
      <text
        x={rightX + rightW / 2}
        y={16}
        textAnchor="middle"
        fill={COLORS.muted}
        fontSize={11}
        fontFamily={FONTS.body}
        fontWeight={700}
        letterSpacing={1.5}
      >
        CHARTS
      </text>

      {/* --- Chart N (amber) --- */}
      <g>
        {/* Disc background */}
        <circle
          cx={discNCx}
          cy={discNCy}
          r={discRadius}
          fill={COLORS.surface}
          stroke={COLORS.amber}
          strokeWidth={1}
          opacity={0.8}
        />
        {/* Grid inside disc */}
        <g clipPath="url(#discClipN)">
          {chartGridN}
        </g>
        {/* Label */}
        <text
          x={discNCx}
          y={discNCy + discRadius + 18}
          textAnchor="middle"
          fill={COLORS.amber}
          fontSize={12}
          fontFamily={FONTS.body}
          fontWeight={700}
        >
          Chart N
        </text>

        {/* Dot on chart N */}
        {dot && chartNDot && (
          <MappedDot
            cx={discNCx + chartNDot.x}
            cy={discNCy + chartNDot.y}
            color={COLORS.amber}
            r={5}
            label={`(${dot.u.toFixed(2)}, ${dot.v.toFixed(2)})`}
            animate
          />
        )}
        {/* Show x when projection undefined (near north pole) */}
        {dot && !chartN && (
          <text
            x={discNCx}
            y={discNCy + 5}
            textAnchor="middle"
            fill={COLORS.amber}
            fontSize={18}
            fontFamily={FONTS.mono}
            opacity={0.7}
          >
            &#215;
          </text>
        )}
      </g>

      {/* --- Chart S (cyan) --- */}
      <g>
        {/* Disc background */}
        <circle
          cx={discSCx}
          cy={discSCy}
          r={discRadius}
          fill={COLORS.surface}
          stroke={COLORS.cyan}
          strokeWidth={1}
          opacity={0.8}
        />
        {/* Grid inside disc */}
        <g clipPath="url(#discClipS)">
          {chartGridS}
        </g>
        {/* Label */}
        <text
          x={discSCx}
          y={discSCy + discRadius + 18}
          textAnchor="middle"
          fill={COLORS.cyan}
          fontSize={12}
          fontFamily={FONTS.body}
          fontWeight={700}
        >
          Chart S
        </text>

        {/* Dot on chart S */}
        {dot && chartSDot && (
          <MappedDot
            cx={discSCx + chartSDot.x}
            cy={discSCy + chartSDot.y}
            color={COLORS.cyan}
            r={5}
            label={`(${dot.u.toFixed(2)}, ${dot.v.toFixed(2)})`}
            animate
          />
        )}
        {/* Show x when projection undefined (near south pole) */}
        {dot && !chartS && (
          <text
            x={discSCx}
            y={discSCy + 5}
            textAnchor="middle"
            fill={COLORS.cyan}
            fontSize={18}
            fontFamily={FONTS.mono}
            opacity={0.7}
          >
            &#215;
          </text>
        )}
      </g>

      {/* Overlap connecting line (dashed light green) */}
      {inOverlap && chartNDot && chartSDot && (
        <line
          x1={discNCx + chartNDot.x}
          y1={discNCy + chartNDot.y}
          x2={discSCx + chartSDot.x}
          y2={discSCy + chartSDot.y}
          stroke={COLORS.lightGreen}
          strokeWidth={1.2}
          strokeDasharray="4 3"
          opacity={0.6}
        />
      )}
    </svg>
  );
}
