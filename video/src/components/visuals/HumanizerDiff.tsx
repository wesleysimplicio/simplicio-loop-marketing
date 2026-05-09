import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {theme} from '../../theme';

const BEFORE = [
  'Em suma, é importante destacar que',
  'nosso pipeline — robusto, escalável e moderno —',
  'oferece, de maneira eficiente, uma solução completa.',
];

const AFTER = [
  'Olha só o que muda na prática.',
  'O pipeline cuida do trabalho chato.',
  'Você só aprova o que vai pro ar.',
];

export const HumanizerDiff: React.FC = () => {
  const frame = useCurrentFrame();
  const fade = interpolate(frame, [40, 70], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        width: 720,
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
        fontFamily: theme.font,
      }}
    >
      <Block
        title="rascunho do LLM"
        color={theme.danger}
        lines={BEFORE}
        opacity={1 - fade * 0.4}
        strike={fade > 0.3}
      />
      <div style={{textAlign: 'center', color: theme.textDim, fontFamily: theme.mono, fontSize: 18}}>
        ↓ revisao-humanizada ↓
      </div>
      <Block
        title="pronto pra publicar"
        color={theme.accent}
        lines={AFTER}
        opacity={fade}
      />
    </div>
  );
};

const Block: React.FC<{
  title: string;
  color: string;
  lines: string[];
  opacity: number;
  strike?: boolean;
}> = ({title, color, lines, opacity, strike}) => (
  <div
    style={{
      padding: 22,
      borderRadius: 16,
      background: `${color}10`,
      border: `1px solid ${color}33`,
      opacity,
    }}
  >
    <div
      style={{
        color,
        fontFamily: theme.mono,
        fontSize: 14,
        letterSpacing: 2,
        textTransform: 'uppercase',
        marginBottom: 10,
      }}
    >
      {title}
    </div>
    {lines.map((l, i) => (
      <div
        key={i}
        style={{
          color: theme.text,
          fontSize: 22,
          lineHeight: 1.4,
          textDecoration: strike ? 'line-through' : 'none',
          textDecorationColor: color,
        }}
      >
        {l}
      </div>
    ))}
  </div>
);
