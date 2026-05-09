import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {theme} from '../theme';

export const Background: React.FC<{tint?: string}> = ({tint = theme.accent}) => {
  const frame = useCurrentFrame();
  const {height, width} = useVideoConfig();

  const dots = React.useMemo(() => {
    const out = [] as {x: number; y: number; r: number; seed: number}[];
    let seed = 11;
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    for (let i = 0; i < 80; i++) {
      out.push({
        x: rand() * width,
        y: rand() * height,
        r: 1 + rand() * 2.4,
        seed: rand() * 100,
      });
    }
    return out;
  }, [width, height]);

  return (
    <AbsoluteFill style={{background: theme.bgDeep}}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 20% 20%, ${tint}22, transparent 55%), radial-gradient(circle at 80% 80%, ${theme.accent2}22, transparent 60%), linear-gradient(180deg, ${theme.bg}, ${theme.bgDeep})`,
        }}
      />
      <svg
        width={width}
        height={height}
        style={{position: 'absolute', inset: 0, opacity: 0.35}}
      >
        <defs>
          <pattern id="grid" width="80" height="80" patternUnits="userSpaceOnUse">
            <path
              d="M 80 0 L 0 0 0 80"
              fill="none"
              stroke="rgba(255,255,255,0.05)"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect width={width} height={height} fill="url(#grid)" />
      </svg>
      <svg width={width} height={height} style={{position: 'absolute', inset: 0}}>
        {dots.map((d, i) => {
          const t = (frame + d.seed * 6) / 30;
          const opacity = 0.25 + 0.5 * (0.5 + 0.5 * Math.sin(t + i));
          const dy = Math.sin(t * 0.6 + i) * 6;
          return (
            <circle
              key={i}
              cx={d.x}
              cy={d.y + dy}
              r={d.r}
              fill={i % 5 === 0 ? tint : '#FFFFFF'}
              opacity={opacity}
            />
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};
