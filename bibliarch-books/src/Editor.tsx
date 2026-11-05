"use client";
import { createPortal } from "react-dom";
import { useRef, useState } from "react";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin, createEmptyHistoryState } from "@lexical/react/LexicalHistoryPlugin";
import { TabIndentationPlugin } from "@lexical/react/LexicalTabIndentationPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { type SerializedEditorState } from "lexical";
import { HeadingNode } from "@lexical/rich-text";
import { PageNode, FlowParagraphNode, type PageMetrics } from "./pagination/nodes";
import { PaginationPlugin } from "./pagination/PaginationPlugin";
import { TitleControl } from "./pagination/TitleControl";
import { flattenPages } from "./pagination/serialization";
import EditorTools, {EditorFindBridge} from './EditorTools';
export type { PageMetrics } from "./pagination/nodes";
export default function Editor({content,onChange,onError,children,active=false,toolbarHost,pageMetrics,customFonts=[]}: {
 content:SerializedEditorState;
 onChange:(s:SerializedEditorState)=>void;
 onError:(e:Error)=>void;
 children?:React.ReactNode;
 active?:boolean;
 toolbarHost?:HTMLElement|null;
 pageMetrics?:PageMetrics;
 customFonts?:string[];
}) {
 const lastEmitted=useRef(JSON.stringify(content));
 const [historyState]=useState(createEmptyHistoryState);
 return <LexicalComposer initialConfig={{namespace:'Bibliarch',nodes:[HeadingNode,PageNode,FlowParagraphNode],editorState:JSON.stringify(content),onError,theme:{text:{bold:'text-bold',italic:'text-italic',underline:'text-underline',strikethrough:'text-strike',superscript:'text-super',underlineStrikethrough:'text-both'}}}}>
  {active&&toolbarHost&&createPortal(<EditorTools customFonts={customFonts} historyState={historyState}/>,toolbarHost)}
  <EditorFindBridge active={active}/>
  {children}
  <div style={{position:'relative',width:pageMetrics?.widthPx}}>
  <RichTextPlugin contentEditable={<ContentEditable className={pageMetrics?'editor editor-paginated':'editor'} style={pageMetrics?{width:pageMetrics.widthPx,minHeight:0,padding:0,background:'transparent'}:undefined} aria-label="Manuscript" spellCheck/>} placeholder={null} ErrorBoundary={LexicalErrorBoundary}/>
  {pageMetrics&&<TitleControl metrics={pageMetrics}/>}
  </div>
  <HistoryPlugin externalHistoryState={historyState}/>
  <TabIndentationPlugin maxIndent={8}/>
  {pageMetrics&&<PaginationPlugin metrics={pageMetrics}/>}
  <OnChangePlugin ignoreSelectionChange ignoreHistoryMergeTagChange={false} onChange={state=>{const source=pageMetrics?flattenPages(state.toJSON()):state.toJSON();const serialized=JSON.stringify(source);if(serialized!==lastEmitted.current){lastEmitted.current=serialized;onChange(source);}}}/>
 </LexicalComposer>;
}
