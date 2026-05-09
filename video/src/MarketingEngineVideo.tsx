import React from 'react';
import {AbsoluteFill, Series} from 'remotion';
import {Scene01Intro} from './scenes/Scene01Intro';
import {Scene02Pipeline} from './scenes/Scene02Pipeline';
import {Scene03ProviderAgnostic} from './scenes/Scene03ProviderAgnostic';
import {Scene99Outro} from './scenes/Scene99Outro';
import {SkillSpotlight} from './scenes/SkillSpotlight';
import {RouterTaskFlow} from './components/visuals/RouterTaskFlow';
import {CharCounter} from './components/visuals/CharCounter';
import {HumanizerDiff} from './components/visuals/HumanizerDiff';
import {CaptionFanout} from './components/visuals/CaptionFanout';
import {Cinematic} from './components/visuals/Cinematic';
import {Avatar} from './components/visuals/Avatar';
import {BatchGrid} from './components/visuals/BatchGrid';
import {QuoteCard} from './components/visuals/QuoteCard';
import {VideoDispatcher} from './components/visuals/VideoDispatcher';
import {ComplianceShield} from './components/visuals/ComplianceShield';
import {SpecRuler} from './components/visuals/SpecRuler';
import {skills, theme} from './theme';

const findSkill = (id: string) => {
  const s = skills.find((sk) => sk.id === id);
  if (!s) throw new Error(`skill ${id} not found`);
  return s;
};

export const MarketingEngineVideo: React.FC = () => {
  const total = skills.length;

  return (
    <AbsoluteFill style={{background: theme.bgDeep}}>
      <Series>
        <Series.Sequence durationInFrames={150}>
          <Scene01Intro />
        </Series.Sequence>

        <Series.Sequence durationInFrames={210}>
          <Scene02Pipeline />
        </Series.Sequence>

        <Series.Sequence durationInFrames={180}>
          <Scene03ProviderAgnostic />
        </Series.Sequence>

        <Series.Sequence durationInFrames={170}>
          <SkillSpotlight
            skill={findSkill('llm-router')}
            stage="router"
            index={1}
            total={total}
            visual={<RouterTaskFlow />}
            code={{
              title: '.skills/<any>/SKILL.md',
              lines: [
                [
                  {text: 'await ', color: '#F47AC2'},
                  {text: 'router.run', color: '#7CF6C8'},
                  {text: '({', color: '#9AA4B8'},
                ],
                [
                  {text: '  task: ', color: '#9AA4B8'},
                  {text: '"caption"', color: '#FFD166'},
                  {text: ',', color: '#9AA4B8'},
                ],
                [
                  {text: '  override: ', color: '#9AA4B8'},
                  {text: 'piece.frontmatter.llm', color: '#8AB4FF'},
                ],
                [{text: '})', color: '#9AA4B8'}],
              ],
            }}
          />
        </Series.Sequence>

        <Series.Sequence durationInFrames={170}>
          <SkillSpotlight
            skill={findSkill('copywriter-curto')}
            stage="script"
            index={2}
            total={total}
            visual={<CharCounter />}
          />
        </Series.Sequence>

        <Series.Sequence durationInFrames={170}>
          <SkillSpotlight
            skill={findSkill('revisao-humanizada')}
            stage="script"
            index={3}
            total={total}
            visual={<HumanizerDiff />}
          />
        </Series.Sequence>

        <Series.Sequence durationInFrames={180}>
          <SkillSpotlight
            skill={findSkill('caption-multi-platform')}
            stage="caption"
            index={4}
            total={total}
            visual={<CaptionFanout />}
          />
        </Series.Sequence>

        <Series.Sequence durationInFrames={180}>
          <SkillSpotlight
            skill={findSkill('higgsfield-prompt-builder')}
            stage="creative"
            index={5}
            total={total}
            visual={<Cinematic />}
          />
        </Series.Sequence>

        <Series.Sequence durationInFrames={180}>
          <SkillSpotlight
            skill={findSkill('topview-prompt-builder')}
            stage="creative"
            index={6}
            total={total}
            visual={<Avatar />}
          />
        </Series.Sequence>

        <Series.Sequence durationInFrames={180}>
          <SkillSpotlight
            skill={findSkill('wavespeed-batch')}
            stage="creative"
            index={7}
            total={total}
            visual={<BatchGrid />}
          />
        </Series.Sequence>

        <Series.Sequence durationInFrames={180}>
          <SkillSpotlight
            skill={findSkill('gpt-image-prompt-builder')}
            stage="creative"
            index={8}
            total={total}
            visual={<QuoteCard />}
          />
        </Series.Sequence>

        <Series.Sequence durationInFrames={180}>
          <SkillSpotlight
            skill={findSkill('video-prompt-builder')}
            stage="creative"
            index={9}
            total={total}
            visual={<VideoDispatcher />}
          />
        </Series.Sequence>

        <Series.Sequence durationInFrames={190}>
          <SkillSpotlight
            skill={findSkill('compliance-generic')}
            stage="compliance"
            index={10}
            total={total}
            visual={<ComplianceShield />}
          />
        </Series.Sequence>

        <Series.Sequence durationInFrames={190}>
          <SkillSpotlight
            skill={findSkill('qa-tech-specs')}
            stage="compliance"
            index={11}
            total={total}
            visual={<SpecRuler />}
          />
        </Series.Sequence>

        <Series.Sequence durationInFrames={210}>
          <Scene99Outro />
        </Series.Sequence>
      </Series>
    </AbsoluteFill>
  );
};

export const VIDEO_DURATION_FRAMES =
  150 + 210 + 180 + 170 * 3 + 180 * 7 + 190 * 2 + 210;
