export type PublishMethod = "api" | "mcp" | "browser" | "computer-use" | "manual";

export type ChannelKind = "social" | "community";

export interface ChannelDef {
  id: string;
  name: string;
  kind: ChannelKind;
  language: string;
  audience: string;
  allowed_content_types: string[];
  link_policy: string;
  tone: string;
  publish_method: PublishMethod;
  compliance_notes: string;
  /** Max posts/participations per rolling window, to avoid spam. */
  frequency_limit?: {
    count: number;
    window_days: number;
  };
}
