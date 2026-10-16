import { describe, expect, it } from "vitest";

import { extractYouTubeVideoId } from "./youtube";

const ID = "gzg2XIZy-Z4";

describe("extractYouTubeVideoId", () => {
  it("accepts a bare 11-character id", () => {
    expect(extractYouTubeVideoId(ID)).toBe(ID);
  });

  it("accepts a watch URL", () => {
    expect(extractYouTubeVideoId(`https://www.youtube.com/watch?v=${ID}`)).toBe(ID);
  });

  it("accepts a watch URL with extra params", () => {
    expect(extractYouTubeVideoId(`https://www.youtube.com/watch?v=${ID}&t=90s`)).toBe(ID);
  });

  it("accepts a youtu.be share link", () => {
    expect(extractYouTubeVideoId(`https://youtu.be/${ID}?si=-39P1gCI75a__wNq`)).toBe(ID);
  });

  it("accepts shorts and live paths", () => {
    expect(extractYouTubeVideoId(`https://www.youtube.com/shorts/${ID}`)).toBe(ID);
    expect(extractYouTubeVideoId(`https://www.youtube.com/live/${ID}`)).toBe(ID);
  });

  it("accepts the privacy-enhanced embed domain", () => {
    expect(
      extractYouTubeVideoId(`https://www.youtube-nocookie.com/embed/${ID}?rel=0`)
    ).toBe(ID);
  });

  // Lo que de verdad pega alguien que usa el botón Compartir de YouTube y
  // elige "Insertar": el bloque entero, con el & escapado como entidad.
  it("accepts the whole <iframe> embed snippet", () => {
    const snippet =
      `<iframe width="560" height="315" ` +
      `src="https://www.youtube.com/embed/${ID}?si=-39P1gCI75a__wNq&amp;controls=0" ` +
      `title="YouTube video player" frameborder="0" ` +
      `allow="accelerometer; autoplay; clipboard-write" allowfullscreen></iframe>`;
    expect(extractYouTubeVideoId(snippet)).toBe(ID);
  });

  it("finds a link pasted among other words", () => {
    expect(extractYouTubeVideoId(`mira esto https://youtu.be/${ID} está bueno`)).toBe(ID);
  });

  it("rejects empty and non-URL text", () => {
    expect(extractYouTubeVideoId("")).toBeNull();
    expect(extractYouTubeVideoId("el curso de anuncios")).toBeNull();
  });

  it("rejects a YouTube URL with no video in it", () => {
    expect(extractYouTubeVideoId("https://www.youtube.com/@micanal")).toBeNull();
    expect(extractYouTubeVideoId("https://youtu.be/abc")).toBeNull();
  });

  it("rejects another platform's embed", () => {
    expect(
      extractYouTubeVideoId(`<iframe src="https://player.vimeo.com/video/123456"></iframe>`)
    ).toBeNull();
  });

  // El motivo por el que la búsqueda dentro del texto comprueba el host y
  // no solo busca algo con forma de id: un src de otro dominio con la ruta
  // de YouTube imitada no debe colarse como si fuera un vídeo.
  it("rejects a lookalike path on a foreign host", () => {
    expect(
      extractYouTubeVideoId(`<iframe src="https://evil.example.com/embed/${ID}"></iframe>`)
    ).toBeNull();
  });
});
