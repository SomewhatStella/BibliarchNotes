import {createBrowserClient} from '@supabase/ssr';
import {createClient} from '@supabase/supabase-js';
import type {CloudSession} from './cloud';
let client:ReturnType<typeof createBrowserClient>|undefined;
/** Exactly the default cookie name/path/encoding used by Notes. No second token store. */
export function sharedAuth(){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 if(!url||!key)throw Error('Shared account configuration is unavailable. Please try again later.');
 return client??(client=createBrowserClient(url,key));
}
/** Reset emails use the implicit flow so the link works on any device, not only in the browser that asked. */
export function sendPasswordResetEmail(email:string){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 if(!url||!key)throw Error('Shared account configuration is unavailable. Please try again later.');
 const client=createClient(url,key,{auth:{flowType:'implicit',persistSession:false,autoRefreshToken:false,detectSessionInUrl:false,storageKey:'bibliarch-password-reset'}});
 return client.auth.resetPasswordForEmail(email,{redirectTo:`${window.location.origin}/reset-password`});
}
export async function sharedSession():Promise<CloudSession|null>{
 const auth=sharedAuth().auth;
 const {data:{session},error}=await auth.getSession();
 if(error)throw error;
 if(!session)return null;
 // Validate the actual token, not merely the cookie's claimed user ID.
 const {data:{user},error:invalid}=await auth.getUser(session.access_token);
 if(invalid)throw invalid;
 if(!user||user.id!==session.user.id)return null;
 return {access_token:session.access_token,expires_at:session.expires_at??0,user:{id:user.id,email:user.email}};
}
