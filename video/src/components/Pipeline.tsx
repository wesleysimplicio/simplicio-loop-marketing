import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {theme} from '../theme';

const STEPS = [
  {label: 'brief', color: theme.textDim, emoji: '📝'},
  {label: 'script', color: theme.accent2, emoji: '🧠'},
  {label: 'creative', color: theme.accent, emoji: '🎬'},
  {label: 'caption', color: theme.accent4, emoji: '📣'},
  {label: 'compliance', color: theme.danger, emoji: '🛡️'},
  {label: 'publish', color: theme.success, emoji: '🚀'},
  {label: 'metrics', color: theme.accent3, emoji: '📊'},
  {label: 'ads', color: theme.accent2, emoji: '🎯'},
];

export const Pipeline: React.FC<{highlight?: string; delay?: number}> = ({
  highlight,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        flexWrap: 'wrap',
        maxWidth: 1700,
      }}
    >
      {STEPS.map((step, i) => {
        const s = spring({
          frame: frame - delay - i * 4,
          fps,
          config: {damping: 200, stiffness: 160},
        });
        const opacity = interpolate(s, [0, 1], [0, 1], {extrapolateRight: 'clamp'});
        const y = interpolate(s, [0, 1], [12, 0]);
        const isActive = highlight === step.label;
        const pulse = isActive
          ? 1 + 0.04 * Math.sin((frame - delay) / 6)
          : 1;
        return (
          <React.Fragment key={step.label}>
            <div
              style={{
                opacity,
                transform: `translateY(${y}px) scale(${pulse})`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <div
                style={{
                  width: 110,
                  height: 110,
                  borderRadius: 24,
                  background: isActive
                    ? `linear-gradient(135deg, ${step.color}55, ${step.color}11)`
                    : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${
                    isActive ? step.color : 'rgba(255,255,255,0.1)'
                  }`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 48,
                  boxShadow: isActive ? `0 0 38px ${step.color}66` : 'none',
                }}
              >
                {step.emoji}
              </div>
              <div
                style={{
                  fontFamily: theme.mono,
                  fontSize: 16,
                  color: isActive ? step.color : theme.textDim,
                  letterSpacing: 1.4,
                  textTransform: 'uppercase',
                  fontWeight: 600,
                }}
              >
                {step.label}
              </div>
            </div>
            {i < STEPS.length - 1 ? (
              <Arrow delay={delay + i * 4 + 2} active={isActive} />
            ) : null}
          </React.Fragment>
        );
      })}
    </div>
  );
};

const Arrow: React.FC<{delay: number; active?: boolean}> = ({delay, active}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: frame - delay, fps, config: {damping: 200}});
  const w = interpolate(s, [0, 1], [0, 28], {extrapolateRight: 'clamp'});
  return (
    <div
      style={{
        width: 28,
        height: 2,
        marginTop: 28,
        background: 'rgba(255,255,255,0.08)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          height: '100%',
          width: w,
          background: active ? theme.accent : 'rgba(255,255,255,0.35)',
        }}
      />
    </div>
  );
};
