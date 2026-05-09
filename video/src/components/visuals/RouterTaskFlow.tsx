import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {theme} from '../../theme';
import {useStrings} from '../../i18n';

export const RouterTaskFlow: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const strings = useStrings();
  const TASKS = strings.router.tasks;
  return (
    <div
      style={{
        width: 720,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 22,
        padding: 28,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        fontFamily: theme.mono,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          color: theme.textDim,
          fontSize: 14,
          letterSpacing: 2,
          textTransform: 'uppercase',
        }}
      >
        <span>{strings.router.headerTask}</span>
        <span>{strings.router.headerProvider}</span>
      </div>
      {TASKS.map((t, i) => {
        const s = spring({frame: frame - 30 - i * 8, fps, config: {damping: 200}});
        const o = interpolate(s, [0, 1], [0, 1], {extrapolateRight: 'clamp'});
        const x = interpolate(s, [0, 1], [-20, 0]);
        const arrow = interpolate(s, [0, 1], [0, 1], {extrapolateRight: 'clamp'});
        return (
          <div
            key={t.task}
            style={{
              opacity: o,
              transform: `translateX(${x}px)`,
              display: 'grid',
              gridTemplateColumns: '180px 1fr 220px',
              alignItems: 'center',
              gap: 16,
              fontSize: 20,
            }}
          >
            <span
              style={{
                color: theme.text,
                background: 'rgba(255,255,255,0.06)',
                padding: '8px 14px',
                borderRadius: 10,
                textAlign: 'center',
              }}
            >
              {t.task}
            </span>
            <div
              style={{
                position: 'relative',
                height: 2,
                background: 'rgba(255,255,255,0.08)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  height: '100%',
                  width: `${arrow * 100}%`,
                  background: t.color,
                }}
              />
            </div>
            <span
              style={{
                color: t.color,
                background: `${t.color}14`,
                border: `1px solid ${t.color}55`,
                padding: '8px 14px',
                borderRadius: 10,
                textAlign: 'center',
              }}
            >
              {t.provider}
            </span>
          </div>
        );
      })}
    </div>
  );
};
