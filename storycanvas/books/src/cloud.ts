export type CloudSession={access_token:string;refresh_token?:string;expires_at:number;user:{id:string;email?:string}};
export type CloudProject={id:string;name:string;owner_id:string;version:number;content:any;updated_at:string};
export class CloudConflict extends Error{constructor(){super('Remote project changed. Reload explicitly or merge manually before saving.');this.name='CloudConflict';}}
export function validateCloudUrl(value:string,allowLocalhost=false):string{
 const u=new URL(value.trim());const local=allowLocalhost&&u.protocol==='http:'&&['127.0.0.1','localhost'].includes(u.hostname);
 if((!local&&(u.protocol!=='https:'||! /^[a-z0-9-]+\.supabase\.co$/.test(u.hostname)||!!u.port))||u.username||u.password||u.search||u.hash||(u.pathname!=='/'&&u.pathname!==''))throw new Error('Use your HTTPS https://PROJECT.supabase.co project URL (no path or credentials).');return u.origin;
}
export class CloudClient{
 readonly url:string;private key:string;session:CloudSession|null=null;
 constructor(url:string,key:string,options:{allowLocalhost?:boolean}={}){
  this.url=validateCloudUrl(url,options.allowLocalhost);this.key=key.trim();
  if(!this.key||this.key.startsWith('sb_secret_'))throw new Error('Only a public anon/publishable key is allowed. Never use a service key.');
  if(this.key.split('.').length===3){try{const payload=JSON.parse(atob(this.key.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));if(payload.role&&payload.role!=='anon')throw new Error('private');}catch{throw new Error('Invalid or privileged key. Use a public anon key.');}}
 }
 protected async request(path:string,method='GET',body?:unknown,auth=true):Promise<any>{
  if(auth&&(!this.session||this.session.expires_at<=Date.now()/1000)){this.session=null;throw new Error('Session expired. Please sign in again.');}
  const res=await fetch(this.url+path,{method,headers:{apikey:this.key,...(auth?{Authorization:`Bearer ${this.session!.access_token}`} : {}),'Content-Type':'application/json',Prefer:'return=representation'},body:body===undefined?undefined:JSON.stringify(body),redirect:'error',signal:AbortSignal.timeout(20000)});
  const text=await res.text();let data:any;try{data=text?JSON.parse(text):null;}catch{throw new Error('Cloud returned an invalid response.');}
  if(!res.ok){if(res.status===401){this.session=null;throw new Error('Session expired. Please sign in again.');}if(res.status===409||data?.message==='version_conflict')throw new CloudConflict();throw new Error(`Cloud request failed (${res.status}). Check credentials, membership and database setup.`);}
  return data;
 }
 async signIn(email:string,password:string){const d=await this.request('/auth/v1/token?grant_type=password','POST',{email,password},false);this.session={access_token:d.access_token,expires_at:Date.now()/1000+d.expires_in,user:d.user};return this.session;}
 async signUp(email:string,password:string){await this.request('/auth/v1/signup','POST',{email,password},false);}
 async signOut(){try{if(this.session)await this.request('/auth/v1/logout','POST');}finally{this.session=null;}}
 async listProjects():Promise<CloudProject[]>{return this.request('/rest/v1/projects?select=id,name,owner_id,version,updated_at&order=updated_at.desc');}
 async loadProject(id:string):Promise<CloudProject>{const rows=await this.request(`/rest/v1/projects?id=eq.${encodeURIComponent(id)}&select=*`);if(!rows?.[0])throw new Error('Project unavailable or access denied.');return rows[0];}
 async createProject(name:string,content:any):Promise<CloudProject>{const rows=await this.request('/rest/v1/projects','POST',{name,content,owner_id:this.session?.user.id});return rows[0];}
 async saveProject(id:string,version:number,content:any):Promise<CloudProject>{const result=await this.request('/rest/v1/rpc/save_project','POST',{p_id:id,p_expected_version:version,p_content:content});return Array.isArray(result)?result[0]:result;}
 async deleteProject(id:string,version:number){await this.request('/rest/v1/rpc/delete_project','POST',{p_id:id,p_expected_version:version});}
 async shareProject(id:string,userId:string,role:'reader'|'editor'){if(!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(userId))throw new Error('Enter the collaborator’s Supabase user UUID.');await this.request('/rest/v1/rpc/share_project','POST',{p_id:id,p_user_id:userId,p_role:role});}
 async members(id:string){return this.request(`/rest/v1/project_members?project_id=eq.${encodeURIComponent(id)}&select=user_id,role`);}
 async history(id:string){return this.request(`/rest/v1/project_versions?project_id=eq.${encodeURIComponent(id)}&select=version,created_at,created_by&order=version.desc`);}
}

/** Books-only namespace: never writes Notes tables. Private immutable library blobs. */
export class BooksCloudClient extends CloudClient {
 private refreshing:Promise<void>|null=null;
 private shared?:{ownerId:string;sessionProvider:()=>Promise<CloudSession|null>};
 constructor(url:string,key:string,options:{allowLocalhost?:boolean;ownerId?:string;sessionProvider?:()=>Promise<CloudSession|null>}={}){
  super(url,key,options);
  if(options.sessionProvider){if(!options.ownerId)throw Error('Account required');this.shared={ownerId:options.ownerId,sessionProvider:options.sessionProvider};}
 }
 private async sharedSession(){
  if(!this.shared)return;
  const session=await this.shared.sessionProvider();
  if(!session||session.user.id!==this.shared.ownerId){this.session=null;throw Error('Shared account session changed. Saving paused.');}
  this.session=session;
 }
 private get sessionKey(){return `bibliarch-books-session:${this.url}`;}
 private persist(){if(this.shared)return;try{if(this.session)localStorage.setItem(this.sessionKey,JSON.stringify(this.session));else localStorage.removeItem(this.sessionKey);}catch{/* memory fallback */}}
 private accept(d:any){if(!d.access_token||!d.user?.id)throw new Error('Invalid authentication response');this.session={access_token:d.access_token,refresh_token:d.refresh_token,expires_at:Date.now()/1000+d.expires_in,user:d.user};this.persist();}
 async restore(){try{const raw=localStorage.getItem(this.sessionKey);if(!raw)return false;this.session=JSON.parse(raw);await this.request('/auth/v1/user');return true;}catch{this.session=null;this.persist();return false;}}
 protected async request(path:string,method='GET',body?:unknown,auth=true):Promise<any>{
  if(auth)await this.sharedSession();
  if(!this.shared&&auth&&this.session&&this.session.expires_at<Date.now()/1000+60&&this.session.refresh_token){
   if(!this.refreshing){const token=this.session.refresh_token;this.refreshing=super.request('/auth/v1/token?grant_type=refresh_token','POST',{refresh_token:token},false).then(d=>this.accept(d)).finally(()=>{this.refreshing=null;});}
   await this.refreshing;
  }
  const scoped=path.replace('/rest/v1/projects','/rest/v1/books_projects').replace('/rest/v1/project_members','/rest/v1/books_project_members').replace('/rest/v1/project_versions','/rest/v1/books_project_versions').replace('/rest/v1/rpc/','/rest/v1/rpc/books_');
  try{const result=await super.request(scoped,method,body,auth);if(auth)await this.sharedSession();return result;}finally{this.persist();}
 }
 async signIn(email:string,password:string){this.accept(await this.request('/auth/v1/token?grant_type=password','POST',{email,password},false));return this.session!;}
 async signUp(email:string,password:string){const d=await this.request('/auth/v1/signup','POST',{email,password},false);if(d.access_token)this.accept(d);}
 async signOut(){try{await super.signOut();}finally{this.persist();}}
 private async upload(content:any){await this.sharedSession();if(!this.session)throw new Error('Sign in first');const path=`${this.session.user.id}/${crypto.randomUUID()}.json`;await this.request(`/storage/v1/object/bibliarch-books/${path}`,'POST',content);return {storage_path:path};}
 private async discard(path:string){await this.request('/storage/v1/object/bibliarch-books','DELETE',{prefixes:[path]});}
 async loadProject(id:string){const p=await super.loadProject(id);if(p.content?.storage_path){const path=p.content.storage_path;if(!/^[a-zA-Z0-9-]+\/[a-zA-Z0-9-]+\.json$/.test(path))throw new Error('Invalid library blob path');p.content=await this.request(`/storage/v1/object/authenticated/bibliarch-books/${path}`);}return p;}
 async createProject(name:string,content:any){const blob=await this.upload(content);const p=await super.createProject(name,blob);if(!p?.id||!Number.isInteger(p.version))throw new Error('Cloud commit receipt missing. Reload to verify before retrying.');return p;}
 async saveProject(id:string,version:number,content:any){const blob=await this.upload(content);try{const p=await super.saveProject(id,version,blob);if(!p?.id||p.id!==id||!Number.isInteger(p.version)||p.version<=version)throw new Error('Cloud commit receipt missing. Reload to verify before retrying.');return p;}catch(e){/* An ambiguous response may already be committed: retain uploaded blob. */throw e;}}
 async deleteProject(id:string,version:number){const revisions=await this.request(`/rest/v1/project_versions?project_id=eq.${encodeURIComponent(id)}&select=content`);const paths=[...new Set<string>((revisions||[]).map((r:any)=>r.content?.storage_path).filter(Boolean))];await super.deleteProject(id,version);if(paths.length){try{await this.request('/storage/v1/object/bibliarch-books','DELETE',{prefixes:paths});}catch{throw new Error('Cloud metadata deleted, but private blob cleanup failed. Ask the administrator to remove the orphaned blobs.');}}}
 async submitBug(description:string){if(!description.trim()||description.length>10000)throw new Error('Enter a report between 1 and 10000 characters.');const rows=await this.request('/rest/v1/books_bug_reports','POST',{owner_id:this.session?.user.id,description:description.trim()});if(!rows?.[0]?.id)throw new Error('Backend did not return a report receipt.');return rows[0].id as string;}
}
