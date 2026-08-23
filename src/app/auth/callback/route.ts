import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

// Handles both the OAuth redirect (Google) and the email confirmation link.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        return NextResponse.redirect(`${origin}${next}`);
      }
      console.error("[auth/callback] exchangeCodeForSession failed:", {
        code: error.code,
        message: error.message,
        status: error.status,
      });
    } catch (err) {
      console.error("[auth/callback] exchangeCodeForSession threw:", err);
    }
  } else {
    console.error("[auth/callback] no code param in request:", request.url);
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
