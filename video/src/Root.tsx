import React from 'react';
import {Composition} from 'remotion';
import {MarketingEngineVideo} from './MarketingEngineVideo';

const COMMON = {
  component: MarketingEngineVideo,
  durationInFrames: 2720,
  fps: 30,
  width: 1920,
  height: 1080,
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="marketing-engine-skills"
        defaultProps={{locale: 'pt-BR' as const}}
        {...COMMON}
      />
      <Composition
        id="marketing-engine-skills-en"
        defaultProps={{locale: 'en' as const}}
        {...COMMON}
      />
    </>
  );
};
