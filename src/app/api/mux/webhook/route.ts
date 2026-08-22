import { NextResponse } from "next/server";

import { mux } from "@/lib/mux";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const body = await request.text();

  let event: Awaited<ReturnType<typeof mux.webhooks.unwrap>>;
  try {
    event = await mux.webhooks.unwrap(
      body,
      request.headers,
      process.env.MUX_WEBHOOK_SECRET
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "invalid signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const supabase = createAdminClient();

  switch (event.type) {
    case "video.asset.created": {
      const asset = event.data;
      const webinarId = asset.passthrough;
      if (!webinarId) break;

      // A host re-uploading a webinar's video points a new asset at the
      // same passthrough (webinar_id). Delete the stale asset in Mux so it
      // doesn't keep costing storage once we overwrite the reference below.
      const { data: existing } = await supabase
        .from("webinars")
        .select("mux_asset_id")
        .eq("id", webinarId)
        .single();

      if (existing?.mux_asset_id && existing.mux_asset_id !== asset.id) {
        await mux.video.assets.delete(existing.mux_asset_id).catch(() => {});
      }

      await supabase
        .from("webinars")
        .update({
          mux_asset_id: asset.id,
          mux_playback_id: null,
          duration_seconds: null,
        })
        .eq("id", webinarId);
      break;
    }

    case "video.asset.ready": {
      const asset = event.data;
      const webinarId = asset.passthrough;
      if (!webinarId) break;

      const playbackId = asset.playback_ids?.[0]?.id ?? null;

      await supabase
        .from("webinars")
        .update({
          mux_asset_id: asset.id,
          mux_playback_id: playbackId,
          duration_seconds: asset.duration ? Math.round(asset.duration) : null,
        })
        .eq("id", webinarId);
      break;
    }

    case "video.asset.errored": {
      const asset = event.data;
      const webinarId = asset.passthrough;
      if (!webinarId) break;

      await supabase
        .from("webinars")
        .update({ mux_asset_id: null, mux_playback_id: null, duration_seconds: null })
        .eq("id", webinarId);
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
