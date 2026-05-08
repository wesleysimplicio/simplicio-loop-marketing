export interface PublishPiece {
  id: string;
  platforms: string[];
  caption: string;
  media_paths: string[];
  scheduled_at: string;
}

export interface PublishResult {
  ok: boolean;
  draft_url: string;
  error?: string;
}

export interface PublishClient {
  schedule(piece: PublishPiece): Promise<PublishResult>;
}

export class AdaptlyPostClient implements PublishClient {
  readonly name = "adaptlypost";

  async schedule(piece: PublishPiece): Promise<PublishResult> {
    const dry_run_flag = process.env.DRY_RUN ?? "true";
    const dry_run = dry_run_flag === "true";
    void piece.platforms;
    void piece.caption;
    void piece.media_paths;
    void piece.scheduled_at;
    if (!dry_run) {
      // Real API call wiring would live here. Mock layer never calls out.
      return {
        ok: true,
        draft_url: `https://adaptlypost.test/drafts/${piece.id}`,
      };
    }
    return {
      ok: true,
      draft_url: `https://adaptlypost.test/drafts/${piece.id}`,
    };
  }
}

export function getPublishClient(): PublishClient {
  return new AdaptlyPostClient();
}
