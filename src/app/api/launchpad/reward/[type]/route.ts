import { NextResponse } from "next/server";

import { getCurrentAccount } from "@/lib/data/account";
import { LAUNCHPAD_REWARD_TYPES, type LaunchpadRewardType } from "@/lib/launchpad/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function isRewardType(value: string): value is LaunchpadRewardType {
  return (LAUNCHPAD_REWARD_TYPES as readonly string[]).includes(value);
}

// Redime una recompensa: exige que ya esté "unlocked" (nunca la
// desbloquea acá -- eso solo pasa en /api/launchpad/demo al completar la
// etapa) y la marca "redeemed". El código de descuento en sí NUNCA se
// guarda en la base -- es un cupón fijo ya creado en el proveedor de
// pagos, servido desde una env var server-only (LAUNCHPAD_DISCOUNT_CODE)
// recién en la respuesta de esta ruta, nunca antes de confirmar
// "unlocked"/"redeemed" server-side.
export async function POST(request: Request, { params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  if (!isRewardType(type)) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

  const current = await getCurrentAccount();
  if (!current) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const supabase = await createClient();
  const { data: project, error: projectError } = await supabase.rpc("get_or_create_launchpad_project", {
    p_account_id: current.account.id,
  });
  if (projectError || !project) return NextResponse.json({ error: "save_failed" }, { status: 500 });

  const admin = createAdminClient();
  const { data: rewardRow } = await admin
    .from("launchpad_rewards")
    .select("status")
    .eq("project_id", project.id)
    .eq("reward_type", type)
    .maybeSingle();

  if (!rewardRow || rewardRow.status === "locked" || rewardRow.status === "expired") {
    return NextResponse.json({ error: "not_unlocked" }, { status: 403 });
  }

  if (rewardRow.status === "unlocked") {
    const { error: updateError } = await admin
      .from("launchpad_rewards")
      .update({ status: "redeemed", redeemed_at: new Date().toISOString() })
      .eq("project_id", project.id)
      .eq("reward_type", type);
    if (updateError) return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }

  if (type === "discount") {
    return NextResponse.json({ code: process.env.LAUNCHPAD_DISCOUNT_CODE ?? null });
  }
  return NextResponse.json({ ok: true });
}
