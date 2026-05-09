import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {theme} from '../../theme';
import {useStrings} from '../../i18n';

export const BatchGrid: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const strings = useStrings();
  const VARIANTS = strings.batch.variants;
  return (
    <div
      style={{
        width: 740,
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 14,
        fontFamily: theme.font,
      }}
    >
      {VARIANTS.map((v, i) => {
        const s = spring({frame: frame - 20 - i * 5, fps, config: {damping: 200}});
        const o = interpolate(s, [0, 1], [0, 1], {extrapolateRight: 'clamp'});
        const sc = interpolate(s, [0, 1], [0.85, 1]);
        const winnerGlow = v.winner ? 0.5 + 0.5 * Math.sin(frame / 6) : 0;
        return (
          <div
            key={i}
            style={{
              opacity: o,
              transform: `scale(${sc})`,
              padding: 14,
              borderRadius: 14,
              background: 'rgba(255,255,255,0.04)',
              border: `1px solid ${v.winner ? theme.success : 'rgba(255,255,255,0.08)'}`,
              boxShadow: v.winner ? `0 0 ${20 + winnerGlow * 18}px ${theme.success}66` : 'none',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              position: 'relative',
            }}
          >
            <div
              style={{
                aspectRatio: '1 / 1',
                borderRadius: 10,
                background: `linear-gradient(135deg, ${
                  ['#7CF6C8', '#8AB4FF', '#FFB070', '#F47AC2'][i % 4]
                }55, #0B0F1A)`,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: 12,
                  display: 'flex',
                  alignItems: 'flex-end',
                  color: '#FFF',
                  fontSize: 14,
                  fontWeight: 700,
                  textShadow: '0 2px 8px rgba(0,0,0,0.6)',
                  lineHeight: 1.2,
                }}
              >
                {v.hook}
              </div>
              {v.winner ? (
                <div
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    background: theme.success,
                    color: theme.bg,
                    fontFamily: theme.mono,
                    fontSize: 10,
                    padding: '4px 8px',
                    borderRadius: 999,
                    letterSpacing: 1.5,
                    fontWeight: 700,
                  }}
                >
                  {strings.batch.winnerLabel}
                </div>
              ) : null}
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                color: theme.textDim,
                fontFamily: theme.mono,
                fontSize: 12,
              }}
            >
              <span>v{i + 1}</span>
              <span>{v.cost}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
