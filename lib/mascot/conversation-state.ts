"use client";
import {useSyncExternalStore} from "react";

export type MascotConversationState={listening:boolean;thinking:boolean;speaking:boolean};
const state:MascotConversationState={listening:false,thinking:false,speaking:false};
const listeners=new Set<()=>void>();
const emit=()=>listeners.forEach(fn=>fn());

export function setMascotConversationState(patch:Partial<MascotConversationState>){
 let changed=false;
 for(const key of Object.keys(patch) as (keyof MascotConversationState)[]){const next=Boolean(patch[key]);if(state[key]!==next){state[key]=next;changed=true}}
 if(changed)emit();
}
export function getMascotConversationState():MascotConversationState{return {...state}}
export function useMascotConversationState(){return useSyncExternalStore(cb=>{listeners.add(cb);return()=>listeners.delete(cb)},getMascotConversationState,getMascotConversationState)}
