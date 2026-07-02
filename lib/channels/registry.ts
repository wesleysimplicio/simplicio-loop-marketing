import type { ChannelDef, PublishMethod } from "./types";

// ---------------------------------------------------------------------------
// Social channels
// ---------------------------------------------------------------------------

const SOCIAL: ChannelDef[] = [
  {
    id: "youtube",
    name: "YouTube",
    kind: "social",
    language: "en",
    audience: "broad, video-first, long + short form",
    allowed_content_types: ["short", "long-form", "livestream"],
    link_policy: "description + pinned comment only, no in-video overlay spam",
    tone: "engaging, retention-optimized, still evidence-backed for SaaS",
    publish_method: "mcp",
    compliance_notes: "Disclose sponsorships (#ad); no clickbait titles that overpromise.",
    frequency_limit: { count: 7, window_days: 7 },
  },
  {
    id: "facebook",
    name: "Facebook",
    kind: "social",
    language: "en",
    audience: "broad, older demographic skew, page-based",
    allowed_content_types: ["post", "reel", "story"],
    link_policy: "native link acceptable, expect reduced organic reach",
    tone: "friendly, community-oriented",
    publish_method: "api",
    compliance_notes: "Meta ad policy applies to boosted posts; no prohibited claims.",
    frequency_limit: { count: 5, window_days: 7 },
  },
  {
    id: "instagram",
    name: "Instagram",
    kind: "social",
    language: "en",
    audience: "visual-first, younger + creator-adjacent",
    allowed_content_types: ["reel", "carousel", "story", "post"],
    link_policy: "link in bio; swipe-up/link sticker on stories only",
    tone: "visual, concise captions, hook-led",
    publish_method: "api",
    compliance_notes: "Meta ad policy applies; disclose partnerships.",
    frequency_limit: { count: 7, window_days: 7 },
  },
  {
    id: "x",
    name: "X / Twitter",
    kind: "social",
    language: "en",
    audience: "tech/builder-heavy, real-time, thread-friendly",
    allowed_content_types: ["post", "thread", "reply"],
    link_policy: "link in first or last tweet of thread; avoid link-only tweets",
    tone: "direct, engineer voice, build-in-public friendly",
    publish_method: "api",
    compliance_notes: "No engagement-bait patterns; disclose paid partnerships.",
    frequency_limit: { count: 14, window_days: 7 },
  },
  {
    id: "pinterest",
    name: "Pinterest",
    kind: "social",
    language: "en",
    audience: "visual discovery, planning-intent",
    allowed_content_types: ["pin", "idea-pin"],
    link_policy: "destination link required, must resolve to real content",
    tone: "descriptive, keyword-rich",
    publish_method: "api",
    compliance_notes: "No misleading destination links.",
    frequency_limit: { count: 5, window_days: 7 },
  },
  {
    id: "tiktok",
    name: "TikTok",
    kind: "social",
    language: "en",
    audience: "short-form video, algorithm-driven discovery",
    allowed_content_types: ["short"],
    link_policy: "bio link only; no off-platform CTA in first 3s",
    tone: "hook-led, native short-form editing",
    publish_method: "api",
    compliance_notes: "Community guidelines strict on ads disclosure (#ad/#sponsored).",
    frequency_limit: { count: 7, window_days: 7 },
  },
  {
    id: "reddit",
    name: "Reddit",
    kind: "social",
    language: "en",
    audience: "subreddit-specific, high anti-spam sensitivity",
    allowed_content_types: ["text-post", "link-post", "comment"],
    link_policy: "respect each subreddit's self-promotion ratio (commonly 9:1 non-promo:promo)",
    tone: "helpful, non-promotional, technical substance first",
    publish_method: "api",
    compliance_notes:
      "Disclose affiliation; never astroturf; check subreddit rules per post (see compliance community gate).",
    frequency_limit: { count: 2, window_days: 7 },
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    kind: "social",
    language: "en",
    audience: "professional, B2B/SaaS decision-makers",
    allowed_content_types: ["post", "article", "document-carousel"],
    link_policy: "native link ok but reduces reach; consider first-comment link",
    tone: "technical-professional, architecture/metrics-forward",
    publish_method: "api",
    compliance_notes: "No engagement pods / fake credentials; disclose sponsorship.",
    frequency_limit: { count: 5, window_days: 7 },
  },
];

// ---------------------------------------------------------------------------
// Developer / community channels
// ---------------------------------------------------------------------------

function community(
  id: string,
  name: string,
  language: string,
  publish_method: PublishMethod,
  overrides: Partial<ChannelDef> = {},
): ChannelDef {
  return {
    id,
    name,
    kind: "community",
    language,
    audience: "developers / technical practitioners",
    allowed_content_types: ["article", "discussion", "comment"],
    link_policy: "substance-first; link only after original technical value is delivered",
    tone: "engineer-to-engineer, no hype, show tradeoffs and failures",
    publish_method,
    compliance_notes:
      "Follow community-specific self-promotion and disclosure rules; see compliance community gate.",
    frequency_limit: { count: 1, window_days: 7 },
    ...overrides,
  };
}

const COMMUNITY_EN: ChannelDef[] = [
  community("hackernews", "Hacker News", "en", "browser", {
    allowed_content_types: ["show-hn", "ask-hn", "link-post"],
    link_policy: "submit the canonical technical URL; no marketing landing pages",
    tone: "terse, technical, zero hype — HN downvotes marketing copy fast",
    compliance_notes: "Avoid title bait; substance over promotion; expect harsh technical scrutiny in comments.",
  }),
  community("devto", "DEV.to", "en", "api"),
  community("hashnode", "Hashnode", "en", "api"),
  community("indiehackers", "Indie Hackers", "en", "browser", {
    allowed_content_types: ["milestone-post", "discussion", "product-launch"],
    tone: "build-in-public, revenue/metrics transparent",
  }),
  community("lobsters", "Lobsters", "en", "manual", {
    compliance_notes: "Invite-only community; requires existing member tagging + strict no-self-promo culture.",
  }),
  community("medium-programming", "Medium Programming", "en", "browser"),
  community("hackernoon", "Hackernoon", "en", "manual"),
  community("dailydev", "daily.dev", "en", "manual", {
    allowed_content_types: ["link-share", "squad-post"],
  }),
  community("reddit-programming", "Reddit Programming", "en", "api", {
    compliance_notes: "r/programming has a strict low self-promotion tolerance; discuss don't sell.",
  }),
  community("reddit-opensource", "Reddit Open Source", "en", "api"),
  community("github-discussions", "GitHub Discussions", "en", "api", {
    allowed_content_types: ["discussion", "qa-answer"],
  }),
];

const COMMUNITY_PT: ChannelDef[] = [
  community("tabnews", "TabNews", "pt-BR", "api", {
    link_policy: "conteúdo técnico original; link apenas como referência complementar",
  }),
  community("codigofontetv", "Código Fonte TV community", "pt-BR", "manual"),
  community("devto-brazil", "DEV.to Brazil tag", "pt-BR", "api"),
  community("reddit-brdev", "Reddit BRDev", "pt-BR", "api"),
  community("rocketseat", "Rocketseat community", "pt-BR", "manual"),
];

const COMMUNITY_ES: ChannelDef[] = [
  community("forosdelweb", "Foros del Web", "es", "manual"),
  community("dev-espanol", "DEV en Español", "es", "api"),
  community("midudev", "Midudev Comunidad", "es", "manual"),
  community("reddit-programacion", "Reddit Programación", "es", "api"),
];

const COMMUNITY_FR: ChannelDef[] = [
  community("grafikart-forum", "Grafikart Forum", "fr", "manual"),
  community("developpez", "Developpez.com", "fr", "manual"),
  community("reddit-france-dev", "Reddit France Dev", "fr", "api"),
];

const COMMUNITY_DE: ChannelDef[] = [
  community("computerbase-entwickler", "ComputerBase Entwickler", "de", "manual"),
  community("heise-developer", "Heise Developer", "de", "manual"),
  community("reddit-de-edv", "Reddit DE_EDV", "de", "api"),
];

const COMMUNITY_RU: ChannelDef[] = [
  community("habr", "Habr", "ru", "manual", {
    tone: "highly technical, engineering-rigorous; Habr's audience penalizes marketing framing heavily",
  }),
  community("tproger", "Tproger", "ru", "manual"),
  community("reddit-russian-programming", "Reddit Russian Programming", "ru", "api"),
];

const COMMUNITY_IT: ChannelDef[] = [
  community("html-it-forum", "Forum HTML.it", "it", "manual"),
  community("reddit-italyinformatica", "Reddit ItalyInformatica", "it", "api"),
];

const COMMUNITY_ZH: ChannelDef[] = [
  community("csdn", "CSDN", "zh", "manual"),
  community("juejin", "Juejin", "zh", "manual"),
  community("v2ex", "V2EX", "zh", "manual", {
    compliance_notes: "V2EX 分享创造 node is strict about self-promotion; disclose and add real substance.",
  }),
  community("zhihu", "Zhihu", "zh", "manual"),
];

const COMMUNITY_JA: ChannelDef[] = [
  community("qiita", "Qiita", "ja", "api"),
  community("zenn", "Zenn", "ja", "api"),
  community("teratail", "Teratail", "ja", "manual", {
    allowed_content_types: ["qa-answer"],
  }),
];

const COMMUNITY_KO: ChannelDef[] = [
  community("velog", "Velog", "ko", "manual"),
  community("inflearn-community", "Inflearn Community", "ko", "manual"),
  community("okky", "OKKY", "ko", "manual"),
];

export const CHANNEL_REGISTRY: ChannelDef[] = [
  ...SOCIAL,
  ...COMMUNITY_EN,
  ...COMMUNITY_PT,
  ...COMMUNITY_ES,
  ...COMMUNITY_FR,
  ...COMMUNITY_DE,
  ...COMMUNITY_RU,
  ...COMMUNITY_IT,
  ...COMMUNITY_ZH,
  ...COMMUNITY_JA,
  ...COMMUNITY_KO,
];

export function getChannel(id: string): ChannelDef | undefined {
  return CHANNEL_REGISTRY.find((c) => c.id === id);
}

export function channelsByKind(kind: ChannelDef["kind"]): ChannelDef[] {
  return CHANNEL_REGISTRY.filter((c) => c.kind === kind);
}

export function channelsByLanguage(language: string): ChannelDef[] {
  return CHANNEL_REGISTRY.filter((c) => c.language === language);
}

/**
 * English-first routing: a campaign's source-of-truth artifact is always
 * produced for the English channel set before any localized variant is
 * generated. Returns the language-tagged channel list in "English first"
 * order (en channels, then all others grouped by language).
 */
export function englishFirstOrder(): ChannelDef[] {
  const en = CHANNEL_REGISTRY.filter((c) => c.language === "en");
  const rest = CHANNEL_REGISTRY.filter((c) => c.language !== "en");
  return [...en, ...rest];
}
