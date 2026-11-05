"use client";

import { useState } from "react";
import { X, Sun, Sliders } from "lucide-react";
import { DEFAULT_PALETTE, PaletteGenerator, ColorUtils, generateFromCustomColors, type ColorPalette, type ColorTemplate } from "@/lib/color-palette";

// Ported from storycanvas's real PaletteSelector (components/ui/palette-selector.tsx)
// — the same two modes (hue-slider "Complementary Palette" vs 3-input
// "Custom Colors"), the same -180..180/step-5 slider range, the same hue
// name labeling. Dropped only what doesn't apply here, or doesn't exist in
// the real app's actual live UI either: the folder/project "Apply to"
// scope selector (this app has exactly one palette per story, not
// storycanvas's nested-folder theme hierarchy), the personal
// saved-palette library (a separate localStorage feature, not the color
// system itself), and a clickable presets grid — storycanvas's own
// PaletteCard/preset-gallery code exists in its source but its live
// PaletteSelector never actually renders it, so there's nothing there to
// port.
const getColorName = (hue: number): string => {
  if (hue >= 0 && hue < 30) return "Red";
  if (hue >= 30 && hue < 60) return "Orange";
  if (hue >= 60 && hue < 90) return "Yellow";
  if (hue >= 90 && hue < 150) return "Green";
  if (hue >= 150 && hue < 210) return "Cyan/Teal";
  if (hue >= 210 && hue < 270) return "Blue";
  if (hue >= 270 && hue < 330) return "Purple";
  return "Pink/Magenta";
};

const BASE_TEMPLATE: ColorTemplate = { baseHue: 200, saturation: 60, lightness: 75, complementaryOffset: "purple" };

export default function PaletteEditor({
  palette,
  onChange,
  onClose,
}: {
  palette: ColorPalette;
  onChange: (p: ColorPalette) => void;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<"hue" | "custom">(palette.id.startsWith("custom-") ? "custom" : "hue");
  const [hueAdjustment, setHueAdjustment] = useState(0);
  const [customColors, setCustomColors] = useState({
    main: palette.colors.nodeDefault || "#2E5AAC",
    complementary: palette.colors.nodeText || "#2B2416",
    accent: palette.colors.canvasBackground || "#F5F6F9",
  });

  // The slider names and shows "the main color" — so Main needs to actually
  // BE that hue, not some other swatch. The generator computes nodeDefault
  // (Main) from getAccentHue(template.baseHue) = baseHue+140°, not
  // baseHue itself — feeding the desired hue straight in as baseHue put
  // the +140° offset on Main and left some OTHER swatch matching the
  // label instead. Feeding in (desiredHue - 140°) cancels that offset back
  // out, so accentHue — and therefore Main — lands exactly on desiredHue.
  const desiredHue = ColorUtils.adjustHue(BASE_TEMPLATE.baseHue, hueAdjustment);
  const hueGenerated = PaletteGenerator.generateFromTemplate(
    { ...BASE_TEMPLATE, baseHue: ColorUtils.adjustHue(desiredHue, -140) },
    "light",
    "project"
  );
  const customGenerated = generateFromCustomColors(customColors.main, customColors.complementary, customColors.accent);
  const preview = mode === "hue" ? hueGenerated : customGenerated;

  function applyPreview() {
    onChange(mode === "hue" ? hueGenerated : customGenerated);
    onClose();
  }
  function resetToDefault() {
    onChange(DEFAULT_PALETTE);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-ink-900/20 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="pop-in emboss flex max-h-[90%] w-full max-w-2xl flex-col overflow-hidden rounded-2xl">
        <div className="flex items-center justify-between border-b border-ink-900/8 px-5 py-4">
          <div>
            <p className="font-display text-[17px] font-semibold text-ink-900">Color palette</p>
            <p className="text-[12px] text-ink-500">The colors every card and the board itself use unless a card has its own.</p>
          </div>
          <button onClick={onClose} className="flex-none rounded-full p-1.5 text-ink-500 hover:bg-ink-900/5">
            <X size={16} />
          </button>
        </div>

        <div className="flex items-center justify-center gap-2 border-b border-ink-900/8 p-3">
          <button
            onClick={() => setMode("hue")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-semibold ${mode === "hue" ? "bg-bibliarch-blue text-white" : "bg-ink-900/5 text-ink-700"}`}
          >
            <Sun size={14} /> Complementary Palette
          </button>
          <button
            onClick={() => setMode("custom")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-semibold ${mode === "custom" ? "bg-bibliarch-blue text-white" : "bg-ink-900/5 text-ink-700"}`}
          >
            <Sliders size={14} /> Custom Colors
          </button>
        </div>

        {/* No flex-1 — without the presets grid this content is short enough
            to shrink-wrap; forcing it to grow left a hollow gap before the
            footer. overflow-auto stays as a safety net for a short window. */}
        <div className="scrollbar-thin grid grid-cols-1 gap-5 overflow-auto p-5 sm:grid-cols-2">
          {mode === "hue" ? (
            <div>
              <p className="mb-1 text-[13px] font-semibold text-ink-900">Main Color Slider</p>
              <p className="mb-3 text-[11.5px] text-ink-500">Slide to change the overall color theme while keeping perfect harmony.</p>
              <div
                className="mb-2 h-5 w-full rounded-full"
                style={{
                  background: "linear-gradient(to right, hsl(0,70%,55%), hsl(60,70%,55%), hsl(120,70%,55%), hsl(180,70%,55%), hsl(240,70%,55%), hsl(300,70%,55%), hsl(360,70%,55%))",
                }}
              />
              <input
                type="range"
                min={-180}
                max={180}
                step={5}
                value={hueAdjustment}
                onChange={(e) => setHueAdjustment(Number(e.target.value))}
                className="w-full accent-bibliarch-blue"
                style={{ marginTop: "-20px" }}
              />
              {/* Main (the color every card actually shows) is now wired to
                  equal this exact hue — see the baseHue-140° trick above —
                  so when this says "Red," the Main swatch to the right IS
                  red, not some other hue that merely shared the raw slider
                  value. */}
              <p className="mt-2 flex items-baseline gap-1.5">
                <span className="font-mono text-[10.5px] uppercase tracking-wide text-ink-500">Main color</span>
                <span className="font-display text-[16px] font-semibold text-ink-900">{getColorName(desiredHue)}</span>
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <ColorRow label="Main Color" hint="nodes, hover, selected" value={customColors.main} onChange={(v) => setCustomColors((c) => ({ ...c, main: v }))} />
              <ColorRow label="Complementary Color" hint="text, borders, connections" value={customColors.complementary} onChange={(v) => setCustomColors((c) => ({ ...c, complementary: v }))} />
              <ColorRow label="Accent Color" hint="board background" value={customColors.accent} onChange={(v) => setCustomColors((c) => ({ ...c, accent: v }))} />
            </div>
          )}

          <div>
            <p className="mb-1.5 font-mono text-[10.5px] uppercase tracking-wide text-ink-500">Live preview</p>
            <ColorPreview colors={preview.colors} />
          </div>
        </div>

        <div className="flex gap-2 border-t border-ink-900/8 px-5 py-4">
          <button onClick={resetToDefault} className="rounded-lg px-4 py-2 text-[13.5px] text-ink-500">Reset to default</button>
          <button onClick={applyPreview} className="flex-1 rounded-lg bg-gradient-to-r from-bibliarch-blue to-blue-600 py-2 text-[13.5px] font-semibold text-white">
            Apply Palette
          </button>
        </div>
      </div>
    </div>
  );
}

function ColorPreview({ colors }: { colors: ColorPalette["colors"] }) {
  return (
    <div className="rounded-lg border border-ink-900/10 p-3">
      <div className="mb-1.5 grid grid-cols-3 gap-2">
        <span className="aspect-square rounded-md border border-ink-900/10" style={{ background: colors.nodeDefault }} />
        <span className="aspect-square rounded-md border border-ink-900/10" style={{ background: colors.nodeText }} />
        <span className="aspect-square rounded-md border border-ink-900/10" style={{ background: colors.canvasBackground }} />
      </div>
      <div className="grid grid-cols-3 gap-2 text-center text-[10.5px] text-ink-500">
        <span>Main</span>
        <span>Complementary</span>
        <span>Accent</span>
      </div>
    </div>
  );
}

function ColorRow({ label, hint, value, onChange }: { label: string; hint: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-3">
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-11 w-14 flex-none cursor-pointer rounded-lg border-2 border-ink-900/10 bg-transparent" />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-ink-900">{label}</p>
        <p className="mb-1 text-[11px] text-ink-500">{hint}</p>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#ffffff"
          className="w-full rounded-md border border-ink-900/12 bg-editor-raised px-2 py-1 font-mono text-[11.5px] outline-none focus:border-bibliarch-blue"
        />
      </div>
    </div>
  );
}
