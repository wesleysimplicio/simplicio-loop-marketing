import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {theme} from '../../theme';

const VIOLATIONS = [
  {phrase: '"cura definitiva"', risk: 'medical-claim', verdict: 'BLOCK'},
  {phrase: '"retorno garantido"', risk: 'financial-guarantee', verdict: 'BLOCK'},
  {phrase: '"100% melhor que X"', risk: 'deceptive-comparison', verdict: 'WARN'},
];

export const ComplianceShield: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const pulse = 1 + 0.04 * Math.sin(frame / 8);

  return (
    <div
      style={{
        width: 740,
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
        fontFamily: theme.font,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 18,
        }}
      >
        <div
          style={{
            width: 96,
            height: 96,
            borderRadius: 24,
            background: `linear-gradient(135deg, ${theme.danger}33, ${theme.danger}11)`,
            border: `1px solid ${theme.danger}66`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 48,
            transform: `scale(${pulse})`,
            boxShadow: `0 0 38px ${theme.danger}44`,
          }}
        >
          🛡️
        </div>
        <div>
          <div
            style={{
              color: theme.danger,
              fontFamily: theme.mono,
              fontSize: 14,
              letterSpacing: 2,
              textTransform: 'uppercase',
            }}
          >
            compliance-generic
          </div>
          <div style={{color: theme.text, fontSize: 28, fontWeight: 700}}>
            pass: <span style={{color: theme.danger}}>false</span>
          </div>
          <div style={{color: theme.textDim, fontSize: 16}}>
            JSON {'{'}pass, violations[], suggestions[]{'}'}
          </div>
        </div>
      </div>

      {VIOLATIONS.map((v, i) => {
        const s = spring({frame: frame - 30 - i * 10, fps, config: {damping: 200}});
        const o = interpolate(s, [0, 1], [0, 1], {extrapolateRight: 'clamp'});
        const x = interpolate(s, [0, 1], [-30, 0]);
        const isBlock = v.verdict === 'BLOCK';
        return (
          <div
            key={i}
            style={{
              opacity: o,
              transform: `translateX(${x}px)`,
              display: 'grid',
              gridTemplateColumns: '1fr 220px 110px',
              alignItems: 'center',
              gap: 14,
              padding: 14,
              borderRadius: 14,
              background: 'rgba(255,255,255,0.04)',
              border: `1px solid ${isBlock ? theme.danger : theme.accent3}33`,
            }}
          >
            <span style={{color: theme.text, fontSize: 20}}>{v.phrase}</span>
            <span
              style={{
                color: theme.textDim,
                fontFamily: theme.mono,
                fontSize: 14,
                letterSpacing: 1.2,
              }}
            >
              {v.risk}
            </span>
            <span
              style={{
                color: isBlock ? theme.danger : theme.accent3,
                background: `${isBlock ? theme.danger : theme.accent3}14`,
                border: `1px solid ${isBlock ? theme.danger : theme.accent3}55`,
                padding: '6px 12px',
                borderRadius: 999,
                textAlign: 'center',
                fontFamily: theme.mono,
                fontSize: 13,
                letterSpacing: 1.5,
                fontWeight: 700,
              }}
            >
              {v.verdict}
            </span>
          </div>
        );
      })}
    </div>
  );
};
