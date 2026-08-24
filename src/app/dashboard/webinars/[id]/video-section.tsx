"use client";

import { useRef, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  LockedYouTubePlayer,
  type LockedYouTubePlayerHandle,
} from "@/components/locked-youtube-player";
import { extractYouTubeVideoId } from "@/lib/youtube";
import { setWebinarVideo } from "@/lib/actions/webinars";

type VideoState = {
  youtube_video_id: string | null;
  duration_seconds: number | null;
};

export function VideoSection({
  webinarId,
  initial,
}: {
  webinarId: string;
  initial: VideoState;
}) {
  const [state, setState] = useState<VideoState>(initial);
  const [showInput, setShowInput] = useState(!initial.youtube_video_id);
  const [urlInput, setUrlInput] = useState("");
  const [pendingVideoId, setPendingVideoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const previewRef = useRef<LockedYouTubePlayerHandle | null>(null);

  function handleLoad() {
    const id = extractYouTubeVideoId(urlInput);
    if (!id) {
      setError("No pude reconocer ese link de YouTube. Prueba pegando la URL completa.");
      return;
    }
    setError(null);
    setPendingVideoId(id);
  }

  async function handleDurationReady(durationSeconds: number) {
    if (!pendingVideoId || durationSeconds <= 0) return;
    setIsSaving(true);
    const result = await setWebinarVideo(webinarId, pendingVideoId, durationSeconds);
    setIsSaving(false);
    if (result?.error) {
      setError(result.error);
      setPendingVideoId(null);
      return;
    }
    setState({ youtube_video_id: pendingVideoId, duration_seconds: Math.round(durationSeconds) });
    setPendingVideoId(null);
    setShowInput(false);
    setUrlInput("");
  }

  if (showInput) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Video
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Pegá el link de un video de YouTube &ldquo;no listado&rdquo;
            (Visibilidad → Oculto, en YouTube Studio). No hace falta que sea
            público.
          </p>
          <div className="grid gap-1.5">
            <Label htmlFor="youtube-url">Link de YouTube</Label>
            <div className="flex gap-2">
              <Input
                id="youtube-url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://youtu.be/..."
              />
              <Button type="button" onClick={handleLoad} disabled={!urlInput.trim()}>
                Cargar
              </Button>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          {pendingVideoId && (
            <div className="flex flex-col gap-2">
              <div className="aspect-video w-full overflow-hidden rounded-md bg-black">
                <LockedYouTubePlayer
                  ref={previewRef}
                  videoId={pendingVideoId}
                  muted
                  onLoadedMetadata={handleDurationReady}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                {isSaving ? "Guardando..." : "Cargando duración del video..."}
              </p>
            </div>
          )}

          {state.youtube_video_id && (
            <Button type="button" variant="ghost" onClick={() => setShowInput(false)}>
              Cancelar
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Video
        </CardTitle>
        <Button size="sm" variant="outline" onClick={() => setShowInput(true)}>
          Reemplazar video
        </Button>
      </CardHeader>
      <CardContent>
        {state.youtube_video_id && (
          <div className="aspect-video w-full overflow-hidden rounded-md bg-black">
            <LockedYouTubePlayer videoId={state.youtube_video_id} muted />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
