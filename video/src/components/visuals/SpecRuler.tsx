import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {theme} from '../../theme';

const CHECKS = [
  {label: 'aspect ratio', value: '9:16', expected: '9:16', ok: true},
  {label: 'duração', value: '6.0s', expected: '≤ 60s', ok: true},
  {label: 'tamanho', value: '8.4 MB', expected: '≤ 10 MB', ok: true},
  {label: 'codec', value: 'h264', expected: 'h264 / vp9', ok: true},
  {label: 'safe area', value: '88%', expected: '≥ 90%', ok: false},
];

export const SpecRuler: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return (
    <div
      style={{
        width: 740,
        display: 'flex',
        gap: 22,
        fontFamily: theme.font,
      }}
    >
      <div
        style={{
          width: 240,
          aspectRatio: '9 / 16',
          borderRadius: 18,
          background: `linear-gradient(180deg, #1B1F33, #0B0F1A)`,
          border: '1px solid rgba(255,255,255,0.1)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 16,
            border: `2px dashed ${theme.accent2}66`,
            borderRadius: 12,
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 30,
            left: 30,
            right: 30,
            color: theme.accent2,
            fontFamily: theme.mono,
            fontSize: 12,
            letterSpacing: 1.6,
            textTransform: 'uppercase',
          }}
        >
          safe area · 90%
        </div>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFF',
            fontSize: 16,
            fontWeight: 700,
            textAlign: 'center',
            padding: 18,
          }}
        >
          texto pode ficar cortado em telas menores
        </div>
        <div
          style={{
            position: 'absolute',
            bottom: 14,
            left: 14,
            right: 14,
            display: 'flex',
            justifyContent: 'space-between',
            color: theme.textDim,
            fontFamily: theme.mono,
            fontSize: 11,
          }}
        >
          <span>9:16</span>
          <span>1080×1920</span>
        </div>
      </div>

      <div style={{flex: 1, display: 'flex', flexDirection: 'column', gap: 10}}>
        {CHECKS.map((c, i) => {
          const s = spring({frame: frame - 18 - i * 8, fps, config: {damping: 200}});
          const o = interpolate(s, [0, 1], [0, 1], {extrapolateRight: 'clamp'});
          const y = interpolate(s, [0, 1], [10, 0]);
          const color = c.ok ? theme.success : theme.danger;
          return (
            <div
              key={c.label}
              style={{
                opacity: o,
                transform: `translateY(${y}px)`,
                display: 'grid',
                gridTemplateColumns: '160px 1fr 100px 50px',
                alignItems: 'center',
                gap: 12,
                padding: '12px 16px',
                borderRadius: 12,
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${color}33`,
              }}
            >
              <span style={{color: theme.text, fontSize: 16}}>{c.label}</span>
              <span style={{color: theme.text, fontFamily: theme.mono, fontSize: 16}}>{c.value}</span>
              <span
                style={{
                  color: theme.textDim,
                  fontFamily: theme.mono,
                  fontSize: 14,
                }}
              >
                {c.expected}
              </span>
              <span
                style={{
                  color,
                  fontFamily: theme.mono,
                  fontSize: 16,
                  textAlign: 'center',
                  fontWeight: 700,
                }}
              >
                {c.ok ? 'OK' : 'FAIL'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
