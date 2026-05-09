import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {Background} from '../components/Background';
import {AnimatedText} from '../components/AnimatedText';
import {Pipeline} from '../components/Pipeline';
import {SceneFrame, SceneTitle} from '../components/Layout';
import {Tag} from '../components/Tag';
import {theme} from '../theme';

const HIGHLIGHTS = [
  {at: 30, label: 'brief'},
  {at: 50, label: 'script'},
  {at: 70, label: 'creative'},
  {at: 90, label: 'caption'},
  {at: 110, label: 'compliance'},
  {at: 130, label: 'publish'},
  {at: 150, label: 'metrics'},
  {at: 170, label: 'ads'},
];

export const Scene02Pipeline: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const current = HIGHLIGHTS.reduce(
    (acc, h) => (frame >= h.at ? h.label : acc),
    'brief'
  );

  return (
    <SceneFrame>
      <Background tint={theme.accent2} />
      <AbsoluteFill
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 40,
          padding: 60,
        }}
      >
        <Tag label="o pipeline" delay={0} color={theme.accent2} />
        <AnimatedText
          text="Um piece atravessa 8 etapas"
          delay={10}
          size={68}
          weight={800}
          stagger={1.2}
        />
        <AnimatedText
          text="cada skill é responsável por uma parte do caminho"
          delay={28}
          size={26}
          weight={500}
          color={theme.textDim}
          stagger={0.6}
        />

        <div style={{marginTop: 20, opacity: interpolate(frame, [22, 38], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}}>
          <Pipeline highlight={current} delay={20} />
        </div>

        <div
          style={{
            color: theme.textDim,
            fontFamily: theme.mono,
            fontSize: 18,
            letterSpacing: 2,
            textTransform: 'uppercase',
            marginTop: 6,
          }}
        >
          stage atual: <span style={{color: theme.accent}}>{current}</span>
        </div>
      </AbsoluteFill>
    </SceneFrame>
  );
};
