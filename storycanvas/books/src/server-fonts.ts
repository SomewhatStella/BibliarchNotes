import {readFileSync, existsSync} from 'node:fs';
import {join} from 'node:path';

/**
 * Fonts for server-made PDFs on hosts without the usual system fonts (Vercel has no Georgia,
 * Times New Roman, Arial or Verdana). Each book font name is mapped to a free font drawn to the
 * same widths, so lines, pages and page count come out the same as in the editor:
 *   Georgia → Gelasio, Times New Roman → Tinos, Arial → Arimo, Verdana → DejaVu Sans.
 * The files are embedded as data URLs because the PDF page blocks every network request.
 */
const MAP: [family: string[], pkg: string][] = [
  [['Georgia'], 'gelasio'],
  [['Times New Roman'], 'tinos'],
  [['Arial'], 'arimo'],
  [['Verdana'], 'dejavu-sans'],
];
const SUBSETS = ['latin', 'latin-ext'];
let cached: string | null = null;

/** True where the real fonts can't be relied on (serverless Linux hosts). */
export function needsSubstituteFonts(): boolean {
  return !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.BIBLIARCH_SUBSTITUTE_FONTS);
}

export function substituteFontCss(): string {
  if (cached !== null) return cached;
  const root = join(process.cwd(), 'node_modules', '@fontsource');
  const rules: string[] = [];
  for (const [families, pkg] of MAP) {
    const dir = join(root, pkg);
    if (!existsSync(dir)) continue;
    for (const file of ['400.css', '400-italic.css', '700.css', '700-italic.css']) {
      const css = existsSync(join(dir, file)) ? readFileSync(join(dir, file), 'utf8') : '';
      for (const block of css.match(/@font-face\s*{[^}]*}/g) ?? []) {
        const url = block.match(/url\(\.\/files\/([^)]+?\.woff2)\)/)?.[1];
        if (!url || !SUBSETS.some(s => url.includes(`-${s}-`))) continue;
        const style = block.match(/font-style:\s*(\w+)/)?.[1] ?? 'normal';
        const weight = block.match(/font-weight:\s*(\d+)/)?.[1] ?? '400';
        const range = block.match(/unicode-range:\s*([^;]+);/)?.[1];
        const path = join(dir, 'files', url);
        if (!existsSync(path)) continue;
        const data = readFileSync(path).toString('base64');
        for (const family of families)
          rules.push(`@font-face{font-family:'${family}';font-style:${style};font-weight:${weight};src:url(data:font/woff2;base64,${data}) format('woff2');${range ? `unicode-range:${range};` : ''}}`);
      }
    }
  }
  if (!rules.length) console.error('Substitute PDF fonts not found under', root);
  return (cached = rules.join(''));
}

/** Adds the substitute fonts to a full HTML document when this host needs them. */
export function withServerFonts(html: string): string {
  if (!needsSubstituteFonts()) return html;
  const style = `<style>${substituteFontCss()}</style>`;
  return html.includes('</head>') ? html.replace('</head>', `${style}</head>`) : style + html;
}
