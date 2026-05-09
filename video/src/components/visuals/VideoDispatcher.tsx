import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {theme} from '../../theme';

const ROUTES = [
  {brief: 'editorial · cinematic reel', target: 'higgsfield', color: theme.accent},
  {brief: 'avatar UGC · talking head', target: 'topview', color: theme.accent2},
  {brief: 'A/B hooks · lote barato', target: 'wavespeed', color: theme.accent3},
];

export const VideoDispatcher: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        width: 740,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 22,
        padding: 28,
        fontFamily: theme.font,
      }}
    >
      <div
        style={{
          fontFamily: theme.mono,
          fontSize: 14,
          letterSpacing: 2,
          textTransform: 'uppercase',
          color: theme.textDim,
          marginBottom: 16,
        }}
      >
        video-prompt-builder · dispatcher
      </div>

      <div style={{display: 'flex', flexDirection: 'column', gap: 14}}>
        {ROUTES.map((r, i) => {
          const start = 18 + i * 14;
          const o = interpolate(frame, [start, start + 12], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
          const w = interpolate(frame, [start + 6, start + 18], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
          return (
            <div
              key={i}
              style={{
                opacity: o,
                display: 'grid',
                gridTemplateColumns: '1fr 80px 200px',
                alignItems: 'center',
                gap: 14,
              }}
            >
              <div
                style={{
                  color: theme.text,
                  fontSize: 18,
                  background: 'rgba(255,255,255,0.04)',
                  padding: '12px 16px',
                  borderRadius: 12,
                }}
              >
                {r.brief}
              </div>
              <div
                style={{
                  height: 2,
                  background: 'rgba(255,255,255,0.08)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: `${w * 100}%`,
                    background: r.color,
                  }}
                />
              </div>
              <div
                style={{
                  color: r.color,
                  fontFamily: theme.mono,
                  fontSize: 18,
                  border: `1px solid ${r.color}55`,
                  background: `${r.color}14`,
                  padding: '10px 16px',
                  borderRadius: 12,
                  textAlign: 'center',
                  letterSpacing: 1.2,
                }}
              >
                {r.target}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
