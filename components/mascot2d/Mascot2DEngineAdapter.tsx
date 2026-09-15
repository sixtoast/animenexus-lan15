"use client";
import {useEffect,useRef,useState} from "react";
import {useMascotStore} from "@/lib/mascot/store";
import {faceForActor} from "@/components/mascot/expression-bridge";
import {LanternKo2D} from "./LanternKo2D";
import {useEmotionInertia2D} from "./useEmotionInertia2D";
import type {PerchPose} from "./types";
import "./contextual-acting.css";
export type Mascot2DEngineAdapterProps={className?:string;depth?:number;yaw?:number;speed?:number;justLanded?:boolean;gazeOverride?:{x:number;y:number};perchPose?:PerchPose;};
type Gaze={x:number;y:number};
const mag=(g:Gaze)=>Math.hypot(g.x,g.y),dist=(a:Gaze,b:Gaze)=>Math.hypot(a.x-b.x,a.y-b.y),clamp=(v:number)=>Math.max(-1,Math.min(1,v));
/** Stable render bridge. AnimeNexus owns attention; this bridge adds human-like visual persistence without changing brain state. */
export function Mascot2DEngineAdapter({className,depth=1,yaw=0,speed=0,justLanded=false,gazeOverride={x:0,y:0},perchPose="stand"}:Mascot2DEngineAdapterProps){
 const rawEmotions=useMascotStore(s=>s.emotions),emotions=useEmotionInertia2D(rawEmotions),anim=useMascotStore(s=>s.anim),layers=useMascotStore(s=>s.layers),lookBias=useMascotStore(s=>s.lookBias),intention=useMascotStore(s=>s.intention),lastLandmarkType=useMascotStore(s=>s.lastLandmarkType),expression=faceForActor(anim,emotions,layers.social!=="none");
 const raw=useRef<Gaze>(gazeOverride),accepted=useRef<Gaze>(gazeOverride),current=useRef<Gaze>(gazeOverride),memory=useRef<{gaze:Gaze;strength:number;at:number}|null>(null),holdUntil=useRef(0),candidateSince=useRef(0),lastCandidate=useRef<Gaze>(gazeOverride),glanceUntil=useRef(0),nextGlance=useRef(0),[continuousGaze,setContinuousGaze]=useState(gazeOverride);raw.current=gazeOverride;
 useEffect(()=>{let frame=0,last=performance.now(),alive=true;const tick=(now:number)=>{if(!alive)return;const dt=Math.min(.05,(now-last)/1000);last=now;const incoming=raw.current,focus=accepted.current,incomingMag=mag(incoming),focusMag=mag(focus),change=dist(incoming,focus),attention=Math.max(0,Math.min(1,emotions.attention)),curiosity=Math.max(0,Math.min(1,emotions.curiosity));
 if(dist(incoming,lastCandidate.current)>.09){lastCandidate.current={...incoming};candidateSince=now}const stableFor=now-candidateSince,urgent=incomingMag>focusMag+.34||change>.82,meaningful=change>.12;
 if(meaningful&&(urgent||now>=holdUntil.current&&stableFor>70+attention*85)){if(focusMag>.24&&change>.28)memory.current={gaze:{...focus},strength:Math.min(1,focusMag*(.7+curiosity*.45)),at:now};accepted.current={x:clamp(incoming.x),y:clamp(incoming.y)};holdUntil.current=now+180+attention*240+curiosity*130;nextGlance.current=now+900+Math.random()*1300}
 if(incomingMag<.035&&focusMag>.12&&now<holdUntil.current)accepted.current=focus;
 const remembered=memory.current;if(remembered&&now>=nextGlance.current&&now-remembered.at<4200&&remembered.strength>.24&&mag(accepted.current)<.62&&glanceUntil.current<=now){glanceUntil.current=now+170+curiosity*170;nextGlance.current=now+99999}
 let visual=accepted.current;if(remembered&&now<glanceUntil.current)visual=remembered.gaze;else if(remembered&&now-remembered.at>=4200)memory.current=null;
 const c=current.current,returning=mag(visual)<.01,response=returning?5.8:dist(visual,c)>.48?16:10.5,alpha=1-Math.exp(-response*dt),next={x:c.x+(visual.x-c.x)*alpha,y:c.y+(visual.y-c.y)*alpha};current.current=next;if(dist(next,c)>.0005)setContinuousGaze(next);frame=requestAnimationFrame(tick)};frame=requestAnimationFrame(tick);return()=>{alive=false;cancelAnimationFrame(frame)}},[emotions.attention,emotions.curiosity]);
 return <LanternKo2D expression={expression} emotions={emotions} lookBias={lookBias} gazeOverride={continuousGaze} anim={anim} yaw={yaw} speed={speed} justLanded={justLanded} depth={depth} className={className} context={{intention,lastLandmarkType}} perchPose={perchPose}/>;
}
