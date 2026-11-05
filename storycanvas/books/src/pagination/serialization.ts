import type { SerializedEditorState } from 'lexical';
// Runtime wrappers are deliberately excluded from the book's portable source JSON.
export function flattenPages(state: SerializedEditorState): SerializedEditorState {
  const result = structuredClone(state);
  const blocks: any[] = [];
  let previousGroup: string | undefined;
  const visit = (node: any) => {
    if (node.type === 'page') { node.children.forEach(visit); return; }
    const group = node.group;
    if (node.type === 'flow-paragraph') { node.type = 'paragraph'; delete node.group; }
    if (group && group === previousGroup) blocks[blocks.length - 1].children.push(...node.children);
    else blocks.push(node);
    previousGroup = group;
  };
  result.root.children.forEach(visit);
  for (const block of blocks) {
    if (!block.children) continue;
    const children: any[] = [];
    for (const child of block.children) {
      const prev = children[children.length - 1];
      if (prev?.type === 'text' && child.type === 'text' &&
          JSON.stringify({...prev, text:''}) === JSON.stringify({...child, text:''})) prev.text += child.text;
      else children.push(child);
    }
    block.children = children;
  }
  result.root.children = blocks;
  return result;
}
export function safeSplitOffset(text: string, offset: number): number {
  let n = Math.max(0, Math.min(text.length, offset));
  if (n > 0 && /[\uD800-\uDBFF]/.test(text[n-1]) && /[\uDC00-\uDFFF]/.test(text[n] || '')) n--;
  // Never break a page inside a word: the browser may have hyphenated it there, and the
  // hyphen would be lost once the halves sit on different pages. Move the whole word to
  // the next page instead (unless the line is one giant word with no space before it).
  if (n > 0 && n < text.length && /\S/.test(text[n-1]) && /\S/.test(text[n])) {
    const before = text.slice(0, n), space = Math.max(before.lastIndexOf(' '), before.lastIndexOf('\n'), before.lastIndexOf('\t'));
    if (space >= 0) n = space + 1;
  }
  return n;
}
