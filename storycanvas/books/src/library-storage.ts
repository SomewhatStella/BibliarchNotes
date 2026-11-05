import {KEY,parseLibrary,seed,type Library} from './model';

export type StoredLibrary={raw:string;revision:string};
export interface DurableBackend {
  read():Promise<StoredLibrary|null>;
  write(raw:string,expected:string|null):Promise<string>;
}
export type SaveResult={ok:boolean;error?:string};
const message=(e:unknown)=>e instanceof Error?e.message:'Device storage unavailable';

/** Atomic compare-and-swap prevents an old tab from replacing a newer library. */
export class IndexedDBBackend implements DurableBackend {
  constructor(private databaseName='bibliarch-books'){}
  private open():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{
    const request=indexedDB.open(this.databaseName,1);
    request.onupgradeneeded=()=>request.result.createObjectStore('library');
    request.onerror=()=>reject(request.error);
    request.onblocked=()=>reject(Error('Device storage is blocked by another tab. Close that tab and retry.'));
    request.onsuccess=()=>resolve(request.result);
  });}
  async read():Promise<StoredLibrary|null>{
    const db=await this.open();
    try{return await new Promise((resolve,reject)=>{
      const tx=db.transaction('library','readonly');const req=tx.objectStore('library').get(KEY);
      tx.oncomplete=()=>resolve(req.result??null);tx.onabort=()=>reject(tx.error||Error('Storage read aborted'));
    });}finally{db.close();}
  }
  async write(raw:string,expected:string|null):Promise<string>{
    const db=await this.open();
    try{return await new Promise((resolve,reject)=>{
      const tx=db.transaction('library','readwrite');const store=tx.objectStore('library');
      const revision=crypto.randomUUID();let conflict=false;let failure:unknown;
      const req=store.get(KEY);
      req.onsuccess=()=>{
        if((req.result?.revision??null)!==expected){conflict=true;tx.abort();return;}
        try{store.put({raw,revision},KEY);}catch(e){failure=e;tx.abort();}
      };
      // A successful put request is NOT a durable commit. Wait for the transaction.
      tx.oncomplete=()=>resolve(revision);
      tx.onabort=()=>reject(conflict?Error('Another tab changed your library. Download this draft and reload.'):failure||tx.error||Error('Storage write aborted'));
    });}finally{db.close();}
  }
}

export class LibraryStore {
  private revision:string|null=null;
  private queue:Promise<unknown>=Promise.resolve();
  private loaded=false;
  constructor(private backend:DurableBackend,private legacy:Pick<Storage,'getItem'>){}
  private loading?:Promise<{library:Library;warning?:string;fresh?:boolean}>;
  load(){return this.loading ?? (this.loading=this.loadOnce().catch(error=>{this.loading=undefined;throw error;}));}
  private async loadOnce():Promise<{library:Library;warning?:string;fresh?:boolean}>{
    let record:StoredLibrary|null=null,warning:string|undefined;
    try{record=await this.backend.read();}catch(e){warning=message(e);}
    if(record){const library=parseLibrary(record.raw);this.revision=record.revision;this.loaded=true;return {library};}
    // Never delete or rewrite legacy bytes, even after verified migration.
    const raw=this.legacy.getItem(KEY);
    const library=raw!==null?parseLibrary(raw):seed();this.loaded=true;
    if(warning)return {library,warning:`Device storage unavailable: ${warning}. Legacy data retained; retry saving or download a backup.`};
    if(raw){
      const result=await this.save(library);
      if(!result.ok)return {library,warning:result.error};
      const verified=await this.backend.read();
      if(!verified||verified.raw!==JSON.stringify(library))throw Error('Migration verification failed; legacy data retained');
    }
    return {library,fresh:!raw};
  }
  /** Attach a retained draft without loading/migrating over it or rebasing stale tabs. */
  async initializeLiveDraft(library:Library){
    await this.queue;
    if(this.loaded)return;
    const record=await this.backend.read();
    if(this.loaded)return;
    // Without the draft's original revision, a different durable record is unsafe.
    if(record && record.raw!==JSON.stringify(library))throw Error('Another tab or session has stored a different library. Download this draft and reload.');
    this.revision=record?.revision??null;
    this.loaded=true;
  }
  save(library:Library):Promise<SaveResult>{
    let raw:string;
    try{raw=JSON.stringify(library);parseLibrary(raw);}catch(e){return Promise.resolve({ok:false,error:message(e)});}
    const task=this.queue.then(async()=>{
      if(!this.loaded)return {ok:false,error:'Library has not finished loading'};
      try{this.revision=await this.backend.write(raw,this.revision);return {ok:true};}
      catch(e){return {ok:false,error:message(e)};}
    });
    this.queue=task;return task;
  }
  // Only after the user explicitly confirms replacing protected/corrupt storage.
  async prepareReplacement(){
    await this.queue;
    const record=await this.backend.read();
    this.revision=record?.revision??null;this.loaded=true;
  }
  async storedRaw(){
    try{return (await this.backend.read())?.raw??this.legacy.getItem(KEY)??'';}
    catch(error){const raw=this.legacy.getItem(KEY);if(raw!==null)return raw;throw error;}
  }
}
export function createLibraryStore(ownerId?:string){return new LibraryStore(new IndexedDBBackend(ownerId?`bibliarch-books:account:${ownerId}`:undefined),{getItem:key=>localStorage.getItem(ownerId?`${key}:account:${ownerId}`:key)});}
