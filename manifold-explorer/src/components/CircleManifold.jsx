import React, { useMemo, useCallback, useEffect } from 'react';
import { COLORS, FONTS, LAYOUT } from '../constants';
import { parametricCircle, normalizeAngle, clamp } from '../mathUtils';
import MappedDot from './shared/MappedDot';

const PI = Math.PI;
const TWO_PI = 2 * Math.PI;
const NEAR_THRESHOLD = 0.15; // radians — how close to boundary to count as "only on one chart"

/**
 * Determine which charts cover a given angle.
 * Chart A: theta in (-pi, pi) — excludes theta = pi (leftmost point)
 * Chart B: theta in (0, 2pi) — excludes theta = 0 (rightmost point)
 *
 * We work with raw theta from atan2 (range -pi..pi) but also accept any angle.
 */
function chartCoverage(theta) {
  if (theta === null || theta === undefined) return { a: false, b: false };
  const n = normalizeAngle(theta); // [0, 2pi)
  const onA = Math.abs(n - PI) > NEAR_THRESHOLD; // not near pi (leftmost)
  const onB = n > NEAR_THRESHOLD && n < TWO_PI - NEAR_THRESHOLD; // not near 0 (rightmost)
  return { a: onA, b: onB };
}

/** Map angle to Chart A x-fraction (domain -pi..pi). Returns 0..1. */
function thetaToChartA(theta) {
  let t = normalizeAngle(theta);
  if (t > PI) t -= TWO_PI; // now in (-pi, pi]
  return (t + PI) / TWO_PI;
}

/** Map angle to Chart B x-fraction (domain 0..2pi). Returns 0..1. */
function thetaToChartB(theta) {
  return normalizeAngle(theta) / TWO_PI;
}

/** Reverse: Chart A fraction -> theta in (-pi, pi) */
function chartAToTheta(frac) {
  return clamp(frac, 0.01, 0.99) * TWO_PI - PI;
}

/** Reverse: Chart B fraction -> theta in (0, 2pi) */
function chartBToTheta(frac) {
  return clamp(frac, 0.01, 0.99) * TWO_PI;
}

export default function CircleManifold({ dot, onDotPlace, rotation, onRotationChange, width, height, onTeachingText }) {
  // ---- Layout ----
  const leftW = width * LAYOUT.leftPanelWidth;
  const rightW = width * LAYOUT.rightPanelWidth;
  const pad = LAYOUT.panelPadding;

  const circleCx = leftW / 2;
  const circleCy = height / 2;
  const circleR = Math.min(leftW, height) * 0.36;

  // Right panel chart geometry
  const chartX = leftW + pad;
  const chartW = rightW - pad * 2;
  const chartAY = height * 0.28;
  const chartBY = height * 0.58;

  // ---- Overlap highlight regions (as fractions of the chart line) ----
  // Chart A sees all except theta ~ pi (frac ~ 0 and ~ 1 on Chart A).
  // Chart B sees all except theta ~ 0 (frac ~ 0 on Chart B, which is frac ~ 0.5 on Chart A).
  // Overlap on Chart A: two bands excluding endpoints (theta=pi) and the center (theta=0).
  const margin = NEAR_THRESHOLD / TWO_PI;
  const overlapRegions = useMemo(() => [
    { start: margin, end: 0.5 - margin },
    { start: 0.5 + margin, end: 1 - margin },
  ], [margin]);

  // ---- Dot state ----
  const theta = dot ? dot.u : null;
  const coverage = useMemo(() => chartCoverage(theta), [theta]);

  const dotOnCircle = useMemo(() => {
    if (theta === null) return null;
    const p = parametricCircle(theta);
    return { x: circleCx + p.x * circleR, y: circleCy - p.y * circleR };
  }, [theta, circleCx, circleCy, circleR]);

  const dotOnChartA = useMemo(() => {
    if (theta === null || !coverage.a) return null;
    return { x: chartX + thetaToChartA(theta) * chartW, y: chartAY };
  }, [theta, coverage.a, chartX, chartW, chartAY]);

  const dotOnChartB = useMemo(() => {
    if (theta === null || !coverage.b) return null;
    return { x: chartX + thetaToChartB(theta) * chartW, y: chartBY };
  }, [theta, coverage.b, chartX, chartW, chartBY]);

  // ---- Teaching text ----
  useEffect(() => {
    if (!onTeachingText) return;
    if (theta === null) {
      onTeachingText("A circle is the simplest manifold. Can one flat map cover it all?");
    } else if (coverage.a && !coverage.b) {
      onTeachingText("This point is only on Chart A. One map can't see the whole circle.");
    } else if (!coverage.a && coverage.b) {
      onTeachingText("This point is only on Chart B. One map can't see the whole circle.");
    } else {
      onTeachingText("This point appears on both charts \u2014 they agree where they overlap.");
    }
  }, [dot]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Click handlers ----
  const svgPointFromEvent = useCallback((e) => {
    const svg = e.currentTarget.closest('svg');
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  }, []);

  const handleCircleClick = useCallback((e) => {
    const svgPt = svgPointFromEvent(e);
    const dx = svgPt.x - circleCx;
    const dy = -(svgPt.y - circleCy); // flip y so up is positive
    const angle = Math.atan2(dy, dx);
    onDotPlace({ u: angle, v: 0 });
  }, [circleCx, circleCy, onDotPlace, svgPointFromEvent]);

  const handleChartAClick = useCallback((e) => {
    const svgPt = svgPointFromEvent(e);
    const frac = clamp((svgPt.x - chartX) / chartW, 0.01, 0.99);
    onDotPlace({ u: chartAToTheta(frac), v: 0 });
  }, [chartX, chartW, onDotPlace, svgPointFromEvent]);

  const handleChartBClick = useCallback((e) => {
    const svgPt = svgPointFromEvent(e);
    const frac = clamp((svgPt.x - chartX) / chartW, 0.01, 0.99);
    onDotPlace({ u: chartBToTheta(frac), v: 0 });
  }, [chartX, chartW, onDotPlace, svgPointFromEvent]);

  // ---- Shared text props ----
  const headerProps = {
    fontSize: 11,
    fontFamily: FONTS.mono,
    fill: COLORS.muted,
    letterSpacing: '2px',
  };

  return (
    <svg width={width} height={height} style={{ display: 'block', userSelect: 'none' }}>
      {/* Defs */}
      <defs>
        <filter id="circleGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="rgba(56,189,248,0.3)" />
        </filter>
      </defs>

      {/* ---- Panel headers ---- */}
      <text x={pad} y={24} {...headerProps} style={{ textTransform: 'uppercase' }}>
        Manifold
      </text>
      <text x={leftW + pad} y={24} {...headerProps} style={{ textTransform: 'uppercase' }}>
        Charts
      </text>

      {/* ---- Vertical divider ---- */}
      <line x1={leftW} y1={0} x2={leftW} y2={height} stroke={COLORS.grid} strokeWidth={1} />

      {/* ======== LEFT PANEL: Circle ======== */}
      <g>
        {/* Clickable area (slightly larger than circle for easy clicking) */}
        <circle
          cx={circleCx}
          cy={circleCy}
          r={circleR + 20}
          fill="transparent"
          style={{ cursor: 'crosshair' }}
          onClick={handleCircleClick}
          role="button"
          aria-label="Click to place a point on the circle"
        />
        {/* Circle rendering */}
        <circle
          cx={circleCx}
          cy={circleCy}
          r={circleR}
          fill={COLORS.primary}
          fillOpacity={0.06}
          stroke={COLORS.primary}
          strokeWidth={3}
          filter="url(#circleGlow)"
          pointerEvents="none"
        />

        {/* Exclusion point markers on circle */}
        {/* theta = pi (leftmost) -- Chart A excludes this */}
        <circle cx={circleCx - circleR} cy={circleCy} r={3.5} fill={COLORS.surface} stroke={COLORS.amber} strokeWidth={1.5} />
        <text x={circleCx - circleR - 8} y={circleCy - 12} fill={COLORS.amber} fontSize={10} fontFamily={FONTS.mono} textAnchor="end">
          {"excl. A"}
        </text>

        {/* theta = 0 (rightmost) -- Chart B excludes this */}
        <circle cx={circleCx + circleR} cy={circleCy} r={3.5} fill={COLORS.surface} stroke={COLORS.cyan} strokeWidth={1.5} />
        <text x={circleCx + circleR + 8} y={circleCy - 12} fill={COLORS.cyan} fontSize={10} fontFamily={FONTS.mono} textAnchor="start">
          {"excl. B"}
        </text>

        {/* Dot on circle */}
        {dotOnCircle && (
          <MappedDot cx={dotOnCircle.x} cy={dotOnCircle.y} color={COLORS.primary} r={7} animate />
        )}
      </g>

      {/* ======== RIGHT PANEL: Charts ======== */}
      <g>
        {/* ---- Chart A (amber) ---- */}
        <text x={chartX} y={chartAY - 30} fill={COLORS.amber} fontSize={12} fontWeight={700} fontFamily={FONTS.body}>
          Chart A
        </text>
        <text x={chartX + 58} y={chartAY - 30} fill={COLORS.muted} fontSize={11} fontFamily={FONTS.mono}>
          {"\u03B8 \u2208 (\u2212\u03C0, \u03C0)"}
        </text>

        {/* Overlap highlights on Chart A */}
        {overlapRegions.map((r, i) => (
          <rect
            key={`ovA${i}`}
            x={chartX + r.start * chartW}
            y={chartAY - 6}
            width={(r.end - r.start) * chartW}
            height={12}
            fill={COLORS.lightGreen}
            opacity={0.15}
            rx={3}
          />
        ))}

        {/* Chart A line */}
        <line
          x1={chartX} y1={chartAY}
          x2={chartX + chartW} y2={chartAY}
          stroke={COLORS.amber} strokeWidth={3} strokeLinecap="round"
        />
        {/* Open-interval endpoint circles */}
        <circle cx={chartX} cy={chartAY} r={4} fill={COLORS.surface} stroke={COLORS.amber} strokeWidth={1.5} />
        <circle cx={chartX + chartW} cy={chartAY} r={4} fill={COLORS.surface} stroke={COLORS.amber} strokeWidth={1.5} />

        {/* Tick labels */}
        <text x={chartX} y={chartAY + 20} fill={COLORS.muted} fontSize={9} fontFamily={FONTS.mono} textAnchor="middle">
          {"\u2212\u03C0"}
        </text>
        <text x={chartX + chartW / 2} y={chartAY + 20} fill={COLORS.muted} fontSize={9} fontFamily={FONTS.mono} textAnchor="middle">
          0
        </text>
        <text x={chartX + chartW} y={chartAY + 20} fill={COLORS.muted} fontSize={9} fontFamily={FONTS.mono} textAnchor="middle">
          {"\u03C0"}
        </text>

        {/* Clickable overlay for Chart A */}
        <rect
          x={chartX} y={chartAY - 14} width={chartW} height={28}
          fill="transparent"
          style={{ cursor: 'crosshair' }}
          onClick={handleChartAClick}
          role="button"
          aria-label="Click to place a point on Chart A"
        />

        {/* ---- Chart B (cyan) ---- */}
        <text x={chartX} y={chartBY - 30} fill={COLORS.cyan} fontSize={12} fontWeight={700} fontFamily={FONTS.body}>
          Chart B
        </text>
        <text x={chartX + 58} y={chartBY - 30} fill={COLORS.muted} fontSize={11} fontFamily={FONTS.mono}>
          {"\u03B8 \u2208 (0, 2\u03C0)"}
        </text>

        {/* Overlap highlights on Chart B */}
        {overlapRegions.map((r, i) => (
          <rect
            key={`ovB${i}`}
            x={chartX + r.start * chartW}
            y={chartBY - 6}
            width={(r.end - r.start) * chartW}
            height={12}
            fill={COLORS.lightGreen}
            opacity={0.15}
            rx={3}
          />
        ))}

        {/* Chart B line */}
        <line
          x1={chartX} y1={chartBY}
          x2={chartX + chartW} y2={chartBY}
          stroke={COLORS.cyan} strokeWidth={3} strokeLinecap="round"
        />
        {/* Open-interval endpoint circles */}
        <circle cx={chartX} cy={chartBY} r={4} fill={COLORS.surface} stroke={COLORS.cyan} strokeWidth={1.5} />
        <circle cx={chartX + chartW} cy={chartBY} r={4} fill={COLORS.surface} stroke={COLORS.cyan} strokeWidth={1.5} />

        {/* Tick labels */}
        <text x={chartX} y={chartBY + 20} fill={COLORS.muted} fontSize={9} fontFamily={FONTS.mono} textAnchor="middle">
          0
        </text>
        <text x={chartX + chartW / 2} y={chartBY + 20} fill={COLORS.muted} fontSize={9} fontFamily={FONTS.mono} textAnchor="middle">
          {"\u03C0"}
        </text>
        <text x={chartX + chartW} y={chartBY + 20} fill={COLORS.muted} fontSize={9} fontFamily={FONTS.mono} textAnchor="middle">
          {"2\u03C0"}
        </text>

        {/* Clickable overlay for Chart B */}
        <rect
          x={chartX} y={chartBY - 14} width={chartW} height={28}
          fill="transparent"
          style={{ cursor: 'crosshair' }}
          onClick={handleChartBClick}
          role="button"
          aria-label="Click to place a point on Chart B"
        />

        {/* ---- Dashed connection when dot is on both charts ---- */}
        {dotOnChartA && dotOnChartB && (
          <line
            x1={dotOnChartA.x} y1={dotOnChartA.y}
            x2={dotOnChartB.x} y2={dotOnChartB.y}
            stroke={COLORS.lightGreen}
            strokeWidth={1.5}
            strokeDasharray="4 3"
            opacity={0.7}
          />
        )}

        {/* ---- Dots on chart lines ---- */}
        {dotOnChartA && (
          <MappedDot cx={dotOnChartA.x} cy={dotOnChartA.y} color={COLORS.amber} r={6} animate />
        )}
        {dotOnChartB && (
          <MappedDot cx={dotOnChartB.x} cy={dotOnChartB.y} color={COLORS.cyan} r={6} animate />
        )}

        {/* "x" marker when dot is NOT visible on a chart */}
        {theta !== null && !coverage.a && (
          <text
            x={chartX + thetaToChartA(theta) * chartW}
            y={chartAY + 5}
            fill={COLORS.muted}
            fontSize={14}
            fontFamily={FONTS.mono}
            textAnchor="middle"
            opacity={0.5}
          >
            {"\u00D7"}
          </text>
        )}
        {theta !== null && !coverage.b && (
          <text
            x={chartX + thetaToChartB(theta) * chartW}
            y={chartBY + 5}
            fill={COLORS.muted}
            fontSize={14}
            fontFamily={FONTS.mono}
            textAnchor="middle"
            opacity={0.5}
          >
            {"\u00D7"}
          </text>
        )}
      </g>
    </svg>
  );
}
