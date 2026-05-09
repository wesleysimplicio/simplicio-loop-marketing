import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {theme} from '../theme';

export const SceneFrame: React.FC<{
  children: React.ReactNode;
  fadeIn?: number;
  fadeOut?: number;
}> = ({children, fadeIn = 8, fadeOut = 8}) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const opacity = interpolate(
    frame,
    [0, fadeIn, durationInFrames - fadeOut, durationInFrames],
    [0, 1, 1, 0],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}
  );
  return <AbsoluteFill style={{opacity}}>{children}</AbsoluteFill>;
};

export const Stack: React.FC<{
  children: React.ReactNode;
  gap?: number;
  align?: 'flex-start' | 'center' | 'flex-end';
  justify?: 'flex-start' | 'center' | 'flex-end';
  direction?: 'row' | 'column';
  style?: React.CSSProperties;
}> = ({children, gap = 24, align = 'center', justify = 'center', direction = 'column', style}) => (
  <AbsoluteFill
    style={{
      display: 'flex',
      flexDirection: direction,
      alignItems: align,
      justifyContent: justify,
      gap,
      padding: 96,
      ...style,
    }}
  >
    {children}
  </AbsoluteFill>
);

export const SceneTitle: React.FC<{label: string; color?: string}> = ({label, color = theme.accent}) => (
  <div
    style={{
      color,
      fontFamily: theme.mono,
      fontSize: 22,
      letterSpacing: 3,
      textTransform: 'uppercase',
      fontWeight: 600,
    }}
  >
    {label}
  </div>
);
