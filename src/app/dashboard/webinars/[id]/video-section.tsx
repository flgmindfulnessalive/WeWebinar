"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WebinarPlayer, type WebinarPlayerHandle } from "@/components/webinar-player";
import { extractYouTubeVideoId } from "@/lib/youtube";
import { parseDirectVideoUrl } from "@/lib/direct-video";
import { setWebinarVideo } from "@/lib/actions/webinars";
import type { VideoProvider } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";

type VideoState = {
  video_provider: VideoProvider | null;
  video_source: string | null;
  duration_seconds: number | null;
};

export function VideoSection({
  webinarId,
  initial,
}: {
  webinarId: string;
  initial: VideoState;
}) {
  const t = useTranslations("VideoSection");
  const tCommon = useTranslations("SettingsCommon");
  const [state, setState] = useState<VideoState>(initial);
  const [showInput, setShowInput] = useState(!initial.video_source);
  const [provider, setProvider] = useState<VideoProvider>(initial.video_provider ?? "youtube");
  const [urlInput, setUrlInput] = useState("");
  const [pendingSource, setPendingSource] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const previewRef = useRef<WebinarPlayerHandle | null>(null);

  function handleLoad() {
    if (provider === "youtube") {
      const id = extractYouTubeVideoId(urlInput);
      if (!id) {
        setError(t("invalidLink"));
        return;
      }
      setError(null);
      setPendingSource(id);
    } else {
      const url = parseDirectVideoUrl(urlInput);
      if (!url) {
        setError(t("invalidDirectUrl"));
        return;
      }
      setError(null);
      setPendingSource(url);
    }
  }

  async function handleDurationReady(durationSeconds: number) {
    if (!pendingSource || durationSeconds <= 0) return;
    setIsSaving(true);
    const result = await setWebinarVideo(webinarId, provider, pendingSource, durationSeconds);
    setIsSaving(false);
    if (result?.error) {
      setError(result.error);
      setPendingSource(null);
      return;
    }
    setState({
      video_provider: provider,
      video_source: pendingSource,
      duration_seconds: Math.round(durationSeconds),
    });
    setPendingSource(null);
    setShowInput(false);
    setUrlInput("");
  }

  function switchProvider(next: VideoProvider) {
    setProvider(next);
    setUrlInput("");
    setPendingSource(null);
    setError(null);
  }

  if (showInput) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex w-fit flex-wrap gap-1 rounded-md border p-1">
          <Button
            type="button"
            size="sm"
            variant={provider === "youtube" ? "default" : "ghost"}
            onClick={() => switchProvider("youtube")}
          >
            {t("providerYoutube")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={provider === "direct_url" ? "default" : "ghost"}
            onClick={() => switchProvider("direct_url")}
          >
            {t("providerDirectUrl")}
          </Button>
        </div>

        <p className="text-sm text-muted-foreground">
          {provider === "youtube" ? t("unlistedHint") : t("directUrlHint")}
        </p>

        <div className="grid gap-1.5">
          <Label htmlFor="video-url">
            {provider === "youtube" ? t("youtubeLinkLabel") : t("directUrlLabel")}
          </Label>
          <div className="flex gap-2">
            <Input
              id="video-url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder={provider === "youtube" ? "https://youtu.be/..." : "https://cdn.tuempresa.com/video.mp4"}
            />
            <Button type="button" onClick={handleLoad} disabled={!urlInput.trim()}>
              {t("load")}
            </Button>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        {pendingSource && (
          <div className="flex flex-col gap-2">
            <div className="aspect-video w-full overflow-hidden rounded-md bg-black">
              <WebinarPlayer
                ref={previewRef}
                provider={provider}
                source={pendingSource}
                muted
                onLoadedMetadata={handleDurationReady}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {isSaving ? tCommon("saving") : t("loadingDuration")}
            </p>
          </div>
        )}

        {state.video_source && (
          <Button type="button" variant="ghost" onClick={() => setShowInput(false)}>
            {t("cancel")}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className={cn("text-xs font-medium text-muted-foreground")}>
          {state.video_provider === "direct_url" ? t("providerDirectUrl") : t("providerYoutube")}
        </span>
        <Button size="sm" variant="outline" onClick={() => setShowInput(true)}>
          {t("replaceVideo")}
        </Button>
      </div>
      {state.video_source && state.video_provider && (
        <div className="aspect-video w-full overflow-hidden rounded-md bg-black">
          <WebinarPlayer provider={state.video_provider} source={state.video_source} muted />
        </div>
      )}
    </div>
  );
}
