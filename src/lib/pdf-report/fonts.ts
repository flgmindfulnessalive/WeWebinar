import path from "node:path";

import { Font } from "@react-pdf/renderer";

// Local TTFs (public/fonts/report) instead of fetching Google Fonts at
// request time -- keeps report generation fast and independent of an
// external font CDN being reachable from the serverless function.
const FONT_DIR = path.join(process.cwd(), "public", "fonts", "report");

function fontPath(filename: string): string {
  return path.join(FONT_DIR, filename);
}

let registered = false;

export function registerReportFonts() {
  if (registered) return;
  registered = true;

  Font.register({
    family: "Newsreader",
    fonts: [
      { src: fontPath("newsreader-500.ttf"), fontWeight: 500 },
      { src: fontPath("newsreader-600.ttf"), fontWeight: 600 },
    ],
  });

  Font.register({
    family: "IBM Plex Sans",
    fonts: [
      { src: fontPath("ibm-plex-sans-400.ttf"), fontWeight: 400 },
      { src: fontPath("ibm-plex-sans-500.ttf"), fontWeight: 500 },
      { src: fontPath("ibm-plex-sans-600.ttf"), fontWeight: 600 },
      { src: fontPath("ibm-plex-sans-700.ttf"), fontWeight: 700 },
    ],
  });

  // Roboto Mono, not IBM Plex Mono: fontkit can't read the advance width
  // of Google's current IBM Plex Mono space glyph ("Offset is outside the
  // bounds of the DataView"), which crashes rendering on any row with a
  // space. Confirmed against the actual TTFs before picking the swap.
  Font.register({
    family: "Roboto Mono",
    fonts: [
      { src: fontPath("roboto-mono-400.ttf"), fontWeight: 400 },
      { src: fontPath("roboto-mono-500.ttf"), fontWeight: 500 },
      { src: fontPath("roboto-mono-600.ttf"), fontWeight: 600 },
    ],
  });

  // The KPI/table values mix digits with "%", ":" and "·" -- without this,
  // react-pdf's default word-hyphenation can split a number across lines.
  Font.registerHyphenationCallback((word) => [word]);
}
