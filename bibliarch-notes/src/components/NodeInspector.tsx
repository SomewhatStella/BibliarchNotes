"use client";

import { useRef } from "react";
import { Lock, Unlock, X } from "lucide-react";
import type { NodeSettings, StoryNode } from "@/lib/types";
import TypeIcon from "./TypeIcon";

const FONTS: NonNullable<NodeSettings["font"]>[] = ["default", "serif", "rounded", "handwritten", "display", "mono"];
const SIZES: NonNullable<NodeSettings["text_size"]>[] = ["normal", "large", "huge"];

// The recently-added "Text Format sidebar" from storycanvas, carried over —
// per-card typography and the settings sub-object fields that differ by type.


export default function NodeInspector({
  node,

  onChange,
  onClose,
}: {
  node: StoryNode;
  anchor: { x: number; y: number };
  onChange: (patch: Partial<StoryNode>) => void;
  onClose: () => void;
}) {
  const settings = node.settings ?? {};
  const colorInputRef = useRef<HTMLInputElement>(null);
  const accent = node.color || "var(--color-node-default)";
  function patchSettings(p: Partial<NodeSettings>) {
    onChange({ settings: { ...settings, ...p } });
  }



  return (
    <div
      role="complementary"
      aria-label="Card style"
      className="node-inspector p-4"
    >
      <div className="mb-4 flex items-center gap-2.5">
        <div className="flex h-8 w-8 flex-none items-center justify-center rounded-lg text-white" style={{ background: accent }}>
          <TypeIcon type={node.type} size={15} />
        </div>
        <p className="min-w-0 flex-1 truncate font-display text-[14.5px] font-semibold text-ink-900">{node.text || node.title || "Card"}</p>
        <button aria-label="Close card style" onClick={onClose} className="flex-none rounded-full p-1 text-ink-500 hover:bg-ink-900/5">
          <X size={15} />
        </button>
      </div>

      <button
        onClick={() => patchSettings({ locked: !settings.locked })}
        className={`mb-4 flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-[12.5px] font-semibold ${
          settings.locked ? "bg-bibliarch-blue/10 text-bibliarch-blue" : "bg-ink-900/5 text-ink-700"
        }`}
      >
        {settings.locked ? <Lock size={13} /> : <Unlock size={13} />}
        {settings.locked ? "Locked in place" : "Unlocked"}
      </button>

      <Section label="Font">
        <PillGroup
          options={FONTS}
          value={settings.font ?? "default"}
          onChange={(v) => patchSettings({ font: v as NodeSettings["font"] })}
        />
      </Section>

      <Section label="Text size">
        <PillGroup
          options={SIZES}
          value={settings.text_size ?? "normal"}
          onChange={(v) => patchSettings({ text_size: v as NodeSettings["text_size"] })}
        />
      </Section>

      {(node.type === "character" || node.type === "location") && (
        <Section label="Picture shape">
          <PillGroup
            options={["circle", "square", "rounded"]}
            value={settings.picture_shape ?? "circle"}
            onChange={(v) => patchSettings({ picture_shape: v as NodeSettings["picture_shape"] })}
          />
        </Section>
      )}

      {node.type === "image" && (
        <Section label="Image fit">
          <PillGroup
            options={["cover", "contain", "fill"]}
            value={settings.image_fit ?? "cover"}
            onChange={(v) => patchSettings({ image_fit: v as NodeSettings["image_fit"] })}
          />
        </Section>
      )}

      {node.type === "folder" && (
        <Section label="Icon">
          <PillGroup
            options={["folder", "book", "archive", "box"]}
            value={settings.icon ?? "folder"}
            onChange={(v) => patchSettings({ icon: v as NodeSettings["icon"] })}
          />
        </Section>
      )}

      <Section label="Sub color">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => colorInputRef.current?.click()}
            className="h-8 w-8 flex-none rounded-lg border border-ink-900/10 shadow-card"
            style={{ background: node.color || "var(--color-node-default)" }}
            title="Change this card's color"
          />
          <input
            ref={colorInputRef}
            type="color"
            value={node.color || "#2E5AAC"}
            onChange={(e) => onChange({ color: e.target.value })}
            className="sr-only"
          />
          {node.color ? (
            <button onClick={() => onChange({ color: "" })} className="text-[11.5px] text-ink-500 underline-offset-2 hover:underline">
              clear — use the board&rsquo;s main color
            </button>
          ) : (
            <span className="text-[11.5px] text-ink-500">using the board&rsquo;s main color</span>
          )}
        </div>
      </Section>
    </div>
  );
}

function PillGroup<T extends string>({ options, value, onChange }: { options: readonly T[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-1">
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={`rounded-full px-2.5 py-1 text-[11.5px] capitalize ${
            value === o ? "bg-bibliarch-blue text-white" : "bg-ink-900/5 text-ink-700 hover:bg-ink-900/10"
          }`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3.5">
      <p className="mb-1.5 font-mono text-[10px] uppercase tracking-wide text-ink-500">{label}</p>
      {children}
    </div>
  );
}
