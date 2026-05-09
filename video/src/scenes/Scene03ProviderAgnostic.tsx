import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Background} from '../components/Background';
import {AnimatedText} from '../components/AnimatedText';
import {Tag} from '../components/Tag';
import {SceneFrame} from '../components/Layout';
import {theme} from '../theme';

const PROVIDERS = [
  {name: 'claude', x: -260, y: -10, color: '#FFB070'},
  {name: 'codex', x: 0, y: -120, color: '#8AB4FF'},
  {name: 'deepseek', x: 260, y: -10, color: '#7CF6C8'},
  {name: 'higgsfield', x: -200, y: 150, color: '#F47AC2'},
  {name: 'topview', x: 60, y: 180, color: '#FFB070'},
  {name: 'wavespeed', x: 280, y: 130, color: '#7CF6C8'},
];

export const Scene03ProviderAgnostic: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  return (
    <SceneFrame>
      <Background tint={theme.accent3} />
      <AbsoluteFill
        style={{
          alignItems: 'center',
          justifyContent: 'flex-start',
          flexDirection: 'column',
          gap: 28,
          paddingTop: 100,
        }}
      >
        <Tag label="princípio nº 1" color={theme.accent3} />
        <AnimatedText text="Provider-agnostic" delay={6} size={92} weight={800} />
        <AnimatedText
          text="o llm-router escolhe — a skill nunca cita o provider"
          delay={26}
          size={26}
          weight={500}
          color={theme.textDim}
          stagger={0.6}
        />
      </AbsoluteFill>

      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
        <div style={{position: 'relative', width: 800, height: 460, marginTop: 240}}>
          <CenterRouter />
          {PROVIDERS.map((p, i) => (
            <ProviderNode key={p.name} {...p} delay={40 + i * 6} />
          ))}
          <Connections />
        </div>
      </AbsoluteFill>
    </SceneFrame>
  );
};

const CenterRouter: React.FC = () => {
  const frame = useCurrentFrame();
  const pulse = 1 + 0.04 * Math.sin(frame / 8);
  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        transform: `translate(-50%, -50%) scale(${pulse})`,
        width: 200,
        height: 200,
        borderRadius: 36,
        background: `linear-gradient(135deg, ${theme.accent}33, ${theme.accent2}22)`,
        border: `1px solid ${theme.accent}66`,
        boxShadow: `0 0 60px ${theme.accent}44`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        fontFamily: theme.font,
      }}
    >
      <div style={{fontSize: 60}}>🧭</div>
      <div style={{color: theme.accent, fontFamily: theme.mono, fontSize: 16, letterSpacing: 1.5}}>
        llm-router
      </div>
    </div>
  );
};

const ProviderNode: React.FC<{
  name: string;
  x: number;
  y: number;
  color: string;
  delay: number;
}> = ({name, x, y, color, delay}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: frame - delay, fps, config: {damping: 200}});
  const o = interpolate(s, [0, 1], [0, 1], {extrapolateRight: 'clamp'});
  const sc = interpolate(s, [0, 1], [0.6, 1]);
  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(${sc})`,
        opacity: o,
        padding: '10px 22px',
        borderRadius: 16,
        border: `1px solid ${color}66`,
        background: `${color}14`,
        color,
        fontFamily: theme.mono,
        fontSize: 18,
        letterSpacing: 1,
      }}
    >
      {name}
    </div>
  );
};

const Connections: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <svg
      width={800}
      height={460}
      style={{position: 'absolute', inset: 0, pointerEvents: 'none'}}
    >
      {PROVIDERS.map((p, i) => {
        const cx = 400;
        const cy = 230;
        const x = cx + p.x;
        const y = cy + p.y;
        const dash = 8;
        const offset = (frame * 1.5 + i * 12) % (dash * 2);
        return (
          <line
            key={p.name}
            x1={cx}
            y1={cy}
            x2={x}
            y2={y}
            stroke={p.color}
            strokeOpacity={0.5}
            strokeWidth={1.5}
            strokeDasharray={`${dash} ${dash}`}
            strokeDashoffset={-offset}
          />
        );
      })}
    </svg>
  );
};
