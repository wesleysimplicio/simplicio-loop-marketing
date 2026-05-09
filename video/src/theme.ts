export const theme = {
  bg: '#0B0F1A',
  bgDeep: '#070912',
  surface: 'rgba(255,255,255,0.04)',
  surfaceStrong: 'rgba(255,255,255,0.08)',
  border: 'rgba(255,255,255,0.12)',
  text: '#F5F7FB',
  textDim: '#9AA4B8',
  accent: '#7CF6C8',
  accent2: '#8AB4FF',
  accent3: '#FFB070',
  accent4: '#F47AC2',
  danger: '#FF6B6B',
  success: '#5EE6B6',
  font: 'Inter, "SF Pro Display", system-ui, sans-serif',
  mono: '"JetBrains Mono", "Fira Code", ui-monospace, monospace',
};

export const channels = [
  {name: 'Instagram', color: '#F47AC2'},
  {name: 'TikTok', color: '#7CF6C8'},
  {name: 'LinkedIn', color: '#8AB4FF'},
  {name: 'X', color: '#F5F7FB'},
];

export type SkillMeta = {
  id: string;
  emoji: string;
  color: string;
  stage: string;
};

export const skillMeta: SkillMeta[] = [
  {id: 'llm-router', emoji: '🧭', color: '#7CF6C8', stage: 'router'},
  {id: 'copywriter-curto', emoji: '✍️', color: '#8AB4FF', stage: 'script'},
  {id: 'revisao-humanizada', emoji: '🪶', color: '#FFB070', stage: 'script'},
  {id: 'caption-multi-platform', emoji: '📣', color: '#F47AC2', stage: 'caption'},
  {id: 'higgsfield-prompt-builder', emoji: '🎬', color: '#7CF6C8', stage: 'creative'},
  {id: 'topview-prompt-builder', emoji: '👤', color: '#8AB4FF', stage: 'creative'},
  {id: 'wavespeed-batch', emoji: '⚡', color: '#FFB070', stage: 'creative'},
  {id: 'gpt-image-prompt-builder', emoji: '🖼️', color: '#F47AC2', stage: 'creative'},
  {id: 'video-prompt-builder', emoji: '🎯', color: '#7CF6C8', stage: 'creative'},
  {id: 'compliance-generic', emoji: '🛡️', color: '#FF6B6B', stage: 'compliance'},
  {id: 'qa-tech-specs', emoji: '📐', color: '#8AB4FF', stage: 'compliance'},
];
