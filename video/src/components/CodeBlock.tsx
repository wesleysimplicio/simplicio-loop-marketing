import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {theme} from '../theme';

type Token = {text: string; color?: string};

export const CodeBlock: React.FC<{
  title?: string;
  lines: Token[][];
  delay?: number;
  width?: number;
}> = ({title, lines, delay = 0, width = 640}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: frame - delay, fps, config: {damping: 180}});
  const opacity = interpolate(s, [0, 1], [0, 1], {extrapolateRight: 'clamp'});
  const y = interpolate(s, [0, 1], [16, 0]);

  return (
    <div
      style={{
        opacity,
        transform: `translateY(${y}px)`,
        width,
        borderRadius: 18,
        overflow: 'hidden',
        background: '#0E1422',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 30px 60px rgba(0,0,0,0.5)',
        fontFamily: theme.mono,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '12px 16px',
          background: 'rgba(255,255,255,0.04)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <span style={dot('#FF6B6B')} />
        <span style={dot('#FFD166')} />
        <span style={dot('#5EE6B6')} />
        {title ? (
          <span
            style={{
              marginLeft: 12,
              color: theme.textDim,
              fontSize: 14,
              letterSpacing: 0.4,
            }}
          >
            {title}
          </span>
        ) : null}
      </div>
      <div style={{padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 6}}>
        {lines.map((line, idx) => {
          const ls = spring({
            frame: frame - delay - 6 - idx * 4,
            fps,
            config: {damping: 200},
          });
          const lo = interpolate(ls, [0, 1], [0, 1], {extrapolateRight: 'clamp'});
          return (
            <div
              key={idx}
              style={{
                display: 'flex',
                gap: 16,
                opacity: lo,
                fontSize: 18,
                lineHeight: 1.5,
              }}
            >
              <span style={{color: 'rgba(255,255,255,0.18)', width: 22, textAlign: 'right'}}>
                {idx + 1}
              </span>
              <span style={{color: theme.text}}>
                {line.map((t, j) => (
                  <span key={j} style={{color: t.color ?? theme.text}}>
                    {t.text}
                  </span>
                ))}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const dot = (color: string): React.CSSProperties => ({
  width: 12,
  height: 12,
  borderRadius: 999,
  background: color,
});
