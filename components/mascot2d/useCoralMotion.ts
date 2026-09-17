"use client";
import {useEffect,useRef} from "react";
import {REST_POSE,sampleCoralMotion,type CoralPose} from "./coralMotion";

/** Animate only the rig's CSS variables, avoiding another React render loop. */
export function useCoralMotion(anim:string,speed:number,perch:string,facingAngle=0){
 const rig=useRef<SVGSVGElement>(null),input=useRef({anim,speed,perch,facingAngle});input.current={anim,speed,perch,facingAngle};
 useEffect(()=>{
  const element=rig.current;if(!element)return;
  const media=window.matchMedia("(prefers-reduced-motion: reduce)");
  let raf=0,last=performance.now(),start=last,currentAnim=input.current.anim,currentPerch=input.current.perch,currentFacing=0,turnStart=last,turnAmount=0,pose={...REST_POSE},active=true;
  const write=(p:CoralPose)=>{for(const key of Object.keys(p) as (keyof CoralPose)[])element.style.setProperty(`--pose-${key}`,String(p[key]))};
  const frame=(now:number)=>{
   if(!active)return;
   const dt=Math.min(.04,Math.max(0,(now-last)/1000));last=now;
   if(currentAnim!==input.current.anim||currentPerch!==input.current.perch){currentAnim=input.current.anim;currentPerch=input.current.perch;start=now}
   if(currentFacing!==input.current.facingAngle){currentFacing=input.current.facingAngle;turnStart=now}
   const turnTime=(now-turnStart)/1000,turnGoal=turnTime<.24?turnAmount:Math.min(1,Math.abs(currentFacing)/90);
   turnAmount+=(turnGoal-turnAmount)*(1-Math.exp(-dt*13));
   element.style.setProperty("--profile",String(turnAmount));
   element.style.setProperty("--facing-sign",currentFacing<0?"-1":"1");
   element.style.setProperty("--turn-lean",String(turnTime<.24?-Math.sign(currentFacing)*2*Math.sin(turnTime/.24*Math.PI):0));
   const target=sampleCoralMotion(currentAnim,(now-start)/1000,input.current.speed,input.current.perch),a=1-Math.exp(-dt*15);
   for(const key of Object.keys(pose) as (keyof CoralPose)[])pose[key]+=(target[key]-pose[key])*a;
   write(pose);raf=requestAnimationFrame(frame);
  };
  const sync=()=>{cancelAnimationFrame(raf);if(media.matches){write(sampleCoralMotion(input.current.anim,2,input.current.speed,input.current.perch));element.style.setProperty("--profile",String(Math.min(1,Math.abs(input.current.facingAngle)/90)));element.style.setProperty("--facing-sign",input.current.facingAngle<0?"-1":"1")}else{last=performance.now();start=last;raf=requestAnimationFrame(frame)}};
  media.addEventListener("change",sync);sync();
  return()=>{active=false;cancelAnimationFrame(raf);media.removeEventListener("change",sync)};
 },[]);
 useEffect(()=>{
  const el=rig.current;if(!el||!window.matchMedia("(prefers-reduced-motion: reduce)").matches)return;
  const pose=sampleCoralMotion(anim,2,speed,perch);
  for(const key of Object.keys(pose) as (keyof CoralPose)[])el.style.setProperty(`--pose-${key}`,String(pose[key]));
  el.style.setProperty("--profile",String(Math.min(1,Math.abs(facingAngle)/90)));
  el.style.setProperty("--facing-sign",facingAngle<0?"-1":"1");
 },[anim,speed,perch,facingAngle]);
 return rig;
}
