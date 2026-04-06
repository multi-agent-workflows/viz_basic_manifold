import React, { useMemo, useCallback, useEffect } from 'react';
import { COLORS, FONTS, LAYOUT } from '../constants';
import { parametricCircle, normalizeAngle, clamp } from '../mathUtils';
import MappedDot from './shared/MappedDot';
import { interpolatePath, rainbowColor } from '../rainbowPath';

const PI = Math.PI;
const TWO_PI = 2 * Math.PI;

// Number of divisions on the circle (matching wireframe-style tick marks)
const NUM_TICKS = 12;

/** Map angle to Chart fraction (domain -pi..pi). Returns 0..1. */
function thetaToChart(theta) {
  let t = normalizeAngle(theta);
  if (t > PI) t -= TWO_PI; // now in (-pi, pi]
  return (t + PI) / TWO_PI;
}

/** Reverse: Chart fraction -> theta in (-pi, pi) */
function chartToTheta(frac) {
  return clamp(frac, 0.01, 0.99) * TWO_PI - PI;
}

export default function CircleManifold({ dot, onDotPlace, rotation, onRotationChange, width, height, onTeachingText, path = [] }) {
  // ---- Layout ----
  const leftW = width * LAYOUT.leftPanelWidth;
  const rightW = width * LAYOUT.rightPanelWidth;
  const pad = LAYOUT.panelPadding;

  const circleCx = leftW / 2;
  const circleCy = height / 2;
  const circleR = Math.min(leftW, height) * 0.36;

  // Right panel chart geometry — single chart, vertically centered
  const chartX = leftW + pad;
  const chartW = rightW - pad * 2;
  const chartY = height / 2;

  // ---- Dot state ----
  const theta = dot ? dot.u : null;

  const dotOnCircle = useMemo(() => {
    if (theta === null) return null;
    const p = parametricCircle(theta);
    return { x: circleCx + p.x * circleR, y: circleCy - p.y * circleR };
  }, [theta, circleCx, circleCy, circleR]);

  const dotOnChart = useMemo(() => {
    if (theta === null) return null;
    return { x: chartX + thetaToChart(theta) * chartW, y: chartY };
  }, [theta, chartX, chartW, chartY]);

  // ---- Rainbow path interpolation ----
  const pathDots = useMemo(() => interpolatePath(path, TWO_PI, null), [path]);

  // ---- Teaching text ----
  useEffect(() => {
    if (!onTeachingText) return;
    if (theta === null) {
      onTeachingText("A circle is the simplest manifold. Click to place a point and see it mapped to a flat chart.");
    } else {
      const t = normalizeAngle(theta);
      const nearExclusion = Math.abs(t - PI) < 0.15;
      if (nearExclusion) {
        onTeachingText("This point is near the chart boundary \u2014 one chart can't cover the whole circle.");
      } else {
        onTeachingText("The chart maps a neighborhood of this point to a flat line segment.");
      }
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
    const dy = -(svgPt.y - circleCy);
    const angle = Math.atan2(dy, dx);
    onDotPlace({ u: angle, v: 0 });
  }, [circleCx, circleCy, onDotPlace, svgPointFromEvent]);

  const handleChartClick = useCallback((e) => {
    const svgPt = svgPointFromEvent(e);
    const frac = clamp((svgPt.x - chartX) / chartW, 0.01, 0.99);
    onDotPlace({ u: chartToTheta(frac), v: 0 });
  }, [chartX, chartW, onDotPlace, svgPointFromEvent]);

  // ---- Tick marks on circle and chart (matching grid) ----
  const tickMarks = useMemo(() => {
    const circleMarks = [];
    const chartMarks = [];
    for (let i = 0; i < NUM_TICKS; i++) {
      const angle = (i / NUM_TICKS) * TWO_PI;
      const p = parametricCircle(angle);
      const innerR = circleR - 6;
      const outerR = circleR + 6;
      circleMarks.push(
        <line key={`ct${i}`} x1={circleCx + p.x * innerR} y1={circleCy - p.y * innerR} x2={circleCx + p.x * outerR} y2={circleCy - p.y * outerR} stroke={COLORS.primary} strokeWidth={1} opacity={0.4} />
      );
      const frac = thetaToChart(angle);
      const cx = chartX + frac * chartW;
      chartMarks.push(
        <line key={`cht${i}`} x1={cx} y1={chartY - 8} x2={cx} y2={chartY + 8} stroke={COLORS.primary} strokeWidth={1} opacity={0.4} />
      );
    }
    return { circleMarks, chartMarks };
  }, [circleCx, circleCy, circleR, chartX, chartW, chartY]);

  const headerProps = {
    fontSize: 11,
    fontFamily: FONTS.mono,
    fill: COLORS.muted,
    letterSpacing: '2px',
  };

  return (
    <svg width={width} height={height} style={{ display: 'block', userSelect: 'none' }}>
      <defs>
        <filter id="circleGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="rgba(56,189,248,0.3)" />
        </filter>
      </defs>

      {/* Panel headers */}
      <text x={pad} y={24} {...headerProps} style={{ textTransform: 'uppercase' }}>Manifold</text>
      <text x={leftW + pad} y={24} {...headerProps} style={{ textTransform: 'uppercase' }}>Chart</text>

      {/* Vertical divider */}
      <line x1={leftW} y1={0} x2={leftW} y2={height} stroke={COLORS.grid} strokeWidth={1} />

      {/* ======== LEFT PANEL: Circle ======== */}
      <g>
        <circle cx={circleCx} cy={circleCy} r={circleR + 20} fill="transparent" style={{ cursor: 'crosshair' }} onClick={handleCircleClick} role="button" aria-label="Click to place a point on the circle" />
        <circle cx={circleCx} cy={circleCy} r={circleR} fill={COLORS.primary} fillOpacity={0.06} stroke={COLORS.primary} strokeWidth={3} filter="url(#circleGlow)" pointerEvents="none" />
        {tickMarks.circleMarks}
        <circle cx={circleCx - circleR} cy={circleCy} r={3.5} fill={COLORS.surface} stroke={COLORS.amber} strokeWidth={1.5} />
        <text x={circleCx - circleR - 8} y={circleCy - 12} fill={COLORS.amber} fontSize={10} fontFamily={FONTS.mono} textAnchor="end">{"excl."}</text>

        {/* Rainbow path dots on circle */}
        {pathDots.map((pd, i) => {
          const p = parametricCircle(pd.u);
          return <circle key={`pc${i}`} cx={circleCx + p.x * circleR} cy={circleCy - p.y * circleR} r={2.5} fill={pd.color} opacity={0.85} />;
        })}

        {/* Waypoint markers on circle */}
        {path.map((wp, i) => {
          const p = parametricCircle(wp.u);
          const color = rainbowColor(i, path.length);
          return <circle key={`wp${i}`} cx={circleCx + p.x * circleR} cy={circleCy - p.y * circleR} r={5} fill={color} stroke="#fff" strokeWidth={1.5} />;
        })}
      </g>

      {/* ======== RIGHT PANEL: Single Chart ======== */}
      <g>
        <text x={chartX} y={chartY - 40} fill={COLORS.amber} fontSize={12} fontWeight={700} fontFamily={FONTS.body}>Chart</text>
        <text x={chartX + 50} y={chartY - 40} fill={COLORS.muted} fontSize={11} fontFamily={FONTS.mono}>{"\u03B8 \u2208 (\u2212\u03C0, \u03C0)"}</text>

        <line x1={chartX} y1={chartY} x2={chartX + chartW} y2={chartY} stroke={COLORS.amber} strokeWidth={3} strokeLinecap="round" />
        <circle cx={chartX} cy={chartY} r={4} fill={COLORS.surface} stroke={COLORS.amber} strokeWidth={1.5} />
        <circle cx={chartX + chartW} cy={chartY} r={4} fill={COLORS.surface} stroke={COLORS.amber} strokeWidth={1.5} />
        {tickMarks.chartMarks}

        <text x={chartX} y={chartY + 24} fill={COLORS.muted} fontSize={9} fontFamily={FONTS.mono} textAnchor="middle">{"\u2212\u03C0"}</text>
        <text x={chartX + chartW / 2} y={chartY + 24} fill={COLORS.muted} fontSize={9} fontFamily={FONTS.mono} textAnchor="middle">0</text>
        <text x={chartX + chartW} y={chartY + 24} fill={COLORS.muted} fontSize={9} fontFamily={FONTS.mono} textAnchor="middle">{"\u03C0"}</text>

        <rect x={chartX} y={chartY - 14} width={chartW} height={28} fill="transparent" style={{ cursor: 'crosshair' }} onClick={handleChartClick} role="button" aria-label="Click to place a point on the chart" />

        {/* Rainbow path dots on chart */}
        {pathDots.map((pd, i) => {
          const cx = chartX + thetaToChart(pd.u) * chartW;
          return <circle key={`pch${i}`} cx={cx} cy={chartY} r={2.5} fill={pd.color} opacity={0.85} />;
        })}

        {/* Waypoint markers on chart */}
        {path.map((wp, i) => {
          const cx = chartX + thetaToChart(wp.u) * chartW;
          const color = rainbowColor(i, path.length);
          return <circle key={`wpc${i}`} cx={cx} cy={chartY} r={5} fill={color} stroke="#fff" strokeWidth={1.5} />;
        })}
      </g>
    </svg>
  );
}
