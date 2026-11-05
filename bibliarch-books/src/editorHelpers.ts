import {$getRoot,$getSelection,$isRangeSelection,$isElementNode,$isTextNode,$createRangeSelection,$setSelection,$getNodeByKey,type LexicalNode,type TextNode} from 'lexical';
import {$getSelectionStyleValueForProperty} from '@lexical/selection';
export type TextMatch={startKey:string;startOffset:number;endKey:string;endOffset:number};
// Group by logical paragraph, including pagination fragments, never by the whole document.
export function $findMatches(query:string,caseSensitive=false):TextMatch[] {
 if(!query)return [];
 const groups:{id:string;nodes:TextNode[]}[]=[];
 for(const node of $getRoot().getAllTextNodes()) {
  let block:LexicalNode=node;
  while(block.getParent() && (block===node || ($isElementNode(block)&&block.isInline())))block=block.getParent()!;
  const json=block.exportJSON() as {group?:string};const id=json.group||block.getKey();
  if(groups.at(-1)?.id!==id)groups.push({id,nodes:[]});groups.at(-1)!.nodes.push(node);
 }
 const results:TextMatch[]=[];
 // Escaped literal regexp preserves original UTF-16 offsets even for Unicode casing.
 const expression=new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),caseSensitive?'g':'gi');
 for(const {nodes} of groups) {
  const text=nodes.map(n=>n.getTextContent()).join('');
  for(const match of text.matchAll(expression)) {
   const start=match.index!,end=start+match[0].length;let offset=0;let first:TextMatch|undefined;
   for(const n of nodes){const next=offset+n.getTextContentSize();
    if(!first&&start<next)first={startKey:n.getKey(),startOffset:start-offset,endKey:n.getKey(),endOffset:0};
    if(first&&end<=next){first.endKey=n.getKey();first.endOffset=end-offset;results.push(first);break;}offset=next;
   }
  }
 }
 return results;
}
export function $selectMatch(match:TextMatch) {
 const s=$createRangeSelection();s.anchor.set(match.startKey,match.startOffset,'text');s.focus.set(match.endKey,match.endOffset,'text');$setSelection(s);return s;
}
export function $replaceMatch(match:TextMatch,replacement:string) {
 const s=$selectMatch(match);const first=$getNodeByKey(match.startKey);
 if($isTextNode(first)){s.setFormat(first.getFormat());s.setStyle(first.getStyle());}
 s.insertText(replacement);
}
export function $selectionAppearance() {
 const s=$getSelection();if(!$isRangeSelection(s))return null;
 const blocks=s.isCollapsed()?[s.anchor.getNode()]:s.getNodes();
 const alignments=new Set<string>();
 for(let block of blocks){while(block.getParent() && (!$isElementNode(block)||block.isInline()))block=block.getParent()!;
  if($isElementNode(block)&&block.getType()!=='root'&&block.getType()!=='page')alignments.add(block.getFormatType()||'left');}
 return {font:$getSelectionStyleValueForProperty(s,'font-family','inherit'),size:$getSelectionStyleValueForProperty(s,'font-size','inherit'),color:$getSelectionStyleValueForProperty(s,'color','inherit'),alignment:alignments.size===1?[...alignments][0]:''};
}
