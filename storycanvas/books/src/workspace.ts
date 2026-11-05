import type {Library} from './model';
import type {BookView} from './BookPreview';
export const WORKSPACE_KEY='bibliarch-workspace-v1';
export type Workspace={bookId:string;sceneId:string;zoom:number;view:BookView;home:boolean;spread:boolean};
export function restoreWorkspace(raw:string|null,library:Library):Workspace{
 if(!library.books.length)return {bookId:'',sceneId:'',zoom:100,view:'write',home:true,spread:false};
 let data:Partial<Workspace>={};try{const parsed=JSON.parse(raw||'null');if(parsed&&typeof parsed==='object'&&!Array.isArray(parsed))data=parsed;}catch{}
 const requested=library.books.find(b=>b.id===data.bookId);
 const book=requested||library.books.find(b=>b.id===library.activeBook)||library.books[0];
 const scenes=book.chapters.flatMap(c=>c.scenes);
 const scene=scenes.find(s=>s.id===data.sceneId)||scenes.find(s=>s.id===library.activeScene)||scenes[0];
 return {bookId:book.id,sceneId:scene.id,zoom:[50,75,90,100,125,150].includes(data.zoom as number)?data.zoom!:100,view:['write','facing','covers','3d'].includes(data.view||'')?data.view!:'write',home:!requested||data.home!==false,spread:data.spread===true};
}
