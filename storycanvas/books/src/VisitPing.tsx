'use client';
import {useEffect} from 'react';
import {usePathname} from 'next/navigation';
import {sharedAuth} from './shared-auth';
import {recordVisit} from './visits';
/** Counts each page a not-signed-in visitor opens (see visits.ts). */
export default function VisitPing(){
 const path=usePathname();
 useEffect(()=>{try{void recordVisit(sharedAuth());}catch{/* no config: nothing to count */}},[path]);
 return null;
}
