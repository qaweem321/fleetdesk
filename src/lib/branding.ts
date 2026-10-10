// Brand color helpers (pure functions, shared by forms and tests).

type Result<T> = T | { error: string };

// "#2563EB", "#25e", " 2563eb " -> "#2563eb". Empty means "use the default color".
export function normalizeHexColor(raw: unknown): Result<{ color: string | null }> {
  let value = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (!value) {
    return { color: null };
  }
  if (!value.startsWith("#")) {
    value = `#${value}`;
  }
  if (/^#[0-9a-f]{3}$/.test(value)) {
    value = `#${[...value.slice(1)].map((digit) => digit + digit).join("")}`;
  }
  if (!/^#[0-9a-f]{6}$/.test(value)) {
    return { error: "Please enter a color like #2563eb." };
  }
  return { color: value };
}

// Relative luminance (WCAG) of a "#rrggbb" color, from 0 (black) to 1 (white).
function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((start) => {
    const channel = Number.parseInt(hex.slice(start, start + 2), 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

const WHITE = "#ffffff";
const DARK = "#111827";

// White or dark text, whichever is easier to read on the given background color.
export function readableTextColor(background: string) {
  const light = luminance(background);
  const contrastWithWhite = 1.05 / (light + 0.05);
  const contrastWithDark = (light + 0.05) / (luminance(DARK) + 0.05);
  return contrastWithWhite >= contrastWithDark ? WHITE : DARK;
}

// Swaps the primary color (buttons, highlights) for the business's brand color, with text
// that stays readable on it. No brand color: the app's default blue.
export function brandStyle(brandColor: string | null) {
  if (!brandColor) {
    return undefined;
  }
  return {
    "--primary": brandColor,
    "--primary-foreground": readableTextColor(brandColor),
  } as Record<string, string>;
}
