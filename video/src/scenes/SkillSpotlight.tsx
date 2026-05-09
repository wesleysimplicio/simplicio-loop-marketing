import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {Background} from '../components/Background';
import {SkillCard} from '../components/SkillCard';
import {CodeBlock} from '../components/CodeBlock';
import {AnimatedText} from '../components/AnimatedText';
import {Tag} from '../components/Tag';
import {SceneFrame} from '../components/Layout';
import {Skill, theme} from '../theme';

type Token = {text: string; color?: string};

export const SkillSpotlight: React.FC<{
  skill: Skill;
  stage: string;
  index: number;
  total: number;
  visual: React.ReactNode;
  code?: {title: string; lines: Token[][]};
}> = ({skill, stage, index, total, visual, code}) => {
  const frame = useCurrentFrame();
  const slide = interpolate(frame, [0, 18], [60, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <SceneFrame>
      <Background tint={skill.color} />
      <AbsoluteFill style={{padding: 80, display: 'flex', flexDirection: 'column'}}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 30,
          }}
        >
          <Tag label={`stage · ${stage}`} color={skill.color} />
          <div
            style={{
              fontFamily: theme.mono,
              fontSize: 16,
              color: theme.textDim,
              letterSpacing: 2,
              textTransform: 'uppercase',
            }}
          >
            skill {String(index).padStart(2, '0')} / {String(total).padStart(2, '0')}
          </div>
        </div>

        <AnimatedText
          text={skill.name}
          delay={6}
          size={86}
          weight={800}
          align="left"
          stagger={1.1}
        />
        <div style={{height: 12}} />
        <AnimatedText
          text={skill.tagline}
          delay={26}
          size={32}
          weight={500}
          color={theme.textDim}
          align="left"
          stagger={0.6}
        />

        <div
          style={{
            display: 'flex',
            gap: 40,
            marginTop: 50,
            flex: 1,
            alignItems: 'center',
            justifyContent: 'space-between',
            transform: `translateY(${slide}px)`,
          }}
        >
          <div style={{flexShrink: 0}}>
            <SkillCard skill={skill} delay={32} />
          </div>
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 20,
              minHeight: 420,
            }}
          >
            {visual}
            {code ? <CodeBlock title={code.title} lines={code.lines} delay={56} /> : null}
          </div>
        </div>
      </AbsoluteFill>
    </SceneFrame>
  );
};
