import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { COLORS, FONTS, LAYOUT, WIREFRAME, ANIMATION } from '../constants';
import { rotate3D, project3D, parametricKleinBottle, generateWireframe, wireframeToPath, normalizeAngle, clamp } from '../mathUtils';
import MappedDot from './shared/MappedDot';
import ChartPanel from './shared/ChartPanel';
import { interpolatePath, rainbowColor } from '../rainbowPath';

const TWO_PI = 2 * Math.PI;

export default function KleinBottleManifold({ dot, onDotPlace, rotation, onRotationChange, width, height, onTeachingText, path = [] }) {
  // --- Layout ---
  const leftW = width * LAYOUT.leftPanelWidth;
  const rightW = width * LAYOUT.rightPanelWidth;

  // 3D view center
  const cx3d = leftW / 2;
  const cy3d = height / 2;
  const scale3d = 7;
  const perspD = 40; // classic bottle shape needs large perspective distance (coords up to ~16 units)

  // Chart rectangle dimensions
  const chartPad = 40;
  const chartX = leftW + chartPad;
  const chartY = chartPad;
  const chartW = rightW - chartPad * 2;
  const chartH = height - chartPad * 2;

  // --- State ---
  const [isDraggingDot, setIsDraggingDot] = useState(false);
  const [trail, setTrail] = useState([]);

  // Refs for drag / animation
  const dragRef = useRef({ active: false, startX: 0, startY: 0, startRot: { x: 0, y: 0 } });
  const dotDragRef = useRef({ active: false });
  const animRef = useRef(null);
  const lastTimeRef = useRef(null);
  const interactTimeRef = useRef(0);
  const lastMirrorRef = useRef(false);
  const lastWrapRef = useRef(false);

  // --- Wireframe (memoized, static geometry) ---
  const wireframe = useMemo(() => {
    return generateWireframe(parametricKleinBottle, 16, 12, 0, TWO_PI, 0, TWO_PI);
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

      // Decay trail
      setTrail(prev => {
        const now = Date.now();
        const filtered = prev.filter(p => now - p.time < ANIMATION.trailLifetime);
        if (filtered.length === prev.length) return prev; // avoid unnecessary re-render
        return filtered;
      });

      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [rotation, onRotationChange]);

  // --- Default teaching text ---
  useEffect(() => {
    onTeachingText("Same recipe as the torus \u2014 but one pair of edges is reversed. Watch what happens at the seam.");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Helper: project a Klein bottle (u,v) point to SVG screen coords ---
  const projectToSVG = useCallback((u, v) => {
    const pt = parametricKleinBottle(u, v);
    const [rx, ry, rz] = rotate3D(pt.x, pt.y, pt.z, rotation.x, rotation.y);
    const p = project3D(rx, ry, rz, perspD);
    return { x: cx3d + p.x * scale3d, y: cy3d - p.y * scale3d, depth: p.depth };
  }, [rotation.x, rotation.y, cx3d, cy3d, scale3d, perspD]);

  // --- Helper: chart UV to pixel ---
  const uvToChart = useCallback((u, v) => {
    return {
      x: chartX + (u / TWO_PI) * chartW,
      y: chartY + (1 - v / TWO_PI) * chartH,
    };
  }, [chartX, chartY, chartW, chartH]);

  // --- Helper: pixel to chart UV ---
  const chartToUV = useCallback((px, py) => {
    const u = ((px - chartX) / chartW) * TWO_PI;
    const v = (1 - (py - chartY) / chartH) * TWO_PI;
    return { u, v };
  }, [chartX, chartY, chartW, chartH]);

  // --- Rainbow path interpolation ---
  const pathDots = useMemo(() => interpolatePath(path, TWO_PI, TWO_PI), [path]);

  // --- Klein bottle wrapping with mirror-flip ---
  const wrapKlein = useCallback((u, v) => {
    let wu = normalizeAngle(u);
    let wv = v;
    let mirrored = false;

    // Top/bottom: mirror-flip
    if (wv < 0) {
      wv = -wv;
      wu = TWO_PI - wu;
      wu = normalizeAngle(wu);
      mirrored = true;
    }
    if (wv > TWO_PI) {
      wv = 2 * TWO_PI - wv;
      wu = TWO_PI - wu;
      wu = normalizeAngle(wu);
      mirrored = true;
    }

    // Left/right: normal wrap (already handled by normalizeAngle above)
    wu = normalizeAngle(wu);
    wv = clamp(wv, 0, TWO_PI - 0.001);

    return { u: wu, v: wv, mirrored };
  }, []);

  // --- Rotation drag handlers ---
  const handleMouseDown = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left;

    // Check if on a draggable dot in chart
    // (dot drag is handled by the dot's own onMouseDown)

    // Left panel: rotation drag
    if (mx < leftW) {
      dragRef.current = { active: true, startX: e.clientX, startY: e.clientY, startRot: { ...rotation } };
      interactTimeRef.current = performance.now();
      e.preventDefault();
    }
  }, [rotation, leftW]);

  const handleMouseMove = useCallback((e) => {
    // Rotation drag
    if (dragRef.current.active) {
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      onRotationChange({
        x: dragRef.current.startRot.x + dy * ANIMATION.rotationSensitivity,
        y: dragRef.current.startRot.y + dx * ANIMATION.rotationSensitivity,
      });
      interactTimeRef.current = performance.now();
    }

    // Dot drag on chart
    if (dotDragRef.current.active && dot) {
      const rect = e.currentTarget.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      const raw = chartToUV(mx, my);
      const wrapped = wrapKlein(raw.u, raw.v);

      // Detect mirror-flip event
      if (wrapped.mirrored && !lastMirrorRef.current) {
        onTeachingText("The dot came back mirrored \u2014 left and right switched. There's no consistent 'inside' or 'outside.' This is a non-orientable surface.");
        lastMirrorRef.current = true;
        lastWrapRef.current = false;
      }

      // Detect left/right normal wrap
      if (!wrapped.mirrored && dot) {
        const prevU = dot.u;
        const deltaU = Math.abs(wrapped.u - prevU);
        if (deltaU > Math.PI && !lastWrapRef.current) {
          onTeachingText("This direction wraps normally \u2014 just like the torus.");
          lastWrapRef.current = true;
          lastMirrorRef.current = false;
        }
      }

      onDotPlace({ u: wrapped.u, v: wrapped.v });

      setTrail(prev => {
        const now = Date.now();
        const next = [...prev, { u: wrapped.u, v: wrapped.v, time: now }];
        return next.slice(-30);
      });

      interactTimeRef.current = performance.now();
      e.preventDefault();
    }
  }, [dot, onDotPlace, onRotationChange, chartToUV, wrapKlein, onTeachingText]);

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

    // Chart click (right panel) — always handle, no drag check needed
    if (mx >= chartX && mx <= chartX + chartW && my >= chartY && my <= chartY + chartH) {
      const raw = chartToUV(mx, my);
      const wrapped = wrapKlein(raw.u, raw.v);
      onDotPlace({ u: wrapped.u, v: wrapped.v });
      setTrail([]);
      lastMirrorRef.current = false;
      lastWrapRef.current = false;
      onTeachingText("Same recipe as the torus \u2014 but one pair of edges is reversed. Watch what happens at the seam.");
      return;
    }

    // 3D view click (left panel) — skip if this was a rotation drag
    if (mx < leftW) {
      if (dragRef.current.startX !== undefined) {
        const dx = Math.abs(e.clientX - dragRef.current.startX);
        const dy = Math.abs(e.clientY - dragRef.current.startY);
        if (dx > 3 || dy > 3) return;
      }
      let best = null;
      let bestDist = 20;
      const uSteps = 16;
      const vSteps = 12;
      for (let i = 0; i <= uSteps; i++) {
        for (let j = 0; j <= vSteps; j++) {
          const u = (i / uSteps) * TWO_PI;
          const v = (j / vSteps) * TWO_PI;
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
        setTrail([]);
        lastMirrorRef.current = false;
        lastWrapRef.current = false;
        onTeachingText("Same recipe as the torus \u2014 but one pair of edges is reversed. Watch what happens at the seam.");
      }
    }
  }, [leftW, chartX, chartY, chartW, chartH, projectToSVG, chartToUV, wrapKlein, onDotPlace, onTeachingText]);

  // --- Dot drag start ---
  const handleDotDragStart = useCallback((e) => {
    dotDragRef.current.active = true;
    setIsDraggingDot(true);
    interactTimeRef.current = performance.now();
    e.stopPropagation();
    e.preventDefault();
  }, []);

  // --- Render wireframe lines (depth-sorted) ---
  const renderedWireframe = useMemo(() => {
    const allLines = [];

    // u-lines (constant u)
    wireframe.uLines.forEach((line, i) => {
      const u = (i / 16) * TWO_PI;
      const isNearIntersection = false;
      const pathD = wireframeToPath(line, rotation.x, rotation.y, perspD, scale3d, cx3d, cy3d);

      // Average depth from midpoint
      const mid = Math.floor(line.length / 2);
      const [, , rz] = rotate3D(line[mid][0], line[mid][1], line[mid][2], rotation.x, rotation.y);

      allLines.push({
        key: `u${i}`,
        pathD,
        depth: rz,
        isU: true,
        isIntersection: isNearIntersection,
      });
    });

    // v-lines (constant v)
    wireframe.vLines.forEach((line, i) => {
      const pathD = wireframeToPath(line, rotation.x, rotation.y, perspD, scale3d, cx3d, cy3d);
      const mid = Math.floor(line.length / 2);
      const [, , rz] = rotate3D(line[mid][0], line[mid][1], line[mid][2], rotation.x, rotation.y);

      // Check if this v-line passes through the intersection zone
      // v-lines span all u values, so some segments will be near u=pi
      allLines.push({
        key: `v${i}`,
        pathD,
        depth: rz,
        isU: false,
        isIntersection: false,
      });
    });

    // Depth sort (back to front)
    allLines.sort((a, b) => b.depth - a.depth);
    return allLines;
  }, [wireframe, rotation.x, rotation.y, cx3d, cy3d, scale3d, perspD]);

  // --- Edge arrows for chart ---
  const edgeArrows = useMemo(() => {
    const arrows = [];
    const arrowSize = 8;
    const bigArrowSize = 10;

    // Left edge: amber arrows pointing RIGHT (into chart)
    const leftX = chartX;
    for (let i = 1; i <= 3; i++) {
      const ay = chartY + (i / 4) * chartH;
      arrows.push(
        <polygon
          key={`left-${i}`}
          points={`${leftX - arrowSize},${ay - arrowSize / 2} ${leftX},${ay} ${leftX - arrowSize},${ay + arrowSize / 2}`}
          fill={COLORS.amber}
          opacity={0.85}
        />
      );
    }

    // Right edge: amber arrows pointing RIGHT (out of chart)
    const rightX = chartX + chartW;
    for (let i = 1; i <= 3; i++) {
      const ay = chartY + (i / 4) * chartH;
      arrows.push(
        <polygon
          key={`right-${i}`}
          points={`${rightX},${ay - arrowSize / 2} ${rightX + arrowSize},${ay} ${rightX},${ay + arrowSize / 2}`}
          fill={COLORS.amber}
          opacity={0.85}
        />
      );
    }

    // Top edge: cyan+pink arrows pointing UP
    const topY = chartY;
    for (let i = 1; i <= 3; i++) {
      const ax = chartX + (i / 4) * chartW;
      arrows.push(
        <g key={`top-${i}`}>
          <polygon
            points={`${ax - bigArrowSize / 2},${topY} ${ax},${topY - bigArrowSize} ${ax + bigArrowSize / 2},${topY}`}
            fill={COLORS.cyan}
            opacity={0.85}
          />
          <polygon
            points={`${ax - bigArrowSize / 2},${topY} ${ax},${topY - bigArrowSize} ${ax + bigArrowSize / 2},${topY}`}
            fill="none"
            stroke={COLORS.pink}
            strokeWidth={1.5}
            opacity={0.7}
          />
        </g>
      );
    }

    // Bottom edge: cyan+pink arrows pointing DOWN (REVERSED from top)
    const botY = chartY + chartH;
    for (let i = 1; i <= 3; i++) {
      const ax = chartX + (i / 4) * chartW;
      arrows.push(
        <g key={`bot-${i}`}>
          <polygon
            points={`${ax - bigArrowSize / 2},${botY} ${ax},${botY + bigArrowSize} ${ax + bigArrowSize / 2},${botY}`}
            fill={COLORS.cyan}
            opacity={0.85}
          />
          <polygon
            points={`${ax - bigArrowSize / 2},${botY} ${ax},${botY + bigArrowSize} ${ax + bigArrowSize / 2},${botY}`}
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

  // --- Render trail points ---
  const now = Date.now();

  const trailChartElements = trail.map((p, i) => {
    const age = now - p.time;
    const opacity = Math.max(0, 1 - age / ANIMATION.trailLifetime) * 0.6;
    const pos = uvToChart(p.u, p.v);
    return <circle key={`tc${i}`} cx={pos.x} cy={pos.y} r={3} fill={COLORS.amber} opacity={opacity} />;
  });

  const trail3DElements = trail.map((p, i) => {
    const age = now - p.time;
    const opacity = Math.max(0, 1 - age / ANIMATION.trailLifetime) * 0.5;
    const pos = projectToSVG(p.u, p.v);
    return <circle key={`t3${i}`} cx={pos.x} cy={pos.y} r={2.5} fill={COLORS.amber} opacity={opacity} />;
  });

  // --- Dot positions ---
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
      {/* ===== LEFT PANEL: Klein Bottle 3D Wireframe ===== */}
      <rect
        x={0} y={0} width={leftW} height={height}
        fill="transparent"
        aria-label="Klein bottle 3D view - click to place dot, drag to rotate"
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
        KLEIN BOTTLE
      </text>

      {/* Wireframe lines (depth-sorted) */}
      {renderedWireframe.map(({ key, pathD, depth, isU, isIntersection }) => {
        const depthNorm = (depth + 3) / 6;
        const baseOpacity = isU ? WIREFRAME.longitudeOpacity : WIREFRAME.latitudeOpacity;
        const opacity = baseOpacity * (0.3 + 0.7 * (1 - clamp(depthNorm, 0, 1)));
        const strokeW = isU ? WIREFRAME.longitudeWidth : WIREFRAME.latitudeWidth;

        if (isIntersection) {
          return (
            <path
              key={key}
              d={pathD}
              fill="none"
              stroke={COLORS.pink}
              strokeWidth={strokeW + 0.5}
              opacity={Math.min(opacity * 1.6, 0.85)}
              filter="url(#kleinPinkGlow)"
            />
          );
        }

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

      {/* 3D trail */}
      {trail3DElements}

      {/* Rainbow path dots on 3D Klein bottle */}
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
        <MappedDot cx={dot3D.x} cy={dot3D.y} color={COLORS.amber} r={6} animate={!isDraggingDot} />
      )}

      {/* ===== RIGHT PANEL: Parameter Space Chart ===== */}
      <ChartPanel
        x={chartX}
        y={chartY}
        width={chartW}
        height={chartH}
        label="Parameter space (u, v)"
        uSteps={16}
        vSteps={12}
      >
        {/* Rainbow path dots on chart */}
        {pathDots.map((pd, i) => {
          const pos = uvToChart(pd.u, pd.v);
          return <circle key={`pkc${i}`} cx={pos.x} cy={pos.y} r={2} fill={pd.color} opacity={0.85} />;
        })}
        {path.map((wp, i) => {
          const pos = uvToChart(wp.u, wp.v);
          return <circle key={`wpkc${i}`} cx={pos.x} cy={pos.y} r={4.5} fill={rainbowColor(i, path.length)} stroke="#fff" strokeWidth={1.5} />;
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
        {"u \u2208 [0, 2\u03c0)"}
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
        {"v \u2208 [0, 2\u03c0)"}
      </text>

      {/* Edge arrows */}
      {edgeArrows}

      {/* Twist annotation above chart */}
      <text
        x={chartX + chartW / 2}
        y={chartY - 18}
        textAnchor="middle"
        fill={COLORS.pink}
        fontFamily={FONTS.body}
        fontSize={12}
        fontWeight={600}
      >
        {"The twist \u2014 arrows reversed"}
      </text>

      {/* Chart trail */}
      {trailChartElements}

      {/* Chart dot (draggable) */}
      {dot && dotChartPos && (
        <g
          onMouseDown={handleDotDragStart}
          style={{ cursor: isDraggingDot ? 'grabbing' : 'grab' }}
          role="button"
          aria-label="Drag dot to explore Klein bottle identification"
        >
          {/* Invisible larger hit area for easier drag initiation */}
          <circle cx={dotChartPos.x} cy={dotChartPos.y} r={18} fill="transparent" />
          <MappedDot
            cx={dotChartPos.x}
            cy={dotChartPos.y}
            color={COLORS.amber}
            r={7}
            animate={!isDraggingDot}
            label={`(${(dot.u / Math.PI).toFixed(1)}\u03c0, ${(dot.v / Math.PI).toFixed(1)}\u03c0)`}
          />
        </g>
      )}
    </svg>
  );
}
