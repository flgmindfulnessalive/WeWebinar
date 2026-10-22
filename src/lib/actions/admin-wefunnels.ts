"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { WEFUNNELS_HOST } from "@/lib/wefunnels/host";
import { normalizeSlug, proposeSlug } from "@/lib/wefunnels/slug";
import { extractYouTubeVideoId } from "@/lib/youtube";

export type ModerationState = { error: string } | { success: true } | null;

// Invalidar la caché pasa DESPUÉS de escribir, así que un fallo aquí no
// debería convertir un guardado bueno en un error en pantalla: la fila ya
// está, y lo único que se pierde es que una ruta tarde un poco más en
// enterarse.
function refresh(...paths: string[]) {
  for (const path of paths) {
    try {
      revalidatePath(path);
    } catch (err) {
      console.error(`[wefunnel/admin] revalidatePath(${path}) failed:`, err);
    }
  }
}

// Una acción que lanza no deja un mensaje: deja la pantalla de error en
// lugar de la página, y con ella se va todo lo que hubiera escrito sin
// guardar. En el Superadmin eso es caro, porque aquí se escriben
// descripciones largas y guiones enteros. Así que cualquier fallo que no
// hayamos previsto vuelve como texto dentro del propio formulario, con lo
// que diga el error, y el detalle completo se queda en el log del
// servidor.
//
// No atrapa el caso contrario --- que el servidor no encuentre la acción
// porque la página es de antes del último despliegue ---, que ocurre antes
// de llegar aquí. De ese se encarga app/admin/error.tsx.
function guarded(
  label: string,
  run: (prev: ModerationState, formData: FormData) => Promise<ModerationState>
) {
  return async function (
    prev: ModerationState,
    formData: FormData
  ): Promise<ModerationState> {
    // Una línea al entrar y otra al salir. Con esto el log del servidor
    // distingue el caso que no se puede ver desde la pantalla: si no
    // aparece ni el "start", la petición no llegó nunca a la acción --
    // se quedó antes, en el proxy o en el propio Next -- y entonces el
    // fallo no está aquí dentro.
    console.info(`[wefunnel/admin] ${label}: start`);
    try {
      const result = await run(prev, formData);
      console.info(
        `[wefunnel/admin] ${label}: ${result && "error" in result ? "rejected" : "ok"}`
      );
      return result;
    } catch (err) {
      // redirect() y notFound() lanzan a propósito: son control de flujo
      // de Next y atraparlos los rompería en silencio.
      unstable_rethrow(err);
      console.error(`[wefunnel/admin] ${label} threw:`, err);
      const digest = (err as { digest?: string })?.digest;
      const detail = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
      return {
        error: `No se pudo guardar — ${detail}${digest ? ` · ref ${digest}` : ""}`,
      };
    }
  };
}


// Both RPCs check is_platform_admin() themselves. That check lives in the
// database rather than only here because these are the calls that take a
// stranger's page off the internet: the authority to make them should not
// depend on which route happened to invoke them.

export async function setSiteSuspended(
  _prev: ModerationState,
  formData: FormData
): Promise<ModerationState> {
  const siteId = String(formData.get("siteId") ?? "");
  const suspended = formData.get("suspended") === "true";
  const rule = String(formData.get("rule") ?? "manual").trim().slice(0, 80);
  const note = String(formData.get("note") ?? "").trim().slice(0, 1000);

  if (!siteId) return { error: "Falta la página." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("wefunnel_set_suspended", {
    p_site_id: siteId,
    p_suspended: suspended,
    p_rule: rule || "manual",
    p_note: note || undefined,
  });

  if (error) {
    console.error("[wefunnel/admin] suspend failed:", error.message);
    return { error: error.message };
  }

  refresh("/admin/wefunnels");
  return { success: true };
}

export async function clearReview(
  _prev: ModerationState,
  formData: FormData
): Promise<ModerationState> {
  const reviewId = String(formData.get("reviewId") ?? "");
  if (!reviewId) return { error: "Falta el aviso." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("wefunnel_clear_review", {
    p_review_id: reviewId,
  });

  if (error) {
    console.error("[wefunnel/admin] clear failed:", error.message);
    return { error: error.message };
  }

  refresh("/admin/wefunnels");
  return { success: true };
}

// =========================================================================
// La consola: crear cuentas y regalar licencias
//
// wefunnel_admin_create_site y wefunnel_grant_distributor comprueban
// is_platform_admin() por su cuenta, igual que las dos de arriba. Lo que no
// puede comprobarlo es auth.admin.createUser, que corre con la clave de
// servicio y no pasa por la base: por eso aquí se verifica a mano antes de
// tocarla, y no solo en el layout de /admin.
// =========================================================================

export type ConsoleState = { error: string } | { success: string } | null;

// PostgREST contesta PGRST202 cuando le piden una función que no está en su
// caché de esquema, y su mensaje es la firma entera con los argumentos. Para
// quien mira esta pantalla eso no dice nada; lo que ha pasado casi siempre
// es que la migración todavía no se ha aplicado.
const MIGRATION_PENDING =
  "Falta aplicar la migración: ejecuta «supabase db push» y vuelve a intentarlo. " +
  "Si ya la aplicaste, recarga la caché de esquema con «notify pgrst, 'reload schema';».";

function readable(error: { code?: string; message: string }): string {
  return error.code === "PGRST202" ? MIGRATION_PENDING : error.message;
}

// Tres respuestas distintas, no una.
//
// Antes se quedaba solo con `data` y cualquier cosa que no fuera cierta
// salía como "No autorizado.": daba igual que la comprobación hubiera
// fallado, que la sesión se hubiera perdido o que la persona de verdad
// no fuera administradora. Eso convierte un fallo con causa en un
// mensaje sin pistas, delante de alguien que está mirando su propio
// panel de administración y sabe que sí lo es.
//
// El caso que se vio en producción: las dos marcas comparten la cookie
// de sesión en .wewebinars.com, así que darse de alta con una cuenta de
// prueba en WeFunnels SUSTITUYE la sesión de administrador. La pantalla
// ya cargada sigue a la vista con los datos de antes, y el primer envío
// de un formulario va con la sesión nueva, que no es administradora.
async function assertAdmin(): Promise<string | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return "Tu sesión caducó o se cambió por otra. Recarga la página y vuelve a entrar.";
  }

  const { data: isAdmin, error } = await supabase.rpc("is_platform_admin");
  if (error) {
    console.error("[wefunnel/admin] is_platform_admin falló:", error.message);
    return `No pudimos comprobar tus permisos: ${readable(error)}`;
  }

  return isAdmin
    ? null
    : `La sesión actual (${user.email ?? "sin email"}) no es de administrador. ` +
        "Si acabas de crear una cuenta de prueba, esa sesión sustituyó a la tuya: " +
        "cierra sesión y vuelve a entrar con tu cuenta.";
}

// Contra public.users y no contra auth.admin.listUsers: aquella pagina y
// buscar un correo entre páginas deja de encontrarlo en cuanto haya más
// usuarios que la primera. Esta tabla tiene el email indexado y un trigger
// lo mantiene al día con auth (20260827000004).
async function findUserByEmail(
  email: string
): Promise<{ id: string; accountId: string | null } | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("users")
    .select("id, account_id")
    .ilike("email", email.trim())
    .maybeSingle();
  return data ? { id: data.id, accountId: data.account_id } : null;
}

export async function createWeFunnelAccount(
  _prev: ConsoleState,
  formData: FormData
): Promise<ConsoleState> {
  const denied = await assertAdmin();
  if (denied) return { error: denied };

  const name = String(formData.get("name") ?? "").trim().slice(0, 80);
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const slug = normalizeSlug(String(formData.get("slug") ?? "") || proposeSlug(name));
  const grant = formData.get("grant") === "on";
  const months = Number(formData.get("months") ?? 2);

  if (!name) return { error: "Escribe el nombre." };
  if (!email.includes("@")) return { error: "Escribe un email válido." };
  if (!slug) return { error: "No se pudo proponer una dirección a partir del nombre." };
  if (password && password.length < 8) {
    return { error: "La contraseña necesita al menos 8 caracteres." };
  }

  const admin = createAdminClient();

  // Si ya existe se reutiliza su identidad en vez de fallar: lo normal es
  // que alguien ya se haya registrado y lo que le falte sea la página.
  const existing = await findUserByEmail(email);
  let userId = existing?.id ?? null;
  let created = false;

  if (!userId) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: password || undefined,
      // Confirmado de entrada: lo crea un administrador, no hay nada que
      // verificar, y sin esto no podría publicar su página (20261007000012).
      email_confirm: true,
      user_metadata: { full_name: name },
    });
    if (error || !data.user) {
      console.error("[wefunnel/admin] createUser failed:", error?.message);
      return { error: error?.message ?? "No se pudo crear el usuario." };
    }
    userId = data.user.id;
    created = true;
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("wefunnel_admin_create_site", {
    p_user_id: userId,
    p_display_name: name,
    p_slug: slug,
    p_grant_license: grant,
    p_included_months: Number.isFinite(months) ? months : 2,
  });

  if (error) {
    console.error("[wefunnel/admin] create site failed:", error.message);
    return { error: readable(error) };
  }

  refresh("/admin/wefunnels");
  return {
    success: `${name}: ${WEFUNNELS_HOST}/${slug}${grant ? " · con licencia" : ""}${
      created ? "" : " · se reutilizó su usuario"
    }`,
  };
}

export async function grantDistributorLicense(
  _prev: ConsoleState,
  formData: FormData
): Promise<ConsoleState> {
  const denied = await assertAdmin();
  if (denied) return { error: denied };

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const months = Number(formData.get("months") ?? 2);
  if (!email.includes("@")) return { error: "Escribe un email válido." };

  const user = await findUserByEmail(email);
  if (!user) return { error: "No hay ningún usuario con ese email." };
  if (!user.accountId) {
    return { error: "Ese usuario todavía no tiene cuenta. Créale una aquí arriba." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("wefunnel_grant_distributor", {
    p_account_id: user.accountId,
    p_included_months: Number.isFinite(months) ? months : 2,
  });

  if (error) {
    console.error("[wefunnel/admin] grant failed:", error.message);
    return { error: readable(error) };
  }

  refresh("/admin/wefunnels");
  return { success: `Licencia concedida a ${email}.` };
}

// Darle su página a quien se quedó a medias.
//
// Su cuenta existe -- se registró, quizá confirmó -- pero nunca llegó a
// reclamar, así que no tiene ni cuenta de WeWebinars ni página ni ficha
// en los registros de quien la invitó. "Crear una cuenta" de aquí arriba
// no sirve: esa crea un usuario nuevo, y esta persona ya tiene el suyo.
//
// La dirección se propone a partir de su nombre, igual que haría el
// reclamo normal, y la invitación que se acredita es la que su propia
// alta dejó guardada. Si ya no vale -- página despublicada, sin licencia
// -- la página se crea igual, sin acreditar a nadie: es mejor que esa
// persona tenga su funnel sin atribución a que no lo tenga.
export async function grantSiteToSignup(
  _prev: ConsoleState,
  formData: FormData
): Promise<ConsoleState> {
  const denied = await assertAdmin();
  if (denied) return { error: denied };

  const userId = String(formData.get("userId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim().slice(0, 80);
  const slug = normalizeSlug(String(formData.get("slug") ?? "") || proposeSlug(name));
  const refSlug = String(formData.get("refSlug") ?? "").trim() || null;

  if (!userId) return { error: "Falta el usuario." };
  if (!name) return { error: "Escribe el nombre." };
  if (!slug) return { error: "No se pudo proponer una dirección a partir del nombre." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("wefunnel_admin_grant_site", {
    p_user_id: userId,
    p_display_name: name,
    p_slug: slug,
    p_ref_slug: refSlug,
  });

  if (error) {
    console.error("[wefunnel/admin] grant site failed:", error.message);
    return { error: readable(error) };
  }

  refresh("/admin/wefunnels");
  return {
    success: `${name} ya tiene su página: ${WEFUNNELS_HOST}/${slug}${
      refSlug ? ` · acreditada a /${refSlug}` : " · sin acreditar"
    }.`,
  };
}

// =========================================================================
// Recursos: los cursos de anuncios y de contenido en redes.
//
// Las tres RPC comprueban is_platform_admin() por su cuenta, igual que las
// de moderación: quien puede publicar formación en todos los paneles no
// debería depender de qué ruta hizo la llamada.
// =========================================================================

// Los límites de las columnas, dichos en español antes de que lo diga
// Postgres. Sin esto, pasarse de largo devolvía el texto crudo de la
// restricción -- «violates check constraint ..._desc_len» -- que no dice
// ni qué campo es, ni cuánto sobra, ni está en el idioma de quien lo lee.
function tooLong(
  label: string,
  value: string,
  max: number
): { error: string } | null {
  if (value.length <= max) return null;
  return {
    error: `${label} no puede pasar de ${max} caracteres. Tiene ${value.length}: sobran ${value.length - max}.`,
  };
}

async function saveResourceSectionImpl(
  _prev: ModerationState,
  formData: FormData
): Promise<ModerationState> {
  const id = String(formData.get("id") ?? "").trim() || null;
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const position = Number(formData.get("position") ?? 0);

  if (!title) return { error: "El curso necesita un nombre." };
  const long =
    tooLong("El nombre del curso", title, 120) ??
    tooLong("La descripción", description, 600);
  if (long) return long;

  const supabase = await createClient();
  const { error } = await supabase.rpc("wefunnel_resource_section_upsert", {
    p_id: id,
    p_title: title,
    p_description: description || null,
    p_position: Number.isFinite(position) ? position : 0,
    p_published: formData.get("published") === "on",
  });

  if (error) {
    console.error("[wefunnel/admin] section upsert failed:", error.message);
    return { error: error.message };
  }

  refresh("/admin/wefunnels", "/f/panel/recursos");
  return { success: true };
}

async function saveResourceImpl(
  _prev: ModerationState,
  formData: FormData
): Promise<ModerationState> {
  const id = String(formData.get("id") ?? "").trim() || null;
  const sectionId = String(formData.get("sectionId") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const duration = String(formData.get("duration") ?? "").trim();
  const position = Number(formData.get("position") ?? 0);

  if (!sectionId) return { error: "Falta el curso al que pertenece." };
  if (!title) return { error: "El vídeo necesita un título." };
  const longVideo =
    tooLong("El título", title, 160) ??
    tooLong("La descripción", description, 600) ??
    tooLong("La duración", duration, 24);
  if (longVideo) return longVideo;

  // Se pega la dirección entera y aquí se queda solo el identificador. El
  // parseo es del servidor y no del navegador: lo que llega del formulario
  // es texto de alguien, y la columna solo admite los once caracteres del
  // alfabeto de YouTube.
  const youtubeId = extractYouTubeVideoId(String(formData.get("youtube") ?? ""));
  if (!youtubeId) {
    return {
      error:
        "No reconocimos ese enlace de YouTube. Pega la dirección del vídeo, o su identificador de once caracteres.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("wefunnel_resource_upsert", {
    p_id: id,
    p_section_id: sectionId,
    p_title: title,
    p_description: description || null,
    p_youtube_id: youtubeId,
    p_duration_label: duration || null,
    p_position: Number.isFinite(position) ? position : 0,
    p_published: formData.get("published") === "on",
  });

  if (error) {
    console.error("[wefunnel/admin] resource upsert failed:", error.message);
    return { error: error.message };
  }

  refresh("/admin/wefunnels", "/f/panel/recursos");
  return { success: true };
}

async function deleteResourceImpl(
  _prev: ModerationState,
  formData: FormData
): Promise<ModerationState> {
  const id = String(formData.get("id") ?? "").trim();
  const kind = String(formData.get("kind") ?? "");

  if (!id) return { error: "Falta qué borrar." };
  if (kind !== "section" && kind !== "resource") return { error: "Tipo desconocido." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("wefunnel_resource_delete", {
    p_id: id,
    p_kind: kind,
  });

  if (error) {
    console.error("[wefunnel/admin] resource delete failed:", error.message);
    return { error: error.message };
  }

  refresh("/admin/wefunnels", "/f/panel/recursos");
  return { success: true };
}

// =========================================================================
// Plantillas de contenido para distribuidores.
// =========================================================================

async function saveTemplateImpl(
  _prev: ModerationState,
  formData: FormData
): Promise<ModerationState> {
  const id = String(formData.get("id") ?? "").trim() || null;
  const kind = String(formData.get("kind") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const position = Number(formData.get("position") ?? 0);

  if (kind !== "post" && kind !== "reel") return { error: "Elige publicación o reel." };
  if (!title) return { error: "La plantilla necesita un título." };
  if (!body) return { error: "La plantilla necesita su texto." };
  const longTemplate =
    tooLong("El título", title, 160) ??
    tooLong("El formato", String(formData.get("formatLabel") ?? "").trim(), 60) ??
    tooLong("El texto para la imagen", String(formData.get("artText") ?? "").trim(), 2000) ??
    tooLong("El texto del post o guion", body, 6000) ??
    tooLong("El «cómo usarla»", String(formData.get("notes") ?? "").trim(), 1200);
  if (longTemplate) return longTemplate;

  const supabase = await createClient();
  const { error } = await supabase.rpc("wefunnel_template_upsert", {
    p_id: id,
    p_kind: kind,
    p_title: title,
    p_format_label: String(formData.get("formatLabel") ?? "").trim() || null,
    p_art_text: String(formData.get("artText") ?? "").trim() || null,
    p_body: body,
    p_notes: String(formData.get("notes") ?? "").trim() || null,
    p_position: Number.isFinite(position) ? position : 0,
    p_published: formData.get("published") === "on",
    // Ya subido: el formulario manda la dirección que devolvió la subida,
    // o la que ya tenía la fila. Vacío significa quitar el diseño.
    p_image_url: String(formData.get("imageUrl") ?? "").trim() || null,
  });

  if (error) {
    console.error("[wefunnel/admin] template upsert failed:", error.message);
    return { error: error.message };
  }

  refresh("/admin/wefunnels", "/f/panel/recursos");
  return { success: true };
}

async function deleteTemplateImpl(
  _prev: ModerationState,
  formData: FormData
): Promise<ModerationState> {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "Falta qué borrar." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("wefunnel_template_delete", { p_id: id });

  if (error) {
    console.error("[wefunnel/admin] template delete failed:", error.message);
    return { error: error.message };
  }

  refresh("/admin/wefunnels", "/f/panel/recursos");
  return { success: true };
}

export type UploadState = { error: string } | { url: string } | null;

const DESIGN_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};
const DESIGN_MAX_BYTES = 8 * 1024 * 1024;

// Sube un diseño y devuelve su dirección. Va aparte del guardado de la
// plantilla porque un fichero y un formulario de texto no viajan igual:
// así se ve la imagen antes de guardar, y un fallo al subir no se lleva
// por delante el texto que ya estaba escrito.
export async function uploadTemplateDesign(
  _prev: UploadState,
  formData: FormData
): Promise<UploadState> {
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_platform_admin");
  if (!isAdmin) return { error: "No autorizado." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Elige una imagen." };

  const ext = DESIGN_TYPES[file.type];
  if (!ext) return { error: "El diseño tiene que ser PNG, JPG o WebP." };
  if (file.size > DESIGN_MAX_BYTES) {
    return { error: "El diseño no puede pasar de 8 MB." };
  }

  // Bucket propio y no el de avatars: aquello son fotos de personas y esto
  // material de marketing. Mezclarlos haría imposible vaciar uno sin
  // mirar el otro.
  const admin = createAdminClient();
  const path = `plantillas/${randomUUID()}.${ext}`;
  const { error } = await admin.storage.from("wefunnels").upload(path, file, {
    contentType: file.type,
    upsert: false,
  });

  if (error) {
    console.error("[wefunnel/admin] design upload failed:", error.message);
    return { error: "No pudimos subir el diseño. Intenta de nuevo." };
  }

  const { data } = admin.storage.from("wefunnels").getPublicUrl(path);
  return { url: data.publicUrl };
}

// Las cinco del Superadmin de WeFunnels, envueltas: ver guarded().
export const saveResourceSection = guarded("section upsert", saveResourceSectionImpl);
export const saveResource = guarded("resource upsert", saveResourceImpl);
export const deleteResource = guarded("resource delete", deleteResourceImpl);
export const saveTemplate = guarded("template upsert", saveTemplateImpl);
export const deleteTemplate = guarded("template delete", deleteTemplateImpl);
