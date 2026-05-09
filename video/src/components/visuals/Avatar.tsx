import React from 'react';
import {useCurrentFrame} from 'remotion';
import {theme} from '../../theme';
import {useStrings} from '../../i18n';

export const Avatar: React.FC = () => {
  const frame = useCurrentFrame();
  const strings = useStrings();
  const blink = Math.floor(frame / 36) % 8 === 0 ? 0.05 : 1;
  const sway = Math.sin(frame / 18) * 4;

  return (
    <div
      style={{
        width: 720,
        display: 'flex',
        gap: 18,
        fontFamily: theme.font,
      }}
    >
      <div
        style={{
          width: 320,
          aspectRatio: '9 / 16',
          borderRadius: 18,
          overflow: 'hidden',
          position: 'relative',
          background: `linear-gradient(180deg, #1B1F33, #0B0F1A)`,
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `radial-gradient(circle at 50% 40%, ${theme.accent2}33, transparent 60%)`,
          }}
        />
        <svg
          viewBox="0 0 200 360"
          style={{
            width: '100%',
            height: '100%',
            position: 'relative',
            transform: `translateX(${sway}px)`,
          }}
        >
          <ellipse cx="100" cy="160" rx="48" ry="56" fill="#F2C9A6" />
          <ellipse cx="84" cy="156" rx="6" ry={6 * blink} fill="#1A1A1A" />
          <ellipse cx="116" cy="156" rx="6" ry={6 * blink} fill="#1A1A1A" />
          <path d="M88 178 Q100 188 112 178" stroke="#1A1A1A" strokeWidth="3" fill="none" />
          <rect x="58" y="220" width="84" height="120" rx="14" fill={theme.accent2} />
          <rect x="86" y="240" width="28" height="36" rx="6" fill="#FFF" opacity="0.85" />
          <text
            x="100"
            y="262"
            textAnchor="middle"
            fontSize="11"
            fontFamily="Inter"
            fill={theme.bg}
            fontWeight="700"
          >
            {strings.avatar.badge}
          </text>
        </svg>
        <div
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            display: 'flex',
            gap: 6,
            alignItems: 'center',
            color: '#FFF',
            fontFamily: theme.mono,
            fontSize: 12,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 999,
              background: theme.danger,
              boxShadow: `0 0 10px ${theme.danger}`,
            }}
          />
          {strings.avatar.rec}
        </div>
        <div
          style={{
            position: 'absolute',
            bottom: 14,
            left: 14,
            right: 14,
            color: '#FFF',
            fontFamily: theme.mono,
            fontSize: 11,
            opacity: 0.8,
          }}
        >
          {strings.avatar.chip}
        </div>
      </div>
      <div
        style={{
          flex: 1,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 18,
          padding: 22,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div
          style={{
            color: theme.accent2,
            fontFamily: theme.mono,
            fontSize: 14,
            letterSpacing: 1.6,
            textTransform: 'uppercase',
          }}
        >
          {strings.avatar.title}
        </div>
        {strings.avatar.speech.map((line, i) => (
          <Speech key={i} text={line} delay={20 + i * 25} />
        ))}
      </div>
    </div>
  );
};

const Speech: React.FC<{text: string; delay: number}> = ({text, delay}) => {
  const frame = useCurrentFrame();
  const typed = Math.max(0, Math.min(text.length, frame - delay));
  return (
    <div
      style={{
        color: theme.text,
        fontSize: 20,
        lineHeight: 1.4,
        opacity: typed > 0 ? 1 : 0,
      }}
    >
      "{text.slice(0, typed)}"
    </div>
  );
};
