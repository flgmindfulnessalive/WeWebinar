"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WebinarPlayer, type WebinarPlayerHandle } from "@/components/webinar-player";
import { extractYouTubeVideoId } from "@/lib/youtube";
import { extractVimeoVideoId } from "@/lib/vimeo";
import { parseDirectVideoUrl } from "@/lib/direct-video";
import { setWebinarVideo } from "@/lib/actions/webinars";
import type { VideoProvider } from "@/lib/supabase/database.types";

type VideoState = {
  video_provider: VideoProvider | null;
  video_source: string | null;
  duration_seconds: number | null;
};

const PROVIDERS: VideoProvider[] = ["youtube", "vimeo", "direct_url"];

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
    } else if (provider === "vimeo") {
      const id = extractVimeoVideoId(urlInput);
      if (!id) {
        setError(t("invalidVimeoLink"));
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
          {PROVIDERS.map((p) => (
            <Button
              key={p}
              type="button"
              size="sm"
              variant={provider === p ? "default" : "ghost"}
              onClick={() => switchProvider(p)}
            >
              {t(providerLabelKey(p))}
            </Button>
          ))}
        </div>

        <p className="text-sm text-muted-foreground">{t(providerHintKey(provider))}</p>

        <div className="grid gap-1.5">
          <Label htmlFor="video-url">{t(providerFieldLabelKey(provider))}</Label>
          <div className="flex gap-2">
            <Input
              id="video-url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder={providerPlaceholder(provider)}
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
        <span className="text-xs font-medium text-muted-foreground">
          {state.video_provider ? t(providerLabelKey(state.video_provider)) : ""}
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

function providerLabelKey(provider: VideoProvider): "providerYoutube" | "providerVimeo" | "providerDirectUrl" {
  if (provider === "vimeo") return "providerVimeo";
  if (provider === "direct_url") return "providerDirectUrl";
  return "providerYoutube";
}

function providerHintKey(provider: VideoProvider): "unlistedHint" | "vimeoHint" | "directUrlHint" {
  if (provider === "vimeo") return "vimeoHint";
  if (provider === "direct_url") return "directUrlHint";
  return "unlistedHint";
}

function providerFieldLabelKey(
  provider: VideoProvider
): "youtubeLinkLabel" | "vimeoLinkLabel" | "directUrlLabel" {
  if (provider === "vimeo") return "vimeoLinkLabel";
  if (provider === "direct_url") return "directUrlLabel";
  return "youtubeLinkLabel";
}

function providerPlaceholder(provider: VideoProvider): string {
  if (provider === "vimeo") return "https://vimeo.com/...";
  if (provider === "direct_url") return "https://cdn.tuempresa.com/video.mp4";
  return "https://youtu.be/...";
}
