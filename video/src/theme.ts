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

export type Skill = {
  id: string;
  name: string;
  emoji: string;
  tagline: string;
  bullets: string[];
  color: string;
  stage: string;
};

export const skills: Skill[] = [
  {
    id: 'llm-router',
    name: 'llm-router',
    emoji: '🧭',
    tagline: 'O coração provider-agnostic',
    bullets: [
      'Lê PROVIDERS.md + .env',
      'Resolve LLM por task_type',
      'Fallback automático e logs',
    ],
    color: '#7CF6C8',
    stage: 'router',
  },
  {
    id: 'copywriter-curto',
    name: 'copywriter-curto',
    emoji: '✍️',
    tagline: 'Copy curta com voz da marca',
    bullets: [
      'Hooks < 10 palavras',
      'Captions < 220 caracteres',
      'Headlines < 40 caracteres',
    ],
    color: '#8AB4FF',
    stage: 'script',
  },
  {
    id: 'revisao-humanizada',
    name: 'revisao-humanizada',
    emoji: '🪶',
    tagline: 'Tira a cara de IA do texto',
    bullets: [
      'Remove em-dashes e tríades',
      'Varia ritmo das frases',
      'Mata conectores reciclados',
    ],
    color: '#FFB070',
    stage: 'script',
  },
  {
    id: 'caption-multi-platform',
    name: 'caption-multi-platform',
    emoji: '📣',
    tagline: 'Uma copy, quatro plataformas',
    bullets: [
      'Adapta limites e hashtags',
      'Reposiciona link e CTA',
      'Mantém o hook constante',
    ],
    color: '#F47AC2',
    stage: 'caption',
  },
  {
    id: 'higgsfield-prompt-builder',
    name: 'higgsfield-prompt-builder',
    emoji: '🎬',
    tagline: 'Prompts cinematográficos',
    bullets: [
      'Soul, DoP, Seedance',
      'Lente, luz, motion control',
      'Reels editoriais e hero shots',
    ],
    color: '#7CF6C8',
    stage: 'creative',
  },
  {
    id: 'topview-prompt-builder',
    name: 'topview-prompt-builder',
    emoji: '👤',
    tagline: 'UGC com avatares',
    bullets: [
      'Avatar segurando produto',
      'Talking-head com voz',
      'Demo a partir de URL',
    ],
    color: '#8AB4FF',
    stage: 'creative',
  },
  {
    id: 'wavespeed-batch',
    name: 'wavespeed-batch',
    emoji: '⚡',
    tagline: 'Lotes baratos para A/B',
    bullets: [
      'Eixo de variantes',
      'Custo por variante',
      'Filtra antes do render caro',
    ],
    color: '#FFB070',
    stage: 'creative',
  },
  {
    id: 'gpt-image-prompt-builder',
    name: 'gpt-image-prompt-builder',
    emoji: '🖼️',
    tagline: 'Tipografia precisa',
    bullets: [
      'Quote cards e carrosséis',
      'Inpaint e edição local',
      'Fundo transparente',
    ],
    color: '#F47AC2',
    stage: 'creative',
  },
  {
    id: 'video-prompt-builder',
    name: 'video-prompt-builder',
    emoji: '🎯',
    tagline: 'Dispatcher de vídeo',
    bullets: [
      'Lê o routing matrix',
      'Delega ao especialista certo',
      'Mesmo brief, qualquer provider',
    ],
    color: '#7CF6C8',
    stage: 'creative',
  },
  {
    id: 'compliance-generic',
    name: 'compliance-generic',
    emoji: '🛡️',
    tagline: 'Auditor antes do publish',
    bullets: [
      'Bloqueia claims médicos',
      'Detecta garantia financeira',
      'JSON {pass, violations}',
    ],
    color: '#FF6B6B',
    stage: 'compliance',
  },
  {
    id: 'qa-tech-specs',
    name: 'qa-tech-specs',
    emoji: '📐',
    tagline: 'Validador técnico',
    bullets: [
      'Aspect ratio e duração',
      'Tamanho e codec',
      'Áreas seguras por canal',
    ],
    color: '#8AB4FF',
    stage: 'compliance',
  },
];
