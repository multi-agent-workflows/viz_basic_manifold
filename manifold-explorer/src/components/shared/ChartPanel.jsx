import React from 'react';
import { COLORS } from '../../constants';

export default function ChartPanel({ x, y, width, height, label, children }) {
  const gridSpacing = 40;
  const gridLines = [];

  for (let gx = gridSpacing; gx < width; gx += gridSpacing) {
    gridLines.push(<line key={`v${gx}`} x1={x + gx} y1={y} x2={x + gx} y2={y + height} stroke={COLORS.grid} strokeWidth={0.5} opacity={0.12} />);
  }
  for (let gy = gridSpacing; gy < height; gy += gridSpacing) {
    gridLines.push(<line key={`h${gy}`} x1={x} y1={y + gy} x2={x + width} y2={y + gy} stroke={COLORS.grid} strokeWidth={0.5} opacity={0.12} />);
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
