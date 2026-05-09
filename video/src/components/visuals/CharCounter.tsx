import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {theme} from '../../theme';
import {useStrings} from '../../i18n';

export const CharCounter: React.FC = () => {
  const frame = useCurrentFrame();
  const strings = useStrings();
  const SAMPLES = strings.copy.samples;
  return (
    <div
      style={{
        width: 720,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        fontFamily: theme.font,
      }}
    >
      {SAMPLES.map((s, i) => {
        const startAt = 18 + i * 28;
        const typed = Math.max(0, Math.min(s.text.length, frame - startAt));
        const visible = s.text.slice(0, typed);
        const ratio = visible.length / s.limit;
        const bar = Math.min(1, ratio);
        return (
          <div
            key={s.label}
            style={{
              padding: 18,
              borderRadius: 16,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              opacity: interpolate(frame, [startAt - 6, startAt], [0, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              }),
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: 8,
                color: theme.textDim,
                fontFamily: theme.mono,
                fontSize: 14,
                letterSpacing: 2,
                textTransform: 'uppercase',
              }}
            >
              <span style={{color: s.color}}>{s.label}</span>
              <span>
                {visible.length}/{s.limit}
              </span>
            </div>
            <div
              style={{
                color: theme.text,
                fontSize: 22,
                minHeight: 30,
              }}
            >
              {visible}
              <span
                style={{
                  display: 'inline-block',
                  width: 8,
                  height: 22,
                  background: s.color,
                  marginLeft: 4,
                  opacity: Math.floor(frame / 6) % 2,
                  verticalAlign: 'middle',
                }}
              />
            </div>
            <div
              style={{
                marginTop: 12,
                height: 4,
                background: 'rgba(255,255,255,0.08)',
                borderRadius: 999,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${bar * 100}%`,
                  background: s.color,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
