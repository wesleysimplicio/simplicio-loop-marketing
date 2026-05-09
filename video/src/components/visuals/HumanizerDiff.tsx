import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {theme} from '../../theme';
import {useStrings} from '../../i18n';

export const HumanizerDiff: React.FC = () => {
  const frame = useCurrentFrame();
  const strings = useStrings();
  const fade = interpolate(frame, [40, 70], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

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
      <Block
        title={strings.humanizer.beforeTag}
        color={theme.danger}
        lines={strings.humanizer.before}
        opacity={1 - fade * 0.4}
        strike={fade > 0.3}
      />
      <div
        style={{
          textAlign: 'center',
          color: theme.textDim,
          fontFamily: theme.mono,
          fontSize: 18,
        }}
      >
        {strings.humanizer.arrow}
      </div>
      <Block
        title={strings.humanizer.afterTag}
        color={theme.accent}
        lines={strings.humanizer.after}
        opacity={fade}
      />
    </div>
  );
};

const Block: React.FC<{
  title: string;
  color: string;
  lines: string[];
  opacity: number;
  strike?: boolean;
}> = ({title, color, lines, opacity, strike}) => (
  <div
    style={{
      padding: 22,
      borderRadius: 16,
      background: `${color}10`,
      border: `1px solid ${color}33`,
      opacity,
    }}
  >
    <div
      style={{
        color,
        fontFamily: theme.mono,
        fontSize: 14,
        letterSpacing: 2,
        textTransform: 'uppercase',
        marginBottom: 10,
      }}
    >
      {title}
    </div>
    {lines.map((l, i) => (
      <div
        key={i}
        style={{
          color: theme.text,
          fontSize: 22,
          lineHeight: 1.4,
          textDecoration: strike ? 'line-through' : 'none',
          textDecorationColor: color,
        }}
      >
        {l}
      </div>
    ))}
  </div>
);
