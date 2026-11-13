"use client";
// "Save as picture": the board on screen, cropped to its cards, as a PNG with a small
// "Made with Bibliarch · bibliarch.com" band along the bottom. Every shared picture is a
// little advert, and it's honest about where it came from.
import { toCanvas } from "html-to-image";
import type { CanvasRow } from "@/lib/types";

const PAD = 48;
const BAND = 56;
const MAX_SIDE = 7000; // stay under every browser's canvas size limit

function boundsOf(canvas: CanvasRow) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const grow = (x: number, y: number, w = 0, h = 0) => {
    minX = Math.min(minX, x); minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + w); maxY = Math.max(maxY, y + h);
  };
  for (const n of canvas.nodes) {
    if (n.parentId) continue; // list members sit inside their list
    if (n.linePoints) for (const p of Object.values(n.linePoints)) grow(p.x, p.y);
    else grow(n.x, n.y, n.width, n.height);
  }
  if (!isFinite(minX)) return null;
  return { x: Math.max(0, minX - PAD), y: Math.max(0, minY - PAD), w: maxX - minX + PAD * 2, h: maxY - minY + PAD * 2 };
}

/** Renders the board that's on screen right now. Returns null when the board has no cards. */
export async function boardPicture(canvas: CanvasRow, title: string): Promise<Blob | null> {
  const ground = document.querySelector<HTMLElement>("[data-canvas-ground]");
  const scroller = ground?.parentElement;
  const box = boundsOf(canvas);
  if (!ground || !scroller || !box) return null;

  const page = getComputedStyle(scroller);
  const bg = page.backgroundColor && page.backgroundColor !== "rgba(0, 0, 0, 0)" ? page.backgroundColor : getComputedStyle(document.body).backgroundColor;
  const ink = getComputedStyle(document.body).color || "#2b2416";
  const ratio = Math.max(1, Math.min(2, MAX_SIDE / Math.max(box.w, box.h)));

  const options = {
    width: box.w,
    height: box.h,
    pixelRatio: ratio,
    backgroundColor: bg,
    cacheBust: false,
    // Draw the board at 100% zoom, shifted so the cards start at the top-left of the picture.
    style: { transform: `translate(${-box.x}px, ${-box.y}px)`, transformOrigin: "0 0" },
    // Leave out editing chrome: selection handles, hover toolbars, the pen layer's controls.
    filter: (el: HTMLElement) => !(el instanceof HTMLElement && (el.dataset.exportHide !== undefined || el.getAttribute("role") === "toolbar")),
  };
  let shot: HTMLCanvasElement;
  try {
    shot = await toCanvas(ground, options);
  } catch {
    // Some browsers refuse to read web fonts across origins; the picture still works without them.
    shot = await toCanvas(ground, { ...options, skipFonts: true });
  }

  const out = document.createElement("canvas");
  out.width = shot.width;
  out.height = shot.height + Math.round(BAND * ratio);
  const g = out.getContext("2d");
  if (!g) return null;
  g.fillStyle = bg;
  g.fillRect(0, 0, out.width, out.height);
  g.drawImage(shot, 0, 0);

  // The band: story title on the left, the mark on the right.
  const y = shot.height + (BAND * ratio) / 2;
  g.scale(ratio, ratio);
  g.globalAlpha = 0.14;
  g.fillStyle = ink;
  g.fillRect(PAD / 2, shot.height / ratio, out.width / ratio - PAD, 1);
  g.globalAlpha = 1;
  g.textBaseline = "middle";
  g.font = `600 16px Georgia, "Times New Roman", serif`;
  g.fillStyle = ink;
  const titleText = title.length > 60 ? `${title.slice(0, 59)}…` : title;
  g.fillText(titleText, PAD / 2, y / ratio);
  g.font = `500 14px system-ui, -apple-system, "Segoe UI", sans-serif`;
  g.textAlign = "right";
  g.globalAlpha = 0.75;
  g.fillText("Made with Bibliarch · bibliarch.com", out.width / ratio - PAD / 2, y / ratio);

  return new Promise((resolve) => out.toBlob((b) => resolve(b), "image/png"));
}

export function downloadBlob(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function safeFileName(title: string) {
  return (title.replace(/[^\w\- ]/g, "").trim() || "Bibliarch board").slice(0, 80);
}
