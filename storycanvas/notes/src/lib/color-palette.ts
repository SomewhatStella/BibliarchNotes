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
export function normalizePalette(value: unknown): ColorPalette {
  if (!value || typeof value !== "object") return DEFAULT_PALETTE;
  const v = value as Record<string, unknown>;
  if (v.colors && typeof v.colors === "object") return value as ColorPalette;
  if (typeof v.main === "string" && typeof v.complementary === "string" && typeof v.accent === "string") {
    return { ...generateFromCustomColors(v.main, v.complementary, v.accent), id: typeof v.id === "string" ? v.id : `custom-${Date.now()}` };
  }
  return DEFAULT_PALETTE;
}

// All 16 CSS custom properties, same names the real app's
// ColorPaletteManager.applyPaletteToDOM uses, plus --color-primary-hue
// (parsed from the palette id, same regex) for anything that wants to key
// off the raw hue.
export function applyPaletteToDOM(palette: ColorPalette) {
  const root = document.documentElement;
  const c = palette.colors ?? normalizePalette(palette).colors;
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
