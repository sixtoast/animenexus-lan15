"use client";

import { useEffect, useRef } from "react";
import { mascotNotify, useMascotStore } from "@/lib/mascot/store";
import { listLandmarks, refreshLandmarkRects, type Landmark } from "@/lib/mascot/ui-registry";
import { worldToScreen } from "@/lib/mascot/world-coords";
import { peekMovementCommand } from "@/lib/mascot/movement-command";

type Snapshot={type:Landmark["type"];cx:number;cy:number;width:number;height:number;open:boolean};
export type EnvironmentalCue="card-appeared"|"overlay-opened"|"notification-appeared"|"search-changed"|"surface-shifted";
const REACTIVE=new Set<Landmark["type"]>(["card","modal","dropdown","search","notification","hero"]);
const snapshot=(lm:Landmark):Snapshot|null=>{const r=lm.rect;return r?{type:lm.type,cx:r.left+r.width/2,cy:r.top+r.height/2,width:r.width,height:r.height,open:lm.open}:null};
const cueFor=(lm:Landmark,old:Snapshot|undefined,next:Snapshot):EnvironmentalCue|null=>{
 if(lm.type==="notification"&&!old)return"notification-appeared";
 if((lm.type==="modal"||lm.type==="dropdown")&&lm.open&&(!old||!old.open))return"overlay-opened";
 if(lm.type==="card"&&!old)return"card-appeared";
 if(lm.type==="search"&&old&&(Math.abs(next.width-old.width)>18||Math.abs(next.height-old.height)>18))return"search-changed";
 if(old&&(Math.abs(next.width-old.width)>30||Math.abs(next.height-old.height)>30))return"surface-shifted";
 return null;
};

/** Sensory-only bridge. The existing mascot brain still owns movement and intention. */
export function EnvironmentalReactions2D(){
 const position=useMascotStore(s=>s.position),enabled=useMascotStore(s=>s.enabled),previous=useRef(new Map<string,Snapshot>()),booted=useRef(false),lastNoticeAt=useRef(0),positionRef=useRef(position);positionRef.current=position;
 useEffect(()=>{if(!enabled)return;let timer=0;
  const inspect=()=>{try{refreshLandmarkRects();const current=new Map<string,Snapshot>(),landmarks=listLandmarks();for(const lm of landmarks){const s=snapshot(lm);if(s)current.set(lm.id,s)}if(!booted.current){previous.current=current;booted.current=true;return}
   const pos=positionRef.current,mascot=pos?worldToScreen(pos.x,pos.y):{clientX:innerWidth/2,clientY:innerHeight/2},now=performance.now();
   if(now-lastNoticeAt.current>1400&&!peekMovementCommand()){
    let candidate:{lm:Landmark;cue:EnvironmentalCue;distance:number}|null=null;
    for(const lm of landmarks){if(!REACTIVE.has(lm.type)||!lm.rect)continue;const next=current.get(lm.id);if(!next)continue;const cue=cueFor(lm,previous.current.get(lm.id),next);if(!cue)continue;const distance=Math.hypot(next.cx-mascot.clientX,next.cy-mascot.clientY),range=cue==="overlay-opened"||cue==="notification-appeared"?900:540;if(distance>range)continue;if(!candidate||distance<candidate.distance)candidate={lm,cue,distance}}
    if(candidate){lastNoticeAt.current=now;window.dispatchEvent(new CustomEvent("mascot2d:environment",{detail:{cue:candidate.cue,landmarkId:candidate.lm.id,landmarkType:candidate.lm.type,distance:candidate.distance}}));mascotNotify({type:"notice-ui",landmarkId:candidate.lm.id})}
   }
   previous.current=current;
  }catch(error){console.warn("[Lantern-ko 2D] environmental sensing failed",error)}};
  const schedule=()=>{clearTimeout(timer);timer=window.setTimeout(inspect,90)};inspect();const observer=new MutationObserver(schedule);observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:["class","style","hidden","aria-hidden","data-open"]});window.addEventListener("resize",schedule);return()=>{clearTimeout(timer);observer.disconnect();window.removeEventListener("resize",schedule)};
 },[enabled]);return null;
}
