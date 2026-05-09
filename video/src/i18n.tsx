import React from 'react';

export type Locale = 'pt-BR' | 'en';

export const LOCALES: Locale[] = ['pt-BR', 'en'];

type Strings = {
  intro: {title: string; subtitle: string; tags: string[]};
  pipeline: {
    tag: string;
    headline: string;
    subhead: string;
    currentStage: string;
  };
  providerAgnostic: {
    tag: string;
    title: string;
    subtitle: string;
  };
  spotlight: {
    stage: string;
    skillCounter: (i: number, total: number) => string;
  };
  outro: {
    tag: string;
    pre: string;
    headline: string;
    pipelineCaption: string;
    dod: string[];
  };
  router: {
    headerTask: string;
    headerProvider: string;
    tasks: {task: string; provider: string; color: string}[];
  };
  copy: {
    samples: {label: string; text: string; limit: number; color: string}[];
  };
  humanizer: {
    before: string[];
    after: string[];
    beforeTag: string;
    afterTag: string;
    arrow: string;
  };
  caption: {
    variants: Record<string, {limit: string; sample: string}>;
  };
  cinematic: {
    label: string;
    headerLeft: string;
    headerRight: string;
    params: {k: string; v: string}[];
  };
  avatar: {
    rec: string;
    badge: string;
    chip: string;
    title: string;
    speech: string[];
  };
  batch: {
    variants: {hook: string; cost: string; winner: boolean}[];
    winnerLabel: string;
  };
  quoteCard: {
    leftTitle: string;
    leftBig: string;
    leftSub: string;
    rightTitle: string;
    rightBig: string;
    rightSub: string;
    footer: string;
  };
  dispatcher: {
    header: string;
    routes: {brief: string; target: string}[];
  };
  compliance: {
    skillName: string;
    passLabel: string;
    json: string;
    violations: {phrase: string; risk: string; verdict: string}[];
  };
  specs: {
    safeArea: string;
    overlay: string;
    checks: {label: string; value: string; expected: string; ok: boolean}[];
  };
  skills: Record<
    string,
    {
      tagline: string;
      bullets: string[];
    }
  >;
};

const ptBR: Strings = {
  intro: {
    title: 'Marketing Engine',
    subtitle: 'Como usar as Skills',
    tags: ['provider-agnostic', 'CLI-first', 'auditável'],
  },
  pipeline: {
    tag: 'o pipeline',
    headline: 'Um piece atravessa 8 etapas',
    subhead: 'cada skill é responsável por uma parte do caminho',
    currentStage: 'stage atual',
  },
  providerAgnostic: {
    tag: 'princípio nº 1',
    title: 'Provider-agnostic',
    subtitle: 'o llm-router escolhe — a skill nunca cita o provider',
  },
  spotlight: {
    stage: 'stage',
    skillCounter: (i, t) =>
      `skill ${String(i).padStart(2, '0')} / ${String(t).padStart(2, '0')}`,
  },
  outro: {
    tag: 'definition of done',
    pre: 'um piece só está pronto quando',
    headline: 'todos os gates passam',
    pipelineCaption:
      'brief → script → creative → caption → compliance → publish → metrics → ads',
    dod: [
      'Compliance pass: true (ou override logado)',
      'qa-tech-specs aprovado em todos os canais',
      'Captions IG · TikTok · LinkedIn · X geradas',
      'Playwright cobre o pipeline ponta-a-ponta',
      'data/llm-usage.jsonl + data/runs.jsonl',
      'manifest.json em outputs/<client>/<date>/<piece>',
    ],
  },
  router: {
    headerTask: 'task_type',
    headerProvider: 'provider resolvido',
    tasks: [
      {task: 'caption', provider: 'deepseek', color: '#7CF6C8'},
      {task: 'script', provider: 'claude', color: '#FFB070'},
      {task: 'compliance', provider: 'claude', color: '#FFB070'},
      {task: 'humanize', provider: 'claude', color: '#FFB070'},
    ],
  },
  copy: {
    samples: [
      {label: 'Hook', text: 'Pare de roteirizar no escuro.', limit: 60, color: '#7CF6C8'},
      {
        label: 'Caption',
        text: 'Brief vira post auditável em 3 minutos. Sem provider locked-in.',
        limit: 220,
        color: '#8AB4FF',
      },
      {label: 'Headline', text: 'Pipeline pronto. Você só aprova.', limit: 40, color: '#FFB070'},
    ],
  },
  humanizer: {
    before: [
      'Em suma, é importante destacar que',
      'nosso pipeline — robusto, escalável e moderno —',
      'oferece, de maneira eficiente, uma solução completa.',
    ],
    after: [
      'Olha só o que muda na prática.',
      'O pipeline cuida do trabalho chato.',
      'Você só aprova o que vai pro ar.',
    ],
    beforeTag: 'rascunho do LLM',
    afterTag: 'pronto pra publicar',
    arrow: '↓ revisao-humanizada ↓',
  },
  caption: {
    variants: {
      Instagram: {
        limit: '2200ch · 30 hashtags',
        sample: 'Brief vira post auditável.\n\nLink na bio. ✨\n#marketing #ai',
      },
      TikTok: {
        limit: '2200ch · 5 hashtags',
        sample: 'pov: você roda 8 etapas em 1 prompt 👀\n#fyp #ai',
      },
      LinkedIn: {
        limit: '3000ch · 0 hashtag',
        sample:
          'Compartilho algo prático: o brief vira post auditável em minutos. Vale o experimento.',
      },
      X: {
        limit: '280ch · sem link no corpo',
        sample: 'Brief → post auditável em minutos. Sem provider lock-in.',
      },
    },
  },
  cinematic: {
    label: 'higgsfield · soul 2.0',
    headerLeft: '● rec',
    headerRight: 'higgsfield · soul 2.0',
    params: [
      {k: 'subject', v: 'fundadora caminhando no estúdio'},
      {k: 'lens', v: '35mm · f/1.8 · close médio'},
      {k: 'motion', v: 'dolly-in suave, hand-held leve'},
      {k: 'lighting', v: 'window light + rim quente'},
      {k: 'mood', v: 'editorial · confiante · íntimo'},
      {k: 'aspect / dur', v: '9:16 · 6s · soul 2.0'},
    ],
  },
  avatar: {
    rec: 'REC',
    badge: 'BRAND',
    chip: 'topview · ugc · 9:16',
    title: 'script falado',
    speech: [
      'Olha, eu testei pra você.',
      'O brief virou post em 3 minutos.',
      'Sem trocar o code-base, só o .env.',
    ],
  },
  batch: {
    winnerLabel: 'WINNER',
    variants: [
      {hook: 'pare de roteirizar no escuro', cost: '$0.004', winner: false},
      {hook: 'pipeline pronto. você só aprova.', cost: '$0.004', winner: true},
      {hook: 'troque o provider, não o código', cost: '$0.004', winner: false},
      {hook: '8 etapas em 1 prompt', cost: '$0.005', winner: false},
      {hook: 'brief vira post auditável', cost: '$0.004', winner: false},
      {hook: 'sem provider lock-in', cost: '$0.004', winner: false},
    ],
  },
  quoteCard: {
    leftTitle: 'slide 01',
    leftBig: 'provider-agnostic',
    leftSub: 'o motor não fala o nome do provider',
    rightTitle: 'slide 02',
    rightBig: 'brief → ads',
    rightSub: '8 etapas auditáveis',
    footer: 'marketing-engine · gpt-image',
  },
  dispatcher: {
    header: 'video-prompt-builder · dispatcher',
    routes: [
      {brief: 'editorial · cinematic reel', target: 'higgsfield'},
      {brief: 'avatar UGC · talking head', target: 'topview'},
      {brief: 'A/B hooks · lote barato', target: 'wavespeed'},
    ],
  },
  compliance: {
    skillName: 'compliance-generic',
    passLabel: 'pass',
    json: 'JSON {pass, violations[], suggestions[]}',
    violations: [
      {phrase: '"cura definitiva"', risk: 'medical-claim', verdict: 'BLOCK'},
      {phrase: '"retorno garantido"', risk: 'financial-guarantee', verdict: 'BLOCK'},
      {phrase: '"100% melhor que X"', risk: 'deceptive-comparison', verdict: 'WARN'},
    ],
  },
  specs: {
    safeArea: 'safe area · 90%',
    overlay: 'texto pode ficar cortado em telas menores',
    checks: [
      {label: 'aspect ratio', value: '9:16', expected: '9:16', ok: true},
      {label: 'duração', value: '6.0s', expected: '≤ 60s', ok: true},
      {label: 'tamanho', value: '8.4 MB', expected: '≤ 10 MB', ok: true},
      {label: 'codec', value: 'h264', expected: 'h264 / vp9', ok: true},
      {label: 'safe area', value: '88%', expected: '≥ 90%', ok: false},
    ],
  },
  skills: {
    'llm-router': {
      tagline: 'O coração provider-agnostic',
      bullets: [
        'Lê PROVIDERS.md + .env',
        'Resolve LLM por task_type',
        'Fallback automático e logs',
      ],
    },
    'copywriter-curto': {
      tagline: 'Copy curta com voz da marca',
      bullets: [
        'Hooks < 10 palavras',
        'Captions < 220 caracteres',
        'Headlines < 40 caracteres',
      ],
    },
    'revisao-humanizada': {
      tagline: 'Tira a cara de IA do texto',
      bullets: [
        'Remove em-dashes e tríades',
        'Varia ritmo das frases',
        'Mata conectores reciclados',
      ],
    },
    'caption-multi-platform': {
      tagline: 'Uma copy, quatro plataformas',
      bullets: [
        'Adapta limites e hashtags',
        'Reposiciona link e CTA',
        'Mantém o hook constante',
      ],
    },
    'higgsfield-prompt-builder': {
      tagline: 'Prompts cinematográficos',
      bullets: [
        'Soul, DoP, Seedance',
        'Lente, luz, motion control',
        'Reels editoriais e hero shots',
      ],
    },
    'topview-prompt-builder': {
      tagline: 'UGC com avatares',
      bullets: [
        'Avatar segurando produto',
        'Talking-head com voz',
        'Demo a partir de URL',
      ],
    },
    'wavespeed-batch': {
      tagline: 'Lotes baratos para A/B',
      bullets: [
        'Eixo de variantes',
        'Custo por variante',
        'Filtra antes do render caro',
      ],
    },
    'gpt-image-prompt-builder': {
      tagline: 'Tipografia precisa',
      bullets: [
        'Quote cards e carrosséis',
        'Inpaint e edição local',
        'Fundo transparente',
      ],
    },
    'video-prompt-builder': {
      tagline: 'Dispatcher de vídeo',
      bullets: [
        'Lê o routing matrix',
        'Delega ao especialista certo',
        'Mesmo brief, qualquer provider',
      ],
    },
    'compliance-generic': {
      tagline: 'Auditor antes do publish',
      bullets: [
        'Bloqueia claims médicos',
        'Detecta garantia financeira',
        'JSON {pass, violations}',
      ],
    },
    'qa-tech-specs': {
      tagline: 'Validador técnico',
      bullets: [
        'Aspect ratio e duração',
        'Tamanho e codec',
        'Áreas seguras por canal',
      ],
    },
  },
};

const en: Strings = {
  intro: {
    title: 'Marketing Engine',
    subtitle: 'How to use the Skills',
    tags: ['provider-agnostic', 'CLI-first', 'auditable'],
  },
  pipeline: {
    tag: 'the pipeline',
    headline: 'Every piece flows through 8 stages',
    subhead: 'each skill owns one part of the path',
    currentStage: 'current stage',
  },
  providerAgnostic: {
    tag: 'principle #1',
    title: 'Provider-agnostic',
    subtitle: 'the llm-router decides — no skill ever names the provider',
  },
  spotlight: {
    stage: 'stage',
    skillCounter: (i, t) =>
      `skill ${String(i).padStart(2, '0')} / ${String(t).padStart(2, '0')}`,
  },
  outro: {
    tag: 'definition of done',
    pre: 'a piece is only ready when',
    headline: 'every gate passes',
    pipelineCaption:
      'brief → script → creative → caption → compliance → publish → metrics → ads',
    dod: [
      'Compliance pass: true (or override logged)',
      'qa-tech-specs approved on every channel',
      'Captions IG · TikTok · LinkedIn · X generated',
      'Playwright covers the pipeline end-to-end',
      'data/llm-usage.jsonl + data/runs.jsonl',
      'manifest.json under outputs/<client>/<date>/<piece>',
    ],
  },
  router: {
    headerTask: 'task_type',
    headerProvider: 'resolved provider',
    tasks: [
      {task: 'caption', provider: 'deepseek', color: '#7CF6C8'},
      {task: 'script', provider: 'claude', color: '#FFB070'},
      {task: 'compliance', provider: 'claude', color: '#FFB070'},
      {task: 'humanize', provider: 'claude', color: '#FFB070'},
    ],
  },
  copy: {
    samples: [
      {label: 'Hook', text: 'Stop scripting in the dark.', limit: 60, color: '#7CF6C8'},
      {
        label: 'Caption',
        text: 'Brief becomes an auditable post in 3 minutes. No provider lock-in.',
        limit: 220,
        color: '#8AB4FF',
      },
      {label: 'Headline', text: 'Pipeline ready. You just approve.', limit: 40, color: '#FFB070'},
    ],
  },
  humanizer: {
    before: [
      'In summary, it is important to highlight that',
      'our pipeline — robust, scalable and modern —',
      'efficiently delivers a complete end-to-end solution.',
    ],
    after: [
      'Look at what actually changes.',
      'The pipeline takes the boring work.',
      'You only approve what ships.',
    ],
    beforeTag: 'LLM rough draft',
    afterTag: 'ready to ship',
    arrow: '↓ humanizer pass ↓',
  },
  caption: {
    variants: {
      Instagram: {
        limit: '2200ch · 30 hashtags',
        sample: 'Brief becomes an auditable post.\n\nLink in bio. ✨\n#marketing #ai',
      },
      TikTok: {
        limit: '2200ch · 5 hashtags',
        sample: 'pov: you run 8 stages in one prompt 👀\n#fyp #ai',
      },
      LinkedIn: {
        limit: '3000ch · 0 hashtag',
        sample:
          'Sharing something practical: a brief becomes an auditable post in minutes. Worth the experiment.',
      },
      X: {
        limit: '280ch · no inline link',
        sample: 'Brief → auditable post in minutes. No provider lock-in.',
      },
    },
  },
  cinematic: {
    label: 'higgsfield · soul 2.0',
    headerLeft: '● rec',
    headerRight: 'higgsfield · soul 2.0',
    params: [
      {k: 'subject', v: 'founder walking through the studio'},
      {k: 'lens', v: '35mm · f/1.8 · medium close-up'},
      {k: 'motion', v: 'soft dolly-in, light hand-held'},
      {k: 'lighting', v: 'window light + warm rim'},
      {k: 'mood', v: 'editorial · confident · intimate'},
      {k: 'aspect / dur', v: '9:16 · 6s · soul 2.0'},
    ],
  },
  avatar: {
    rec: 'REC',
    badge: 'BRAND',
    chip: 'topview · ugc · 9:16',
    title: 'spoken script',
    speech: [
      'Look, I tested it for you.',
      'The brief became a post in 3 minutes.',
      'No code change, just the .env.',
    ],
  },
  batch: {
    winnerLabel: 'WINNER',
    variants: [
      {hook: 'stop scripting in the dark', cost: '$0.004', winner: false},
      {hook: 'pipeline ready. you just approve.', cost: '$0.004', winner: true},
      {hook: 'swap the provider, not the code', cost: '$0.004', winner: false},
      {hook: '8 stages in one prompt', cost: '$0.005', winner: false},
      {hook: 'brief becomes an auditable post', cost: '$0.004', winner: false},
      {hook: 'no provider lock-in', cost: '$0.004', winner: false},
    ],
  },
  quoteCard: {
    leftTitle: 'slide 01',
    leftBig: 'provider-agnostic',
    leftSub: 'the engine never names the provider',
    rightTitle: 'slide 02',
    rightBig: 'brief → ads',
    rightSub: '8 auditable stages',
    footer: 'marketing-engine · gpt-image',
  },
  dispatcher: {
    header: 'video-prompt-builder · dispatcher',
    routes: [
      {brief: 'editorial · cinematic reel', target: 'higgsfield'},
      {brief: 'avatar UGC · talking head', target: 'topview'},
      {brief: 'A/B hooks · cheap batch', target: 'wavespeed'},
    ],
  },
  compliance: {
    skillName: 'compliance-generic',
    passLabel: 'pass',
    json: 'JSON {pass, violations[], suggestions[]}',
    violations: [
      {phrase: '"definitive cure"', risk: 'medical-claim', verdict: 'BLOCK'},
      {phrase: '"guaranteed return"', risk: 'financial-guarantee', verdict: 'BLOCK'},
      {phrase: '"100% better than X"', risk: 'deceptive-comparison', verdict: 'WARN'},
    ],
  },
  specs: {
    safeArea: 'safe area · 90%',
    overlay: 'text may clip on smaller screens',
    checks: [
      {label: 'aspect ratio', value: '9:16', expected: '9:16', ok: true},
      {label: 'duration', value: '6.0s', expected: '≤ 60s', ok: true},
      {label: 'file size', value: '8.4 MB', expected: '≤ 10 MB', ok: true},
      {label: 'codec', value: 'h264', expected: 'h264 / vp9', ok: true},
      {label: 'safe area', value: '88%', expected: '≥ 90%', ok: false},
    ],
  },
  skills: {
    'llm-router': {
      tagline: 'The provider-agnostic heart',
      bullets: [
        'Reads PROVIDERS.md + .env',
        'Resolves LLM by task_type',
        'Auto fallback + usage logs',
      ],
    },
    'copywriter-curto': {
      tagline: 'Short copy in brand voice',
      bullets: [
        'Hooks < 10 words',
        'Captions < 220 chars',
        'Headlines < 40 chars',
      ],
    },
    'revisao-humanizada': {
      tagline: 'Strips AI fingerprints from copy',
      bullets: [
        'Drops em-dashes and triads',
        'Varies sentence rhythm',
        'Kills recycled connectors',
      ],
    },
    'caption-multi-platform': {
      tagline: 'One copy, four platforms',
      bullets: [
        'Adapts limits and hashtags',
        'Repositions link and CTA',
        'Keeps the hook constant',
      ],
    },
    'higgsfield-prompt-builder': {
      tagline: 'Cinematic prompts',
      bullets: [
        'Soul, DoP, Seedance',
        'Lens, light, motion control',
        'Editorial reels and hero shots',
      ],
    },
    'topview-prompt-builder': {
      tagline: 'UGC with avatars',
      bullets: [
        'Avatar holding the product',
        'Talking-head with voice',
        'Demo from a URL',
      ],
    },
    'wavespeed-batch': {
      tagline: 'Cheap A/B batches',
      bullets: [
        'Variant axis',
        'Cost per variant',
        'Filter before the expensive render',
      ],
    },
    'gpt-image-prompt-builder': {
      tagline: 'Precise typography',
      bullets: [
        'Quote cards and carousels',
        'Inpaint and local edits',
        'Transparent background',
      ],
    },
    'video-prompt-builder': {
      tagline: 'Video dispatcher',
      bullets: [
        'Reads the routing matrix',
        'Delegates to the right specialist',
        'Same brief, any provider',
      ],
    },
    'compliance-generic': {
      tagline: 'Auditor before publish',
      bullets: [
        'Blocks medical claims',
        'Detects financial guarantees',
        'JSON {pass, violations}',
      ],
    },
    'qa-tech-specs': {
      tagline: 'Tech validator',
      bullets: [
        'Aspect ratio and duration',
        'File size and codec',
        'Safe areas per channel',
      ],
    },
  },
};

const STRINGS: Record<Locale, Strings> = {
  'pt-BR': ptBR,
  en,
};

export const LocaleContext = React.createContext<Locale>('pt-BR');

export const useLocale = () => React.useContext(LocaleContext);

export const useStrings = () => STRINGS[useLocale()];

export const stringsFor = (locale: Locale) => STRINGS[locale];
