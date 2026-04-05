import React, { useState, useEffect } from 'react';
import { COLORS, FONTS, LAYOUT } from '../../constants';

export default function TeachingText({ text }) {
  const [displayText, setDisplayText] = useState(text);
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    setOpacity(0);
    const timer = setTimeout(() => {
      setDisplayText(text);
      setOpacity(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [text]);

  return (
    <div
      style={{
        height: LAYOUT.teachingBarHeight + 4,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 48px',
        fontFamily: "'Lora', serif",
        fontSize: 15,
        fontWeight: 400,
        fontStyle: 'italic',
        color: 'rgba(241, 245, 249, 0.85)',
        letterSpacing: '0.3px',
        lineHeight: 1.7,
        opacity,
        transition: 'opacity 400ms ease',
        textAlign: 'center',
      }}
      aria-live="polite"
    >
      {displayText}
    </div>
  );
}
