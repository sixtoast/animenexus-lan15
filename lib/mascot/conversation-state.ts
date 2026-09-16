"use client";
import {useSyncExternalStore} from "react";

export type MascotConversationState={listening:boolean;thinking:boolean;speaking:boolean};
let snapshot:MascotConversationState=Object.freeze({listening:false,thinking:false,speaking:false});
const listeners=new Set<()=>void>();
const emit=()=>listeners.forEach(fn=>fn());

export function setMascotConversationState(patch:Partial<MascotConversationState>){
 const next={...snapshot};
 let changed=false;
 for(const key of Object.keys(patch) as (keyof MascotConversationState)[]){const value=Boolean(patch[key]);if(next[key]!==value){next[key]=value;changed=true}}
 if(changed){snapshot=Object.freeze(next);emit()}
}
export function getMascotConversationState():MascotConversationState{return snapshot}
export function useMascotConversationState(){return useSyncExternalStore(cb=>{listeners.add(cb);return()=>listeners.delete(cb)},getMascotConversationState,getMascotConversationState)}
