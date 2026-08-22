"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getCurrentAccount } from "@/lib/data/account";
import type { UserRole } from "@/lib/supabase/database.types";

export type TeamActionState = { error: string } | null;

export async function inviteMember(
  _prevState: TeamActionState,
  formData: FormData
): Promise<TeamActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "editor") as UserRole;

  if (!email) {
    return { error: "El email es obligatorio." };
  }
  if (role !== "editor" && role !== "viewer") {
    return { error: "Rol inválido." };
  }

  const current = await getCurrentAccount();
  if (!current || current.user.role !== "owner") {
    return { error: "Solo el Owner puede invitar usuarios." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("account_invitations").insert({
    account_id: current.account.id,
    email,
    role,
    invited_by: current.user.id,
  });

  revalidatePath("/dashboard/team");

  if (error) {
    if (error.code === "23505") {
      return { error: "Ya hay una invitación pendiente para ese email." };
    }
    return {
      error: error.message.startsWith("plan_limit_exceeded")
        ? "Llegaste al límite de usuarios de tu plan. Pasate a un plan superior para invitar a más gente."
        : error.message,
    };
  }

  return null;
}

export async function revokeInvitation(invitationId: string): Promise<TeamActionState> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("account_invitations")
    .delete()
    .eq("id", invitationId);

  revalidatePath("/dashboard/team");

  if (error) {
    return { error: error.message };
  }
  return null;
}

export async function removeMember(userId: string): Promise<TeamActionState> {
  const supabase = await createClient();
  const { error } = await supabase.from("users").delete().eq("id", userId);

  revalidatePath("/dashboard/team");

  if (error) {
    return { error: error.message };
  }
  return null;
}
