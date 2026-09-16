"use client";
import {useSyncExternalStore} from "react";

export type MascotReactionKind="success"|"error"|"choice"|"discovery";
export type MascotReaction={id:number;kind:MascotReactionKind;strength:number};
let snapshot:MascotReaction={id:0,kind:"discovery",strength:0};
const listeners=new Set<()=>void>();
export function pushMascotReaction(kind:MascotReactionKind,strength=.7){snapshot=Object.freeze({id:snapshot.id+1,kind,strength:Math.max(0,Math.min(1,strength))});listeners.forEach(fn=>fn())}
const getSnapshot=()=>snapshot;
export function useMascotReaction(){return useSyncExternalStore(cb=>{listeners.add(cb);return()=>listeners.delete(cb)},getSnapshot,getSnapshot)}
