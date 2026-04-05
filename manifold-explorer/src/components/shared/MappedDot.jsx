import React from 'react';
import { COLORS } from '../../constants';

export default function MappedDot({ cx, cy, color = COLORS.amber, r = 6, label = null, animate = true }) {
  return (
    <g style={{
      transformOrigin: `${cx}px ${cy}px`,
      animation: animate ? 'dotScaleIn 200ms cubic-bezier(0.34, 1.56, 0.64, 1) both' : undefined,
    }}>
      {/* Glow */}
      <circle
        cx={cx} cy={cy} r={r + 4}
        fill={color}
        opacity={0.3}
        style={animate ? { animation: 'dotPulse 2s ease-in-out infinite' } : undefined}
      />
      {/* Main dot */}
      <circle cx={cx} cy={cy} r={r} fill={color} />
      {/* Label */}
      {label && (
        <text
          x={cx + r + 6} y={cy + 4}
          fill={COLORS.muted}
          fontSize={11}
          fontFamily="'JetBrains Mono', monospace"
        >
          {label}
        </text>
      )}
    </g>
  );
}
