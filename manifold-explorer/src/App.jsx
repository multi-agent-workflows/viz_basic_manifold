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
      background: '#1a1726',
      color: COLORS.text,
      fontFamily: FONTS.body,
    }}>
      {/* Header */}
      <header style={{
        padding: '20px 32px 0',
        flexShrink: 0,
        borderBottom: '1px solid rgba(56, 189, 248, 0.08)',
        background: 'linear-gradient(180deg, rgba(26,23,38,1) 0%, rgba(15,23,42,0.95) 100%)',
      }}>
        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 16 }}>
          <h1 style={{
            fontFamily: FONTS.display,
            fontSize: 26,
            fontWeight: 700,
            letterSpacing: '1px',
            background: 'linear-gradient(135deg, #38bdf8 0%, #a78bfa 50%, #22d3ee 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            Manifold Chart Explorer
          </h1>
          <span style={{
            fontFamily: "'Lora', serif",
            fontSize: 13,
            fontWeight: 400,
            fontStyle: 'italic',
            color: 'rgba(148, 163, 184, 0.6)',
            letterSpacing: '0.3px',
          }}>
            Interactive atlas of curved spaces
          </span>
        </div>

        {/* Tab Bar */}
        <nav style={{ display: 'flex', gap: 2 }} role="tablist">
          {MANIFOLDS.map((m, i) => {
            const isActive = i === activeManifold;
            return (
              <button
                key={m.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => switchManifold(i)}
                style={{
                  background: isActive ? 'rgba(56, 189, 248, 0.08)' : 'transparent',
                  border: 'none',
                  borderBottom: isActive ? '2px solid #38bdf8' : '2px solid transparent',
                  color: isActive ? '#f1f5f9' : 'rgba(148, 163, 184, 0.7)',
                  fontFamily: FONTS.body,
                  fontWeight: isActive ? 500 : 400,
                  fontSize: 13,
                  padding: '10px 18px 10px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  borderRadius: '6px 6px 0 0',
                  position: 'relative',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = '#f1f5f9';
                    e.currentTarget.style.background = 'rgba(56, 189, 248, 0.04)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = 'rgba(148, 163, 184, 0.7)';
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                <span style={{
                  fontSize: 15,
                  opacity: isActive ? 1 : 0.5,
                  transition: 'opacity 0.3s',
                }}>{m.icon}</span>
                {m.name}
              </button>
            );
          })}
        </nav>

        {/* Subtitle */}
        <p style={{
          fontFamily: "'Lora', serif",
          fontWeight: 400,
          fontStyle: 'italic',
          fontSize: 14,
          color: 'rgba(148, 163, 184, 0.5)',
          letterSpacing: '0.5px',
          lineHeight: 1.6,
          padding: '10px 0 6px',
          animation: 'slideUp 0.4s ease-out',
        }}
        key={activeManifold}
        >
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
          background: 'radial-gradient(ellipse at 30% 50%, rgba(56, 189, 248, 0.03) 0%, #0f172a 50%, #0a0f1a 100%)',
        }}
      >
        {/* Faint grid overlay */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            `linear-gradient(rgba(56, 189, 248, 0.03) 1px, transparent 1px), ` +
            `linear-gradient(90deg, rgba(56, 189, 248, 0.03) 1px, transparent 1px)`,
          backgroundSize: '48px 48px',
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
          background: 'linear-gradient(180deg, rgba(30,41,59,0.8) 0%, rgba(26,23,38,0.95) 100%)',
          borderTop: '1px solid rgba(56, 189, 248, 0.08)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <TeachingText text={teachingText || 'Click on the manifold to place a dot and explore its charts.'} />
      </div>
    </div>
  );
}
