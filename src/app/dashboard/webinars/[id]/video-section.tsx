"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import MuxUploader from "@mux/mux-uploader-react";

import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const MuxPlayer = dynamic(() => import("@mux/mux-player-react"), { ssr: false });

type VideoState = {
  mux_asset_id: string | null;
  mux_playback_id: string | null;
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
  const [showUploader, setShowUploader] = useState(!initial.mux_asset_id);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isProcessing = state.mux_asset_id && !state.mux_playback_id;

  useEffect(() => {
    if (!isProcessing) return;

    const supabase = createClient();
    pollRef.current = setInterval(async () => {
      const { data } = await supabase
        .from("webinars")
        .select("mux_asset_id, mux_playback_id, duration_seconds")
        .eq("id", webinarId)
        .single();
      if (data) setState(data);
    }, 4000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [isProcessing, webinarId]);

  if (showUploader) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Video
          </CardTitle>
        </CardHeader>
        <CardContent>
          <MuxUploader
            endpoint={async () => {
              const res = await fetch("/api/mux/upload", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ webinar_id: webinarId }),
              });
              const data = await res.json();
              if (!res.ok) throw new Error(data.error ?? "upload failed");
              return data.url as string;
            }}
            onSuccess={() => {
              setShowUploader(false);
              setState((s) => ({ ...s, mux_asset_id: "pending" }));
            }}
          />
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
        <Button size="sm" variant="outline" onClick={() => setShowUploader(true)}>
          Reemplazar video
        </Button>
      </CardHeader>
      <CardContent>
        {state.mux_playback_id ? (
          <MuxPlayer
            playbackId={state.mux_playback_id}
            streamType="on-demand"
            metadata={{ video_id: webinarId }}
          />
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Procesando video... esto puede tardar unos minutos.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
