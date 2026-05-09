import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {theme} from '../../theme';
import {useStrings} from '../../i18n';

export const Cinematic: React.FC = () => {
  const frame = useCurrentFrame();
  const strings = useStrings();
  const PARAMS = strings.cinematic.params;
  return (
    <div
      style={{
        width: 720,
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
        fontFamily: theme.font,
      }}
    >
      <div
        style={{
          position: 'relative',
          aspectRatio: '16 / 9',
          borderRadius: 18,
          overflow: 'hidden',
          background: `linear-gradient(135deg, #1A1F33, #0B0F1A)`,
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `radial-gradient(circle at ${
              30 + Math.sin(frame / 12) * 6
            }% 40%, ${theme.accent}55, transparent 55%)`,
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `radial-gradient(circle at 75% 70%, ${theme.accent4}33, transparent 60%)`,
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 16,
            left: 16,
            right: 16,
            display: 'flex',
            justifyContent: 'space-between',
            color: 'rgba(255,255,255,0.7)',
            fontFamily: theme.mono,
            fontSize: 12,
            letterSpacing: 1.6,
            textTransform: 'uppercase',
          }}
        >
          <span>{strings.cinematic.headerLeft}</span>
          <span>{strings.cinematic.headerRight}</span>
        </div>
        <div
          style={{
            position: 'absolute',
            bottom: 16,
            left: 16,
            right: 16,
            display: 'flex',
            justifyContent: 'space-between',
            color: 'rgba(255,255,255,0.7)',
            fontFamily: theme.mono,
            fontSize: 12,
            letterSpacing: 1.6,
            textTransform: 'uppercase',
          }}
        >
          <span>9:16 · 6s</span>
          <span>00:0{Math.floor((frame / 30) % 6)}</span>
        </div>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            pointerEvents: 'none',
          }}
        >
          <div style={{borderRight: '1px solid rgba(255,255,255,0.06)'}} />
          <div style={{borderRight: '1px solid rgba(255,255,255,0.06)'}} />
          <div />
        </div>
      </div>
      <div
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 16,
          padding: 18,
          display: 'grid',
          gridTemplateColumns: '160px 1fr',
          rowGap: 8,
          columnGap: 14,
          fontFamily: theme.mono,
        }}
      >
        {PARAMS.map((p, i) => {
          const o = interpolate(frame, [30 + i * 4, 38 + i * 4], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
          return (
            <React.Fragment key={p.k}>
              <span style={{color: theme.accent, fontSize: 16, opacity: o}}>{p.k}</span>
              <span style={{color: theme.text, fontSize: 16, opacity: o}}>{p.v}</span>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
