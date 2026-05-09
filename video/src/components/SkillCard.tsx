import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {theme, Skill} from '../theme';

export const SkillCard: React.FC<{skill: Skill; delay?: number}> = ({skill, delay = 0}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({
    frame: frame - delay,
    fps,
    config: {damping: 200, mass: 0.7, stiffness: 140},
  });
  const opacity = interpolate(s, [0, 1], [0, 1], {extrapolateRight: 'clamp'});
  const y = interpolate(s, [0, 1], [40, 0]);
  const scale = interpolate(s, [0, 1], [0.92, 1]);

  return (
    <div
      style={{
        opacity,
        transform: `translateY(${y}px) scale(${scale})`,
        background: theme.surfaceStrong,
        border: `1px solid ${skill.color}33`,
        borderRadius: 28,
        padding: '38px 44px',
        width: 720,
        boxShadow: `0 30px 80px ${skill.color}10, inset 0 1px 0 rgba(255,255,255,0.08)`,
        backdropFilter: 'blur(8px)',
        fontFamily: theme.font,
      }}
    >
      <div style={{display: 'flex', alignItems: 'center', gap: 18, marginBottom: 18}}>
        <div
          style={{
            width: 76,
            height: 76,
            borderRadius: 22,
            background: `linear-gradient(135deg, ${skill.color}33, ${skill.color}11)`,
            border: `1px solid ${skill.color}55`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 42,
          }}
        >
          {skill.emoji}
        </div>
        <div>
          <div
            style={{
              color: skill.color,
              fontFamily: theme.mono,
              fontSize: 18,
              letterSpacing: 1.4,
              textTransform: 'uppercase',
            }}
          >
            .skills/{skill.name}
          </div>
          <div style={{color: theme.text, fontSize: 32, fontWeight: 700, marginTop: 4}}>
            {skill.tagline}
          </div>
        </div>
      </div>

      <ul
        style={{
          listStyle: 'none',
          padding: 0,
          margin: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        {skill.bullets.map((b, i) => {
          const ls = spring({
            frame: frame - delay - 12 - i * 6,
            fps,
            config: {damping: 200},
          });
          const lo = interpolate(ls, [0, 1], [0, 1], {extrapolateRight: 'clamp'});
          const lx = interpolate(ls, [0, 1], [-14, 0]);
          return (
            <li
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                color: theme.text,
                fontSize: 22,
                opacity: lo,
                transform: `translateX(${lx}px)`,
              }}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 999,
                  background: skill.color,
                  boxShadow: `0 0 12px ${skill.color}`,
                  flexShrink: 0,
                }}
              />
              {b}
            </li>
          );
        })}
      </ul>
    </div>
  );
};
