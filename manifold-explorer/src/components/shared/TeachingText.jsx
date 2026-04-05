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
        height: LAYOUT.teachingBarHeight,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 32px',
        fontFamily: FONTS.body,
        fontSize: 15,
        color: COLORS.text,
        opacity,
        transition: 'opacity 300ms ease',
        textAlign: 'center',
      }}
      aria-live="polite"
    >
      {displayText}
    </div>
  );
}
