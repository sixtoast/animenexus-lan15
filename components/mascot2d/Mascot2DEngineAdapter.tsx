"use client";
import {useMascotStore} from "@/lib/mascot/store";
import {faceForActor} from "@/components/mascot/expression-bridge";
import {LanternKo2D} from "./LanternKo2D";
import type {PerchPose} from "./types";
import "./contextual-acting.css";
export type Mascot2DEngineAdapterProps={className?:string;depth?:number;yaw?:number;speed?:number;justLanded?:boolean;gazeOverride?:{x:number;y:number};perchPose?:PerchPose;};
/** Render-only bridge. Behaviour remains owned by the existing mascot engine/store. */
export function Mascot2DEngineAdapter({className,depth=1,yaw=0,speed=0,justLanded=false,gazeOverride={x:0,y:0},perchPose="stand"}:Mascot2DEngineAdapterProps){
 const emotions=useMascotStore(s=>s.emotions),anim=useMascotStore(s=>s.anim),layers=useMascotStore(s=>s.layers),lookBias=useMascotStore(s=>s.lookBias),intention=useMascotStore(s=>s.intention),lastLandmarkType=useMascotStore(s=>s.lastLandmarkType),expression=faceForActor(anim,emotions,layers.social!=="none");
 return <LanternKo2D expression={expression} emotions={emotions} lookBias={lookBias} gazeOverride={gazeOverride} anim={anim} yaw={yaw} speed={speed} justLanded={justLanded} depth={depth} className={className} context={{intention,lastLandmarkType}} perchPose={perchPose}/>;
}
