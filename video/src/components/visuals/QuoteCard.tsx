import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {theme} from '../../theme';
import {useStrings} from '../../i18n';

export const QuoteCard: React.FC = () => {
  const frame = useCurrentFrame();
  const strings = useStrings();
  const reveal = interpolate(frame, [10, 60], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const slide = interpolate(frame, [60, 110], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        width: 720,
        display: 'flex',
        gap: 20,
        fontFamily: theme.font,
      }}
    >
      <Card
        accent={theme.accent4}
        title={strings.quoteCard.leftTitle}
        big={strings.quoteCard.leftBig}
        sub={strings.quoteCard.leftSub}
        footer={strings.quoteCard.footer}
        progress={reveal}
      />
      <Card
        accent={theme.accent}
        title={strings.quoteCard.rightTitle}
        big={strings.quoteCard.rightBig}
        sub={strings.quoteCard.rightSub}
        footer={strings.quoteCard.footer}
        progress={slide}
      />
    </div>
  );
};

const Card: React.FC<{
  accent: string;
  title: string;
  big: string;
  sub: string;
  footer: string;
  progress: number;
}> = ({accent, title, big, sub, footer, progress}) => {
  const op = progress;
  return (
    <div
      style={{
        flex: 1,
        aspectRatio: '4 / 5',
        borderRadius: 22,
        background: `linear-gradient(160deg, ${accent}33, #0B0F1A 70%)`,
        border: `1px solid ${accent}55`,
        padding: 28,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        opacity: op,
        boxShadow: `0 30px 80px ${accent}22`,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `repeating-linear-gradient(45deg, ${accent}08 0 1px, transparent 1px 14px)`,
        }}
      />
      <div
        style={{
          color: accent,
          fontFamily: theme.mono,
          fontSize: 14,
          letterSpacing: 2,
          textTransform: 'uppercase',
          position: 'relative',
        }}
      >
        {title}
      </div>
      <div style={{position: 'relative'}}>
        <div
          style={{
            color: theme.text,
            fontSize: 44,
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: -0.5,
          }}
        >
          {big}
        </div>
        <div
          style={{
            marginTop: 12,
            color: theme.textDim,
            fontSize: 18,
          }}
        >
          {sub}
        </div>
      </div>
      <div
        style={{
          color: theme.textDim,
          fontFamily: theme.mono,
          fontSize: 12,
          letterSpacing: 1.5,
          textTransform: 'uppercase',
          position: 'relative',
        }}
      >
        {footer}
      </div>
    </div>
  );
};
