"use client";

import { useEffect, useRef } from "react";
import { mascotNotify, useMascotStore } from "@/lib/mascot/store";
import { listLandmarks, refreshLandmarkRects, type Landmark } from "@/lib/mascot/ui-registry";
import { worldToScreen } from "@/lib/mascot/world-coords";
import { peekMovementCommand } from "@/lib/mascot/movement-command";

type Snapshot={type:Landmark["type"];cx:number;cy:number;width:number;height:number;open:boolean};
type Attention={seenAt:number;cue:EnvironmentalCue;interest:number};
export type EnvironmentalCue="card-appeared"|"overlay-opened"|"notification-appeared"|"search-changed"|"surface-shifted"|"glance-back";
const REACTIVE=new Set<Landmark["type"]>(["card","modal","dropdown","search","notification","hero"]),MEMORY_MS=18000,REPEAT_MS=6500,GLANCE_MIN_MS=4200;
const snapshot=(lm:Landmark):Snapshot|null=>{const r=lm.rect;return r?{type:lm.type,cx:r.left+r.width/2,cy:r.top+r.height/2,width:r.width,height:r.height,open:lm.open}:null};
const cueFor=(lm:Landmark,old:Snapshot|undefined,next:Snapshot):EnvironmentalCue|null=>{if(lm.type==="notification"&&!old)return"notification-appeared";if((lm.type==="modal"||lm.type==="dropdown")&&lm.open&&(!old||!old.open))return"overlay-opened";if(lm.type==="card"&&!old)return"card-appeared";if(lm.type==="search"&&old&&(Math.abs(next.width-old.width)>18||Math.abs(next.height-old.height)>18))return"search-changed";if(old&&(Math.abs(next.width-old.width)>30||Math.abs(next.height-old.height)>30))return"surface-shifted";return null};
const interestFor=(lm:Landmark,cue:EnvironmentalCue)=>cue==="overlay-opened"?1:cue==="notification-appeared"?.92:cue==="card-appeared"?.72:lm.type==="search"?.62:.45;

/** Sensory-only bridge. Short-term attention memory prevents repeated surprise and permits quiet glance-backs. */
export function EnvironmentalReactions2D(){
 const position=useMascotStore(s=>s.position),enabled=useMascotStore(s=>s.enabled),previous=useRef(new Map<string,Snapshot>()),attention=useRef(new Map<string,Attention>()),booted=useRef(false),lastNoticeAt=useRef(0),lastGlanceAt=useRef(0),positionRef=useRef(position);positionRef.current=position;
 useEffect(()=>{if(!enabled)return;let timer=0;
  const emit=(cue:EnvironmentalCue,lm:Landmark,distance:number)=>window.dispatchEvent(new CustomEvent("mascot2d:environment",{detail:{cue,landmarkId:lm.id,landmarkType:lm.type,distance}}));
  const inspect=()=>{try{refreshLandmarkRects();const current=new Map<string,Snapshot>(),landmarks=listLandmarks(),now=performance.now();for(const [id,m] of attention.current)if(now-m.seenAt>MEMORY_MS)attention.current.delete(id);for(const lm of landmarks){const s=snapshot(lm);if(s)current.set(lm.id,s)}if(!booted.current){previous.current=current;booted.current=true;return}
   const pos=positionRef.current,mascot=pos?worldToScreen(pos.x,pos.y):{clientX:innerWidth/2,clientY:innerHeight/2};
   if(now-lastNoticeAt.current>1400&&!peekMovementCommand()){
    let candidate:{lm:Landmark;cue:EnvironmentalCue;distance:number}|null=null;
    for(const lm of landmarks){if(!REACTIVE.has(lm.type)||!lm.rect)continue;const next=current.get(lm.id);if(!next)continue;const cue=cueFor(lm,previous.current.get(lm.id),next);if(!cue)continue;const remembered=attention.current.get(lm.id);if(remembered&&now-remembered.seenAt<REPEAT_MS)continue;const distance=Math.hypot(next.cx-mascot.clientX,next.cy-mascot.clientY),range=cue==="overlay-opened"||cue==="notification-appeared"?900:540;if(distance>range)continue;if(!candidate||distance<candidate.distance)candidate={lm,cue,distance}}
    if(candidate){lastNoticeAt.current=now;attention.current.set(candidate.lm.id,{seenAt:now,cue:candidate.cue,interest:interestFor(candidate.lm,candidate.cue)});emit(candidate.cue,candidate.lm,candidate.distance);mascotNotify({type:"notice-ui",landmarkId:candidate.lm.id})}
    else if(now-lastGlanceAt.current>GLANCE_MIN_MS&&now-lastNoticeAt.current>2600){let remembered:{lm:Landmark;distance:number;score:number}|null=null;for(const lm of landmarks){const m=attention.current.get(lm.id),s=current.get(lm.id);if(!m||!s||now-m.seenAt<2600||now-m.seenAt>MEMORY_MS)continue;const distance=Math.hypot(s.cx-mascot.clientX,s.cy-mascot.clientY);if(distance>620)continue;const score=m.interest-(distance/620)*.35-(now-m.seenAt)/MEMORY_MS*.25;if(score>.28&&(!remembered||score>remembered.score))remembered={lm,distance,score}}if(remembered){lastGlanceAt.current=now;const m=attention.current.get(remembered.lm.id);if(m)m.interest*=.55;emit("glance-back",remembered.lm,remembered.distance)}}
   }
   previous.current=current;
  }catch(error){console.warn("[Lantern-ko 2D] environmental sensing failed",error)}};
  const schedule=()=>{clearTimeout(timer);timer=window.setTimeout(inspect,90)};inspect();const observer=new MutationObserver(schedule);observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:["class","style","hidden","aria-hidden","data-open"]});window.addEventListener("resize",schedule);const idle=window.setInterval(inspect,2400);return()=>{clearTimeout(timer);clearInterval(idle);observer.disconnect();window.removeEventListener("resize",schedule)};
 },[enabled]);return null;
}
