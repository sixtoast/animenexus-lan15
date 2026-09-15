"use client";
import {useMascotStore} from "@/lib/mascot/store";
import {faceForActor} from "@/components/mascot/expression-bridge";
import {LanternKo2D} from "./LanternKo2D";

export type Mascot2DEngineAdapterProps={
 className?:string;
 depth?:number;
 yaw?:number;
 speed?:number;
 justLanded?:boolean;
};

/** Render-only bridge. Behaviour remains owned by the existing mascot engine/store. */
export function Mascot2DEngineAdapter({className,depth=1,yaw=0,speed=0,justLanded=false}:Mascot2DEngineAdapterProps){
 const emotions=useMascotStore(s=>s.emotions);
 const anim=useMascotStore(s=>s.anim);
 const layers=useMascotStore(s=>s.layers);
 const lookBias=useMascotStore(s=>s.lookBias);
 const expression=faceForActor(anim,emotions,layers.social!=="none");
 return <LanternKo2D expression={expression} emotions={emotions} lookBias={lookBias} anim={anim} yaw={yaw} speed={speed} justLanded={justLanded} depth={depth} className={className}/>;
}
