import React, { useState, useEffect, useRef, useCallback } from 'react';
import { COLORS, FONTS, LAYOUT, ANIMATION, MANIFOLDS } from './constants';
import CircleManifold from './components/CircleManifold';
import SphereManifold from './components/SphereManifold';
import CylinderManifold from './components/CylinderManifold';
import TorusManifold from './components/TorusManifold';
import KleinBottleManifold from './components/KleinBottleManifold';
import TeachingText from './components/shared/TeachingText';

const COMPONENTS = [CircleManifold, SphereManifold, CylinderManifold, TorusManifold, KleinBottleManifold];

export default function App() {
  const [activeManifold, setActiveManifold] = useState(0);
  const [dot, setDot] = useState(null);
  const [rotation, setRotation] = useState({ x: 0.3, y: 0 });
  const [teachingText, setTeachingText] = useState('');

  // Cross-fade state
  const [displayedManifold, setDisplayedManifold] = useState(0);
  const [fadeState, setFadeState] = useState('visible'); // 'visible' | 'fading-out' | 'fading-in'

  // Content area measurement
  const contentRef = useRef(null);
  const [contentSize, setContentSize] = useState({ width: 800, height: 500 });

  // Switch manifold with cross-fade
  const switchManifold = useCallback((index) => {
    if (index < 0 || index >= MANIFOLDS.length || index === activeManifold) return;
    setActiveManifold(index);
    setDot(null);
    setRotation({ x: 0.3, y: 0 });
    setTeachingText('');
    setFadeState('fading-out');
  }, [activeManifold]);

  // Handle cross-fade transitions
  useEffect(() => {
    if (fadeState === 'fading-out') {
      const timer = setTimeout(() => {
        setDisplayedManifold(activeManifold);
        setFadeState('fading-in');
      }, ANIMATION.crossFadeDuration / 2);
      return () => clearTimeout(timer);
    }
    if (fadeState === 'fading-in') {
      const timer = setTimeout(() => {
        setFadeState('visible');
      }, ANIMATION.crossFadeDuration / 2);
      return () => clearTimeout(timer);
    }
  }, [fadeState, activeManifold]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') {
        switchManifold(activeManifold - 1);
      } else if (e.key === 'ArrowRight') {
        switchManifold(activeManifold + 1);
      } else if (e.key >= '1' && e.key <= '5') {
        switchManifold(Number(e.key) - 1);
      } else if (e.key === 'Escape') {
        setDot(null);
        setTeachingText('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeManifold, switchManifold]);

  // Measure content area
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setContentSize({
          width: Math.floor(entry.contentRect.width),
          height: Math.floor(entry.contentRect.height),
        });
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const ActiveComponent = COMPONENTS[displayedManifold] || COMPONENTS[0];

  const fadeOpacity = fadeState === 'fading-out' ? 0 : 1;

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      background: COLORS.background,
      color: COLORS.text,
      fontFamily: FONTS.body,
    }}>
      {/* Header */}
      <header style={{ padding: '16px 24px 0', flexShrink: 0 }}>
        <h1 style={{
          fontFamily: FONTS.display,
          fontSize: 28,
          fontWeight: 800,
          background: 'linear-gradient(135deg, #38bdf8, #22d3ee)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          textShadow: '0 0 30px rgba(56, 189, 248, 0.15)',
          marginBottom: 12,
        }}>
          Manifold Chart Explorer
        </h1>

        {/* Tab Bar */}
        <nav style={{ display: 'flex', gap: 4 }} role="tablist">
          {MANIFOLDS.map((m, i) => {
            const isActive = i === activeManifold;
            return (
              <button
                key={m.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => switchManifold(i)}
                style={{
                  background: 'none',
                  border: 'none',
                  borderBottom: isActive ? `3px solid ${COLORS.primary}` : '3px solid transparent',
                  color: isActive ? COLORS.primary : COLORS.muted,
                  fontFamily: FONTS.body,
                  fontWeight: 500,
                  fontSize: 14,
                  padding: '8px 16px',
                  cursor: 'pointer',
                  transition: 'color 0.2s, border-color 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.color = COLORS.text;
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.color = COLORS.muted;
                }}
              >
                <span style={{ fontSize: 16 }}>{m.icon}</span>
                {m.name}
              </button>
            );
          })}
        </nav>

        {/* Subtitle */}
        <p style={{
          fontFamily: FONTS.body,
          fontWeight: 400,
          fontSize: 13,
          color: COLORS.muted,
          marginTop: 8,
          marginBottom: 4,
        }}>
          {MANIFOLDS[activeManifold].subtitle}
        </p>
      </header>

      {/* Main Content Area */}
      <div
        ref={contentRef}
        role="tabpanel"
        aria-label={MANIFOLDS[activeManifold].name}
        style={{
          flex: 1,
          position: 'relative',
          overflow: 'hidden',
          background: 'radial-gradient(ellipse at center, #0f172a 0%, #0a0f1a 100%)',
        }}
      >
        {/* Faint grid overlay */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            `linear-gradient(${COLORS.grid}0D 1px, transparent 1px), ` +
            `linear-gradient(90deg, ${COLORS.grid}0D 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
          pointerEvents: 'none',
          zIndex: 0,
        }} />

        {/* Manifold component with cross-fade */}
        <div style={{
          position: 'absolute',
          inset: 0,
          opacity: fadeOpacity,
          transition: `opacity ${ANIMATION.crossFadeDuration / 2}ms ease-out`,
          zIndex: 1,
        }}>
          <ActiveComponent
            dot={dot}
            onDotPlace={setDot}
            rotation={rotation}
            onRotationChange={setRotation}
            width={contentSize.width}
            height={contentSize.height}
            onTeachingText={setTeachingText}
          />
        </div>
      </div>

      {/* Teaching Text Bar */}
      <div
        style={{
          flexShrink: 0,
          background: COLORS.surface,
          borderTop: `1px solid ${COLORS.grid}`,
        }}
      >
        <TeachingText text={teachingText || 'Click on the manifold to place a dot and explore its charts.'} />
      </div>
    </div>
  );
}
