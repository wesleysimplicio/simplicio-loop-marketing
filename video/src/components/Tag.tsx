import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {theme} from '../theme';

export const Tag: React.FC<{
  label: string;
  delay?: number;
  color?: string;
}> = ({label, delay = 0, color = theme.accent}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: frame - delay, fps, config: {damping: 200}});
  const opacity = interpolate(s, [0, 1], [0, 1], {extrapolateRight: 'clamp'});
  const y = interpolate(s, [0, 1], [10, 0]);
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 18px',
        borderRadius: 999,
        border: `1px solid ${color}55`,
        background: `${color}14`,
        color,
        fontFamily: theme.mono,
        fontSize: 18,
        fontWeight: 600,
        letterSpacing: 1.5,
        textTransform: 'uppercase',
        opacity,
        transform: `translateY(${y}px)`,
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: 999,
          background: color,
          boxShadow: `0 0 14px ${color}`,
        }}
      />
      {label}
    </div>
  );
};
