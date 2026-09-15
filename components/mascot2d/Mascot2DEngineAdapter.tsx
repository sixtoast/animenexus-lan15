"use client";
import {useEffect,useRef,useState} from "react";
import {useMascotStore} from "@/lib/mascot/store";
import {faceForActor} from "@/components/mascot/expression-bridge";
import {LanternKo2D} from "./LanternKo2D";
import type {PerchPose} from "./types";
import "./contextual-acting.css";
export type Mascot2DEngineAdapterProps={className?:string;depth?:number;yaw?:number;speed?:number;justLanded?:boolean;gazeOverride?:{x:number;y:number};perchPose?:PerchPose;};
/** Render-only bridge. Behaviour remains owned by the existing mascot engine/store. */
export function Mascot2DEngineAdapter({className,depth=1,yaw=0,speed=0,justLanded=false,gazeOverride={x:0,y:0},perchPose="stand"}:Mascot2DEngineAdapterProps){
 const emotions=useMascotStore(s=>s.emotions),anim=useMascotStore(s=>s.anim),layers=useMascotStore(s=>s.layers),lookBias=useMascotStore(s=>s.lookBias),intention=useMascotStore(s=>s.intention),lastLandmarkType=useMascotStore(s=>s.lastLandmarkType),expression=faceForActor(anim,emotions,layers.social!=="none");
 const target=useRef(gazeOverride),current=useRef(gazeOverride),[continuousGaze,setContinuousGaze]=useState(gazeOverride);target.current=gazeOverride;
 useEffect(()=>{let frame=0,last=performance.now(),alive=true;const tick=(now:number)=>{if(!alive)return;const dt=Math.min(.05,(now-last)/1000);last=now;const t=target.current,c=current.current,returning=Math.abs(t.x)<.01&&Math.abs(t.y)<.01;const response=returning?7.5:14,alpha=1-Math.exp(-response*dt),next={x:c.x+(t.x-c.x)*alpha,y:c.y+(t.y-c.y)*alpha};current.current=next;if(Math.abs(next.x-c.x)>.0005||Math.abs(next.y-c.y)>.0005)setContinuousGaze(next);frame=requestAnimationFrame(tick)};frame=requestAnimationFrame(tick);return()=>{alive=false;cancelAnimationFrame(frame)}},[]);
 return <LanternKo2D expression={expression} emotions={emotions} lookBias={lookBias} gazeOverride={continuousGaze} anim={anim} yaw={yaw} speed={speed} justLanded={justLanded} depth={depth} className={className} context={{intention,lastLandmarkType}} perchPose={perchPose}/>;
}
