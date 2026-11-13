import {sharedAuth} from './shared-auth';
// Marks "this person used Bibliarch today" for the admin's daily-active counts.
// Same key and same Central-time day as Notes (lib/activity.ts), so the two apps don't both call.
const KEY='bibliarch.activity.v1';
const day=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Chicago'}).format(new Date());
export async function recordActivity(userId:string):Promise<void>{
 try{
  const mark=`${userId}:${day()}`;
  try{if(localStorage.getItem(KEY)===mark)return;}catch{}
  const {error}=await sharedAuth().rpc('record_activity');
  if(error)return; // e.g. the migration hasn't been run yet; try again next time
  try{localStorage.setItem(KEY,mark);}catch{}
 }catch{/* counting visits must never get in the way of writing */}
}
