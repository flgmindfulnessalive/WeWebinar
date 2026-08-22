import { NextResponse } from "next/server";

import { getCurrentAccount } from "@/lib/data/account";
import { createClient } from "@/lib/supabase/server";
import { mux } from "@/lib/mux";

export async function POST(request: Request) {
  const { webinar_id: webinarId } = (await request.json()) as {
    webinar_id?: string;
  };

  if (!webinarId) {
    return NextResponse.json({ error: "webinar_id is required" }, { status: 400 });
  }

  const current = await getCurrentAccount();
  if (!current) {
    return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  }
  if (current.user.role !== "owner" && current.user.role !== "editor") {
    return NextResponse.json({ error: "not allowed" }, { status: 403 });
  }

  // RLS already scopes this to the caller's account, but we double-check
  // account_id explicitly so a stray webinar_id from another tenant can't
  // silently no-op into a confusing 404 vs 403 distinction.
  const supabase = await createClient();
  const { data: webinar } = await supabase
    .from("webinars")
    .select("id, account_id")
    .eq("id", webinarId)
    .single();

  if (!webinar || webinar.account_id !== current.account.id) {
    return NextResponse.json({ error: "webinar not found" }, { status: 404 });
  }

  const upload = await mux.video.uploads.create({
    cors_origin: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    new_asset_settings: {
      playback_policies: ["public"],
      passthrough: webinarId,
      video_quality: "basic",
    },
  });

  if (!upload.url) {
    return NextResponse.json({ error: "mux did not return an upload url" }, { status: 502 });
  }

  return NextResponse.json({ url: upload.url });
}
