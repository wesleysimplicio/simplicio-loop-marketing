import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Background} from '../components/Background';
import {AnimatedText} from '../components/AnimatedText';
import {Tag} from '../components/Tag';
import {SceneFrame} from '../components/Layout';
import {theme} from '../theme';
import {useStrings} from '../i18n';

export const Scene99Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const strings = useStrings();

  return (
    <SceneFrame>
      <Background tint={theme.accent} />
      <AbsoluteFill
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 24,
          padding: 80,
        }}
      >
        <Tag label={strings.outro.tag} color={theme.accent} />
        <AnimatedText
          text={strings.outro.pre}
          delay={6}
          size={44}
          weight={500}
          color={theme.textDim}
          stagger={0.6}
        />
        <AnimatedText
          text={strings.outro.headline}
          delay={28}
          size={86}
          weight={800}
          stagger={1.2}
        />

        <div
          style={{
            marginTop: 22,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 14,
            width: 980,
          }}
        >
          {strings.outro.dod.map((d, i) => {
            const s = spring({frame: frame - 50 - i * 7, fps, config: {damping: 200}});
            const o = interpolate(s, [0, 1], [0, 1], {extrapolateRight: 'clamp'});
            const y = interpolate(s, [0, 1], [16, 0]);
            return (
              <div
                key={i}
                style={{
                  opacity: o,
                  transform: `translateY(${y}px)`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '14px 18px',
                  borderRadius: 14,
                  background: 'rgba(255,255,255,0.04)',
                  border: `1px solid ${theme.accent}33`,
                  fontFamily: theme.font,
                  fontSize: 18,
                  color: theme.text,
                }}
              >
                <span
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 8,
                    background: `${theme.accent}22`,
                    border: `1px solid ${theme.accent}66`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: theme.accent,
                    fontFamily: theme.mono,
                    fontSize: 14,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  ✓
                </span>
                {d}
              </div>
            );
          })}
        </div>

        <div
          style={{
            marginTop: 32,
            display: 'flex',
            gap: 14,
            opacity: interpolate(frame, [110, 130], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            }),
          }}
        >
          <CtaPill cmd="npx marketing-engine init" />
          <CtaPill cmd="npm run cli:check" />
        </div>

        <div
          style={{
            marginTop: 18,
            color: theme.textDim,
            fontFamily: theme.mono,
            fontSize: 16,
            letterSpacing: 1.5,
            textTransform: 'uppercase',
          }}
        >
          {strings.outro.pipelineCaption}
        </div>
      </AbsoluteFill>
    </SceneFrame>
  );
};

const CtaPill: React.FC<{cmd: string}> = ({cmd}) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '14px 22px',
      borderRadius: 14,
      background: 'rgba(255,255,255,0.05)',
      border: `1px solid ${theme.accent}55`,
      color: theme.text,
      fontFamily: theme.mono,
      fontSize: 18,
    }}
  >
    <span style={{color: theme.accent}}>$</span>
    {cmd}
  </div>
);
