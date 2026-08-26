import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default async function Icon() {
  const bold = await readFile(join(process.cwd(), "src/app/og-fonts/Geist-Bold.ttf"));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 9,
          background: "linear-gradient(135deg, #4f46e5, #c026d3)",
          color: "#ffffff",
          fontSize: 20,
          fontWeight: 700,
          fontFamily: "Geist",
        }}
      >
        W
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "Geist", data: bold, weight: 700, style: "normal" }],
    }
  );
}
