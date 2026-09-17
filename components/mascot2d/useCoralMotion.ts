"use client";
import {useEffect,useRef} from "react";
import {REST_POSE,sampleCoralMotion,type CoralPose} from "./coralMotion";

/** Animate only the rig's CSS variables, avoiding another React render loop. */
export function useCoralMotion(anim:string,speed:number,perch:string){
 const rig=useRef<SVGSVGElement>(null),input=useRef({anim,speed,perch});input.current={anim,speed,perch};
 useEffect(()=>{
  const element=rig.current;if(!element)return;
  const media=window.matchMedia("(prefers-reduced-motion: reduce)");
  let raf=0,last=performance.now(),start=last,currentAnim=input.current.anim,pose={...REST_POSE},active=true;
  const write=(p:CoralPose)=>{for(const key of Object.keys(p) as (keyof CoralPose)[])element.style.setProperty(`--pose-${key}`,String(p[key]))};
  const frame=(now:number)=>{
   if(!active)return;
   const dt=Math.min(.04,Math.max(0,(now-last)/1000));last=now;
   if(currentAnim!==input.current.anim){currentAnim=input.current.anim;start=now}
   const target=sampleCoralMotion(currentAnim,(now-start)/1000,input.current.speed,input.current.perch),a=1-Math.exp(-dt*15);
   for(const key of Object.keys(pose) as (keyof CoralPose)[])pose[key]+=(target[key]-pose[key])*a;
   write(pose);raf=requestAnimationFrame(frame);
  };
  const sync=()=>{cancelAnimationFrame(raf);if(media.matches){write(REST_POSE)}else{last=performance.now();start=last;raf=requestAnimationFrame(frame)}};
  media.addEventListener("change",sync);sync();
  return()=>{active=false;cancelAnimationFrame(raf);media.removeEventListener("change",sync)};
 },[]);
 return rig;
}
