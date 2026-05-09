import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {theme} from '../theme';

type Props = {
  text: string;
  delay?: number;
  size?: number;
  weight?: number;
  color?: string;
  letterSpacing?: number;
  align?: 'left' | 'center' | 'right';
  stagger?: number;
};

export const AnimatedText: React.FC<Props> = ({
  text,
  delay = 0,
  size = 64,
  weight = 700,
  color = theme.text,
  letterSpacing = -0.5,
  align = 'center',
  stagger = 1.4,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const chars = Array.from(text);

  return (
    <div
      style={{
        display: 'flex',
        justifyContent:
          align === 'center' ? 'center' : align === 'left' ? 'flex-start' : 'flex-end',
        flexWrap: 'wrap',
        fontFamily: theme.font,
        fontSize: size,
        fontWeight: weight,
        letterSpacing,
        color,
        lineHeight: 1.05,
      }}
    >
      {chars.map((c, i) => {
        const local = frame - delay - i * stagger;
        const s = spring({
          frame: local,
          fps,
          config: {damping: 200, mass: 0.6, stiffness: 200},
        });
        const opacity = interpolate(s, [0, 1], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        const y = interpolate(s, [0, 1], [22, 0]);
        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              transform: `translateY(${y}px)`,
              opacity,
              whiteSpace: 'pre',
            }}
          >
            {c}
          </span>
        );
      })}
    </div>
  );
};
