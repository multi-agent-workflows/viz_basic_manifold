import React from 'react';
import { COLORS } from '../../constants';

export default function ChartPanel({ x, y, width, height, label, children, uSteps, vSteps }) {
  const gridLines = [];

  if (uSteps && vSteps) {
    // Parametric grid: lines at the same parameter values as the 3D wireframe
    for (let i = 1; i < uSteps; i++) {
      const gx = (i / uSteps) * width;
      gridLines.push(<line key={`v${i}`} x1={x + gx} y1={y} x2={x + gx} y2={y + height} stroke={COLORS.primary} strokeWidth={0.8} opacity={0.35} />);
    }
    for (let j = 1; j < vSteps; j++) {
      const gy = (j / vSteps) * height;
      gridLines.push(<line key={`h${j}`} x1={x} y1={y + gy} x2={x + width} y2={y + gy} stroke={COLORS.primary} strokeWidth={0.8} opacity={0.35} />);
    }
  } else {
    // Fallback: fixed spacing grid
    const gridSpacing = 40;
    for (let gx = gridSpacing; gx < width; gx += gridSpacing) {
      gridLines.push(<line key={`v${gx}`} x1={x + gx} y1={y} x2={x + gx} y2={y + height} stroke={COLORS.grid} strokeWidth={0.5} opacity={0.12} />);
    }
    for (let gy = gridSpacing; gy < height; gy += gridSpacing) {
      gridLines.push(<line key={`h${gy}`} x1={x} y1={y + gy} x2={x + width} y2={y + gy} stroke={COLORS.grid} strokeWidth={0.5} opacity={0.12} />);
    }
  }

  return (
    <g>
      {/* Background */}
      <rect x={x} y={y} width={width} height={height} fill={COLORS.surface} stroke={COLORS.grid} strokeWidth={1} rx={8} ry={8} />
      {/* Grid */}
      {gridLines}
      {/* Label */}
      {label && (
        <text x={x + 8} y={y + 16} fill={COLORS.muted} fontSize={12} fontWeight={700} fontFamily="'DM Sans', sans-serif">
          {label}
        </text>
      )}
      {/* Content */}
      {children}
    </g>
  );
}
