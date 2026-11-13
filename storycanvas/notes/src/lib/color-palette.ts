// Ported field-for-field from storycanvas's real color system
// (storycanvas/src/lib/color-palette.ts + components/ui/palette-selector.tsx
// + ColorPaletteManager.applyPaletteToDOM), not a guessed/simplified version.
// Differences from the original are deliberate and scoped to how this app
// stores things, never to the color math itself:
//   - storycanvas keeps a 3-tier localStorage hierarchy (global theme,
//     per-project palette, per-folder palette overrides) because its canvas
//     can nest folders with their own themes. This app has exactly one
//     palette per story (stored on the "main" canvas row, synced via
//     Supabase to every collaborator instead of being a local-only
//     per-device setting) — so there's one ColorPalette, scope fixed at
//     "project", no folder-override tier.
//   - storycanvas's dark theme branch of generateFromTemplate is real code
//     but the live app's own UI never reaches it ("Always default to light
//     since we removed dark mode" — their comment, not mine). Ported
//     verbatim anyway for fidelity, but this app's UI only ever drives it
//     with theme: "light", same as the original.
export interface ColorPalette {
  id: string;
  name: string;
  description: string;
  theme: "light" | "dark";
  scope: "global" | "project" | "folder";
  colors: {
    // Primary colors
    primary: string; // Main background/surface color
    primaryText: string; // Text on primary surfaces
    secondary: string; // Secondary surfaces (cards, panels)
    accent: string; // Accent color for highlights and details

    // UI elements
    border: string; // Borders and dividers
    hover: string; // Hover states
    selected: string; // Selected/active states

    // Canvas specific
    canvasBackground: string;
    nodeDefault: string;
    nodeNested: string; // Lighter version of nodeDefault for nodes inside containers
    nodeText: string;
    connectionDefault: string;

    // Semantic colors (maintain good contrast in both themes)
    success: string;
    warning: string;
    error: string;
    info: string;
  };
  isDefault?: boolean;
}

export interface ColorTemplate {
  baseHue: number; // 0-360
  saturation: number; // 0-100
  lightness: number; // 0-100
  complementaryOffset: "purple" | "green"; // Which side of complementary
}

export const ColorUtils = {
  hslToRgb(h: number, s: number, l: number): [number, number, number] {
    h /= 360;
    s /= 100;
    l /= 100;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h * 6) % 2) - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;
    if (h < 1 / 6) { r = c; g = x; b = 0; }
    else if (h < 2 / 6) { r = x; g = c; b = 0; }
    else if (h < 3 / 6) { r = 0; g = c; b = x; }
    else if (h < 4 / 6) { r = 0; g = x; b = c; }
    else if (h < 5 / 6) { r = x; g = 0; b = c; }
    else { r = c; g = 0; b = x; }
    return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
  },
  rgbToHex(r: number, g: number, b: number): string {
    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
  },
  hslToHex(h: number, s: number, l: number): string {
    const [r, g, b] = ColorUtils.hslToRgb(h, s, l);
    return ColorUtils.rgbToHex(r, g, b);
  },
  getComplementaryHue(hue: number, offset: "purple" | "green"): number {
    const complementary = (hue + 180) % 360;
    return offset === "purple" ? (complementary - 20 + 360) % 360 : (complementary + 20) % 360;
  },
  // Positioned like yellow (opposite side of color wheel) — for light blue
  // (200°), yellow is at ~60°, about 140° offset, a nice complementary
  // contrast.
  getAccentHue(baseHue: number): number {
    return (baseHue + 140) % 360;
  },
  adjustHue(baseHue: number, adjustment: number): number {
    return (baseHue + adjustment + 360) % 360;
  },
};

export const PaletteGenerator = {
  generateFromTemplate(template: ColorTemplate, theme: "light" | "dark", scope: ColorPalette["scope"] = "project"): ColorPalette {
    const { baseHue, saturation, lightness, complementaryOffset } = template;
    const complementaryHue = ColorUtils.getComplementaryHue(baseHue, complementaryOffset);
    const accentHue = ColorUtils.getAccentHue(baseHue);

    // 3-color system: yellow main, dark purplish-blue complementary, light blue accent
    const mainColor = ColorUtils.hslToHex(accentHue, 80, 60);
    const complementaryColor = ColorUtils.hslToHex(complementaryHue, saturation + 20, theme === "light" ? 20 : 80);
    const accentColor = ColorUtils.hslToHex(baseHue, saturation, lightness);

    if (theme === "light") {
      return {
        id: `${scope}-${theme}-${baseHue}-${complementaryOffset}`,
        name: `Light ${Math.round(baseHue)}° Palette`,
        description: "3-color harmony: Main, Contrast, Accent",
        theme,
        scope,
        colors: {
          primary: ColorUtils.hslToHex(accentHue, 60, 95),
          primaryText: complementaryColor,
          secondary: ColorUtils.hslToHex(accentHue, 70, 90),
          accent: accentColor,

          border: complementaryColor,
          hover: ColorUtils.hslToHex(accentHue, 80, 85),
          selected: ColorUtils.hslToHex(accentHue, 90, 80),

          canvasBackground: ColorUtils.hslToHex(baseHue, saturation * 0.3, 85),
          nodeDefault: ColorUtils.hslToHex(accentHue, 60, 85),
          nodeNested: ColorUtils.hslToHex(accentHue, 40, 92),
          nodeText: complementaryColor,
          connectionDefault: complementaryColor,

          success: ColorUtils.hslToHex(120, 60, 50),
          warning: ColorUtils.hslToHex(45, 85, 55),
          error: ColorUtils.hslToHex(0, 70, 55),
          info: accentColor,
        },
      };
    }
    return {
      id: `${scope}-${theme}-${baseHue}-${complementaryOffset}`,
      name: `Dark ${Math.round(baseHue)}° Palette`,
      description: "3-color harmony: Main, Contrast, Accent",
      theme,
      scope,
      colors: {
        primary: ColorUtils.hslToHex(complementaryHue, saturation * 0.3, 15),
        primaryText: mainColor,
        secondary: ColorUtils.hslToHex(complementaryHue, saturation * 0.4, 20),
        accent: accentColor,

        border: mainColor,
        hover: ColorUtils.hslToHex(complementaryHue, saturation * 0.5, 25),
        selected: ColorUtils.hslToHex(complementaryHue, saturation * 0.6, 30),

        canvasBackground: accentColor,
        nodeDefault: ColorUtils.hslToHex(accentHue, 70, 40),
        nodeNested: ColorUtils.hslToHex(accentHue, 50, 50),
        nodeText: complementaryColor,
        connectionDefault: accentColor,

        success: ColorUtils.hslToHex(120, 50, 65),
        warning: ColorUtils.hslToHex(45, 80, 70),
        error: ColorUtils.hslToHex(0, 60, 70),
        info: accentColor,
      },
    };
  },

  // For the hue slider: nudge a palette's base hue and regenerate. (The
  // original's extractTemplateFromPalette is a stub that doesn't actually
  // reverse-engineer the template — ported as-is; the slider UI here, like
  // the original's, tracks its own baseTemplate/hueAdjustment state instead
  // of relying on this for anything load-bearing.)
  generateWithHueAdjustment(basePalette: ColorPalette, hueAdjustment: number): ColorPalette {
    const template: ColorTemplate = { baseHue: 200, saturation: 70, lightness: 60, complementaryOffset: "purple" };
    const adjustedTemplate = { ...template, baseHue: ColorUtils.adjustHue(template.baseHue, hueAdjustment) };
    return PaletteGenerator.generateFromTemplate(adjustedTemplate, basePalette.theme, basePalette.scope);
  },
};

// The same 8 base templates storycanvas ships (blue/teal/purple/green, each
// with a purple- or green-leaning complementary) — unnamed, generated names
// like "Light 200° Palette", not a curated "Ocean/Sunset" gallery (the real
// app doesn't have one either).
const colorTemplates: ColorTemplate[] = [
  { baseHue: 200, saturation: 70, lightness: 60, complementaryOffset: "purple" },
  { baseHue: 200, saturation: 70, lightness: 60, complementaryOffset: "green" },
  { baseHue: 180, saturation: 65, lightness: 55, complementaryOffset: "purple" },
  { baseHue: 180, saturation: 65, lightness: 55, complementaryOffset: "green" },
  { baseHue: 260, saturation: 60, lightness: 50, complementaryOffset: "purple" },
  { baseHue: 260, saturation: 60, lightness: 50, complementaryOffset: "green" },
  { baseHue: 150, saturation: 55, lightness: 45, complementaryOffset: "purple" },
  { baseHue: 150, saturation: 55, lightness: 45, complementaryOffset: "green" },
];

// Light only — matching the real app's own "always default to light since
// we removed dark mode." Not rendered as a clickable preset gallery in the
// editor — storycanvas's own PaletteCard/preset-grid code exists but is
// never reached from its live PaletteSelector trigger paths either; this
// array exists for fidelity (and generateWithHueAdjustment's math), not as
// UI.
export const PRESET_PALETTES: ColorPalette[] = colorTemplates.map((t) => PaletteGenerator.generateFromTemplate(t, "light", "project"));

// The "Custom Colors" mode's exact derivation: the 3 colors the user picks
// (main/complementary/accent) map onto the full 16-field palette the same
// way the original's picker does it — main -> nodes/hover/selected/secondary,
// complementary -> text/border/connections, accent -> canvas/primary/info.
export function generateFromCustomColors(main: string, complementary: string, accent: string): ColorPalette {
  return {
    id: `custom-${Date.now()}`,
    name: "Custom Color Palette",
    description: "User-defined 3-color system",
    theme: "light",
    scope: "project",
    colors: {
      primary: accent,
      primaryText: complementary,
      secondary: main,
      accent,

      border: complementary,
      hover: main,
      selected: main,

      canvasBackground: accent,
      nodeDefault: main,
      nodeNested: main,
      nodeText: complementary,
      connectionDefault: complementary,

      success: "#27ae60",
      warning: "#f39c12",
      error: "#e74c3c",
      info: accent,
    },
  };
}

// Seeded from this app's own brand blue, not PRESET_PALETTES[0] — that
// template (baseHue 200/purple) is the real app's own isDefault-marked
// palette, but running it through the real formula produces a pink
// nodeDefault (accentHue lands at 340°, not anywhere near blue), which
// regressed every board's look the moment this shipped: every other fixed
// piece of this app's own chrome (the sidebar's selected state, the Apply
// button, bibliarch-blue throughout) is blue, so a pink default read as
// broken, not "ported." The generation math is still the real ported
// system — only the seed changed, exactly like choosing a different
// custom-color starting point would.
export const DEFAULT_PALETTE: ColorPalette = {
  ...generateFromCustomColors("#2E5AAC", "#2B2416", "#F5F6F9"),
  id: "default",
  name: "Bibliarch Blue",
  description: "The default — bibliarch blue, ink text, parchment board",
  isDefault: true,
};

// Real-board data crash guard: any story that set a custom palette before
// this session's port saved it under the OLD, pre-port shape
// ({id, name, main, complementary, accent} — flat hex strings, no nested
// `colors` object at all). Reading that straight into applyPaletteToDOM
// threw ("Cannot read properties of undefined (reading 'primary')") the
// moment a real board with a saved custom palette was opened. Upgrades
// that old shape into the real one via the same generateFromCustomColors
// derivation the picker itself uses, instead of silently discarding the
// color choice someone actually made.
//
// Also repairs a palette with missing or unusable colours field by field (a half-typed "#2E5"
// from the custom-colour box, a field an older version never wrote) instead of handing CSS
// an invalid value, which silently left the board unchanged.
export function normalizePalette(value: unknown): ColorPalette {
  if (!value || typeof value !== "object") return DEFAULT_PALETTE;
  const v = value as Record<string, unknown>;
  if (v.colors && typeof v.colors === "object") {
    const given = v.colors as Record<string, unknown>;
    const colors = { ...DEFAULT_PALETTE.colors };
    for (const key of Object.keys(colors) as (keyof ColorPalette["colors"])[]) {
      const c = given[key];
      if (typeof c === "string" && isCssColor(c)) colors[key] = c.trim();
    }
    return {
      ...(value as ColorPalette),
      id: typeof v.id === "string" ? v.id : "custom",
      name: typeof v.name === "string" ? v.name : "Custom Color Palette",
      colors,
    };
  }
  if (typeof v.main === "string" && typeof v.complementary === "string" && typeof v.accent === "string") {
    const d = DEFAULT_PALETTE.colors;
    const pick = (c: string, fallback: string) => (isCssColor(c) ? c : fallback);
    return {
      ...generateFromCustomColors(pick(v.main, d.nodeDefault), pick(v.complementary, d.nodeText), pick(v.accent, d.canvasBackground)),
      id: typeof v.id === "string" ? v.id : "custom-legacy",
    };
  }
  return DEFAULT_PALETTE;
}

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
export function isHexColor(value: string): boolean {
  return HEX.test(value.trim());
}
// Hex, or an rgb()/hsl() colour an older palette may have stored. Anything else is dropped.
function isCssColor(value: string): boolean {
  const v = value.trim();
  return HEX.test(v) || /^(rgb|rgba|hsl|hsla)\([^()]*\)$/i.test(v);
}

export function isDefaultPalette(p: ColorPalette): boolean {
  return p.id === "default" && JSON.stringify(p.colors) === JSON.stringify(DEFAULT_PALETTE.colors);
}

/** "#abc" / "#aabbcc" -> [h 0-360, s 0-100, l 0-100]; null for anything else. */
export function hexToHsl(hex: string): [number, number, number] | null {
  if (!isHexColor(hex)) return null;
  let h = hex.trim().slice(1);
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) as [number, number, number];
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  if (max === min) return [0, 0, l * 100];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const hue = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [hue * 60, s * 100, l * 100];
}

function luminance(hex: string): number {
  const hsl = hexToHsl(hex);
  if (!hsl) return 1;
  const [r, g, b] = ColorUtils.hslToRgb(...hsl).map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function contrastRatio(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m) as [number, number];
  return (x + 0.05) / (y + 0.05);
}

const clampN = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const INK = "#2b2416";

/**
 * What the board actually paints with. The palette's "main" colour is often a pale fill colour
 * (every generated preset's is ~85% lightness: storycanvas filled whole cards with it), which
 * this app only used for a 3px strip, so picking a palette looked like nothing happened. Each
 * card now gets a tint of the main colour, a strong-enough version of it for the strip and
 * avatars, and the palette's text colour when it is readable, in both light and dark mode.
 */
export function derivePaletteVars(colors: ColorPalette["colors"]): Record<string, string> {
  const [h, s, l] = hexToHsl(colors.nodeDefault) ?? hexToHsl(DEFAULT_PALETTE.colors.nodeDefault)!;
  const fillLight = ColorUtils.hslToHex(h, Math.min(s, 65), 93);
  const text = isHexColor(colors.nodeText) && contrastRatio(colors.nodeText, fillLight) >= 4.5 ? colors.nodeText : INK;
  return {
    "--pal-accent-light": ColorUtils.hslToHex(h, s < 8 ? s : clampN(s, 35, 85), clampN(l, 28, 50)),
    "--pal-accent-dark": ColorUtils.hslToHex(h, s < 8 ? s : clampN(s, 40, 85), clampN(l, 62, 76)),
    "--pal-fill-light": fillLight,
    "--pal-fill-dark": ColorUtils.hslToHex(h, Math.min(s, 35), 22),
    "--pal-text-light": text,
  };
}

// A short gallery of ready-made looks, each clearly different on the board.
export const PALETTE_PRESETS: ColorPalette[] = [
  DEFAULT_PALETTE,
  { ...generateFromCustomColors("#C76A82", "#3A1F2B", "#FBEFF2"), id: "preset-rose", name: "Rose garden", description: "Dusty rose cards on a blush board" },
  { ...generateFromCustomColors("#3E9B5C", "#1E3326", "#EEF5EC"), id: "preset-forest", name: "Forest", description: "Leaf green on a pale moss board" },
  { ...generateFromCustomColors("#8A5BB8", "#2A1E3A", "#F3EEF9"), id: "preset-lavender", name: "Lavender", description: "Soft violet with ink text" },
  { ...generateFromCustomColors("#E8A61C", "#3B2A08", "#FDF6E3"), id: "preset-marigold", name: "Marigold", description: "Warm gold on parchment" },
  { ...generateFromCustomColors("#1F8A9E", "#12323A", "#EAF5F7"), id: "preset-ocean", name: "Ocean", description: "Teal on a sea-glass board" },
  { ...generateFromCustomColors("#C0552F", "#3A1A0E", "#FBEFE8"), id: "preset-terracotta", name: "Terracotta", description: "Clay orange, warm and earthy" },
  { ...generateFromCustomColors("#5B6372", "#1F2329", "#F2F3F5"), id: "preset-slate", name: "Slate", description: "Quiet greys, for when colour distracts" },
];

// All 16 CSS custom properties, same names the real app's
// ColorPaletteManager.applyPaletteToDOM uses, plus --color-primary-hue
// (parsed from the palette id, same regex) for anything that wants to key
// off the raw hue.
export function applyPaletteToDOM(palette: ColorPalette) {
  const root = document.documentElement;
  const c = normalizePalette(palette).colors;
  for (const [name, value] of Object.entries(derivePaletteVars(c))) root.style.setProperty(name, value);
  // board-theme.css keys the card tints off this. Set here too (not only by React) so a live
  // preview from the palette editor shows before anything is saved.
  document.querySelector(".notes-board-shell")?.setAttribute("data-default-palette", String(isDefaultPalette(normalizePalette(palette))));
  root.style.setProperty("--color-primary", c.primary);
  root.style.setProperty("--color-primary-text", c.primaryText);
  root.style.setProperty("--color-secondary", c.secondary);
  root.style.setProperty("--color-accent", c.accent);
  root.style.setProperty("--color-border", c.border);
  root.style.setProperty("--color-hover", c.hover);
  root.style.setProperty("--color-selected", c.selected);
  root.style.setProperty("--color-canvas-bg", c.canvasBackground);
  root.style.setProperty("--color-node-default", c.nodeDefault);
  root.style.setProperty("--color-node-nested", c.nodeNested);
  root.style.setProperty("--color-node-text", c.nodeText);
  root.style.setProperty("--color-connection-default", c.connectionDefault);
  root.style.setProperty("--color-success", c.success);
  root.style.setProperty("--color-warning", c.warning);
  root.style.setProperty("--color-error", c.error);
  root.style.setProperty("--color-info", c.info);
  const hueMatch = palette.id.match(/(\d+)/);
  root.style.setProperty("--color-primary-hue", hueMatch ? hueMatch[1]! : "200");
}
