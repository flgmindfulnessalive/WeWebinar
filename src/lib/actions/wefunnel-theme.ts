"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type PanelTheme = "dark" | "light";

// Guardar el tema del panel.
//
// Escribe sobre la propia fila de la persona: users_update_self_or_owner
// ya lo permite y guard_user_row_changes no vigila esta columna, así que
// no hace falta un RPC. El valor no se toma del formulario tal cual --
// llega del navegador -- sino que se compara contra los dos únicos
// admitidos, y lo que no sea "light" es oscuro.
export async function setPanelTheme(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const asked = formData.get("theme");
  const theme: PanelTheme = asked === "light" ? "light" : "dark";

  const { error } = await supabase
    .from("users")
    .update({ wefunnel_theme: theme })
    .eq("id", user.id);

  if (error) {
    console.error("[wefunnels] no se pudo guardar el tema:", error.message);
    return;
  }

  // El tema lo pinta el layout del panel desde la sesión, así que hay que
  // rehacer el árbol entero y no solo esta pantalla: si no, Configuración
  // cambiaría de color y el resto del panel seguiría como estaba hasta la
  // siguiente navegación.
  revalidatePath("/f/panel", "layout");
}
