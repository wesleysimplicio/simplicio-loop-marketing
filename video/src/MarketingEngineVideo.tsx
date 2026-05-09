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
import {skillMeta, theme} from './theme';
import {Locale, LocaleContext} from './i18n';

const findMeta = (id: string) => {
  const m = skillMeta.find((sk) => sk.id === id);
  if (!m) throw new Error(`skill ${id} not found`);
  return m;
};

export const MarketingEngineVideo: React.FC<{locale?: Locale}> = ({locale = 'pt-BR'}) => {
  const total = skillMeta.length;

  return (
    <LocaleContext.Provider value={locale}>
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
              meta={findMeta('llm-router')}
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
              meta={findMeta('copywriter-curto')}
              index={2}
              total={total}
              visual={<CharCounter />}
            />
          </Series.Sequence>

          <Series.Sequence durationInFrames={170}>
            <SkillSpotlight
              meta={findMeta('revisao-humanizada')}
              index={3}
              total={total}
              visual={<HumanizerDiff />}
            />
          </Series.Sequence>

          <Series.Sequence durationInFrames={180}>
            <SkillSpotlight
              meta={findMeta('caption-multi-platform')}
              index={4}
              total={total}
              visual={<CaptionFanout />}
            />
          </Series.Sequence>

          <Series.Sequence durationInFrames={180}>
            <SkillSpotlight
              meta={findMeta('higgsfield-prompt-builder')}
              index={5}
              total={total}
              visual={<Cinematic />}
            />
          </Series.Sequence>

          <Series.Sequence durationInFrames={180}>
            <SkillSpotlight
              meta={findMeta('topview-prompt-builder')}
              index={6}
              total={total}
              visual={<Avatar />}
            />
          </Series.Sequence>

          <Series.Sequence durationInFrames={180}>
            <SkillSpotlight
              meta={findMeta('wavespeed-batch')}
              index={7}
              total={total}
              visual={<BatchGrid />}
            />
          </Series.Sequence>

          <Series.Sequence durationInFrames={180}>
            <SkillSpotlight
              meta={findMeta('gpt-image-prompt-builder')}
              index={8}
              total={total}
              visual={<QuoteCard />}
            />
          </Series.Sequence>

          <Series.Sequence durationInFrames={180}>
            <SkillSpotlight
              meta={findMeta('video-prompt-builder')}
              index={9}
              total={total}
              visual={<VideoDispatcher />}
            />
          </Series.Sequence>

          <Series.Sequence durationInFrames={190}>
            <SkillSpotlight
              meta={findMeta('compliance-generic')}
              index={10}
              total={total}
              visual={<ComplianceShield />}
            />
          </Series.Sequence>

          <Series.Sequence durationInFrames={190}>
            <SkillSpotlight
              meta={findMeta('qa-tech-specs')}
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
    </LocaleContext.Provider>
  );
};
