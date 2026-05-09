import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {channels, theme} from '../../theme';
import {useStrings} from '../../i18n';

export const CaptionFanout: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const strings = useStrings();
  const VARIANTS = strings.caption.variants;
  return (
    <div
      style={{
        width: 740,
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 16,
        fontFamily: theme.font,
      }}
    >
      {channels.map((c, i) => {
        const s = spring({frame: frame - 30 - i * 8, fps, config: {damping: 200}});
        const o = interpolate(s, [0, 1], [0, 1], {extrapolateRight: 'clamp'});
        const y = interpolate(s, [0, 1], [20, 0]);
        const v = VARIANTS[c.name];
        return (
          <div
            key={c.name}
            style={{
              opacity: o,
              transform: `translateY(${y}px)`,
              padding: 18,
              borderRadius: 16,
              background: `${c.color}10`,
              border: `1px solid ${c.color}44`,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                color: c.color,
                fontFamily: theme.mono,
                fontSize: 14,
                letterSpacing: 1.6,
                textTransform: 'uppercase',
              }}
            >
              <span>{c.name}</span>
              <span style={{color: theme.textDim}}>{v.limit}</span>
            </div>
            <div
              style={{
                color: theme.text,
                fontSize: 17,
                lineHeight: 1.45,
                whiteSpace: 'pre-wrap',
                minHeight: 90,
              }}
            >
              {v.sample}
            </div>
          </div>
        );
      })}
    </div>
  );
};
