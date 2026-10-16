// Exported for server-side re-validation of an already-parsed id (see
// isValidVideoSource in lib/actions/webinars.ts) -- distinct from the URL
// parsing below, which only ever runs against a raw pasted link.
export const YOUTUBE_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;
const ID_PATTERN = YOUTUBE_ID_PATTERN;

// Una dirección suelta dentro de un texto más largo. Sirve para el código
// de incrustar que YouTube da con el botón Compartir: lo que se pega es un
// <iframe> entero y la dirección vive en su src.
const URL_IN_TEXT = /https?:\/\/[^\s"'<>]+/g;

/**
 * Accepts a pasted YouTube URL (watch, youtu.be, embed, shorts), the whole
 * <iframe> embed snippet YouTube hands out under Share, or a bare
 * 11-character video ID, and returns just the ID. Returns null if nothing
 * recognizable was found.
 */
export function extractYouTubeVideoId(input: string): string | null {
  const trimmed = input.trim();
  if (ID_PATTERN.test(trimmed)) return trimmed;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    // No es una dirección por sí sola. Puede ser el <iframe> de Compartir,
    // o una dirección pegada con texto alrededor: se buscan las que haya
    // dentro y se prueba con cada una.
    //
    // El &amp; se deshace antes porque dentro de un atributo HTML los
    // parámetros vienen escapados, y `?si=x&amp;controls=0` dejaría el
    // último pegado al anterior.
    const candidates = trimmed.replaceAll("&amp;", "&").match(URL_IN_TEXT);
    if (!candidates) return null;
    for (const candidate of candidates) {
      // Sin el href suelto, que no lleva id: el iframe trae varias
      // direcciones y solo una es la del vídeo.
      const id = extractYouTubeVideoId(candidate);
      if (id) return id;
    }
    return null;
  }

  const host = url.hostname.replace(/^www\./, "");

  if (host === "youtu.be") {
    const id = url.pathname.slice(1).split("/")[0];
    return ID_PATTERN.test(id) ? id : null;
  }

  // youtube-nocookie.com entra porque es lo que da el propio YouTube al
  // marcar "modo de privacidad mejorada" en Compartir, y es además el
  // dominio con el que nosotros pintamos los vídeos.
  if (
    host === "youtube.com" ||
    host === "m.youtube.com" ||
    host === "music.youtube.com" ||
    host === "youtube-nocookie.com"
  ) {
    const v = url.searchParams.get("v");
    if (v && ID_PATTERN.test(v)) return v;

    const segments = url.pathname.split("/").filter(Boolean);
    // /embed/<id>, /shorts/<id>, /live/<id>
    if (segments.length >= 2 && ["embed", "shorts", "live"].includes(segments[0])) {
      return ID_PATTERN.test(segments[1]) ? segments[1] : null;
    }
  }

  return null;
}
