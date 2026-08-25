// The two-color gradient/glow treatment on the public registration and
// waiting-room pages uses the host's own branding colors when they've set
// them (Settings -> Marca), falling back to WeWebinars' own indigo/fuchsia
// -- those fields already existed but were never actually applied anywhere
// in the product before this.
export const DEFAULT_BRAND_COLOR_A = "#4f46e5";
export const DEFAULT_BRAND_COLOR_B = "#c026d3";

export function resolveBrandColors(branding: Record<string, string | null> | null | undefined) {
  return {
    a: branding?.color_primario || DEFAULT_BRAND_COLOR_A,
    b: branding?.color_secundario || DEFAULT_BRAND_COLOR_B,
  };
}
