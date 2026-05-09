import React from 'react';
import {Composition} from 'remotion';
import {MarketingEngineVideo} from './MarketingEngineVideo';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="marketing-engine-skills"
        component={MarketingEngineVideo}
        durationInFrames={2720}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
