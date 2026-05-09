import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Background} from '../components/Background';
import {AnimatedText} from '../components/AnimatedText';
import {SceneFrame} from '../components/Layout';
import {theme} from '../theme';

export const Scene01Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const logoSpring = spring({frame, fps, config: {damping: 200, stiffness: 130}});
  const logoScale = interpolate(logoSpring, [0, 1], [0.6, 1]);
  const logoOpacity = interpolate(logoSpring, [0, 1], [0, 1]);
  const ringRotate = (frame / 2) % 360;

  return (
    <SceneFrame>
      <Background tint={theme.accent} />
      <AbsoluteFill
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 38,
        }}
      >
        <div
          style={{
            position: 'relative',
            width: 220,
            height: 220,
            opacity: logoOpacity,
            transform: `scale(${logoScale})`,
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              border: `2px dashed ${theme.accent}55`,
              transform: `rotate(${ringRotate}deg)`,
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 18,
              borderRadius: '50%',
              border: `2px solid ${theme.accent2}55`,
              transform: `rotate(${-ringRotate * 0.6}deg)`,
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 38,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${theme.accent}33, transparent 70%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 86,
            }}
          >
            ⚙️
          </div>
        </div>

        <AnimatedText text="Marketing Engine" delay={6} size={104} weight={800} />
        <AnimatedText
          text="Como usar as Skills"
          delay={32}
          size={42}
          weight={500}
          color={theme.textDim}
          stagger={1}
        />

        <div
          style={{
            display: 'flex',
            gap: 14,
            marginTop: 26,
            opacity: interpolate(frame, [60, 80], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            }),
          }}
        >
          {['provider-agnostic', 'CLI-first', 'auditável'].map((tag) => (
            <span
              key={tag}
              style={{
                padding: '10px 18px',
                borderRadius: 999,
                border: `1px solid ${theme.accent}44`,
                background: `${theme.accent}10`,
                color: theme.accent,
                fontFamily: theme.mono,
                fontSize: 16,
                letterSpacing: 1.3,
                textTransform: 'uppercase',
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      </AbsoluteFill>
    </SceneFrame>
  );
};
