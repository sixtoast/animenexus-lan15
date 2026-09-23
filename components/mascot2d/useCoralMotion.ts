"use client";
import {useEffect,useRef} from "react";
import {REST_POSE,sampleCoralMotion,type CoralPose} from "./coralMotion";
import {clampAngle,directionalValues} from "./directionalMotion";

/** One frame loop owns pose and turn channels. No per-frame React state. */
export function useCoralMotion(anim:string,speed:number,perch:string,facingAngle=0){
 const rig=useRef<SVGSVGElement>(null),input=useRef({anim,speed,perch,facingAngle});input.current={anim,speed,perch,facingAngle};
 useEffect(()=>{
  const el=rig.current;if(!el)return;
  const media=window.matchMedia("(prefers-reduced-motion: reduce)");
  let raf=0,last=performance.now(),start=last,currentAnim=anim,currentPerch=perch,currentAngle=clampAngle(facingAngle);
  const pose={...REST_POSE};
  const write=(t:number,dt:number,reduced=false)=>{
   const targetAngle=clampAngle(input.current.facingAngle);
   // Signed interpolation passes through front when reversing; no instant mirror flip.
   currentAngle=reduced?targetAngle:currentAngle+(targetAngle-currentAngle)*(1-Math.exp(-dt*7));
   if(Math.abs(currentAngle-targetAngle)<.05)currentAngle=targetAngle;
   const target=sampleCoralMotion(input.current.anim,reduced?2:t,input.current.speed,input.current.perch);
   if(Math.abs(currentAngle)>=67.5&&(input.current.anim==='walk'||input.current.anim==='run')){target.y=0;target.lean=0;target.sx=1;target.sy=1;}
   if(reduced){target.kickL=0;target.kickR=0;}
   for(const key of Object.keys(pose) as (keyof CoralPose)[]){pose[key]=reduced?target[key]:pose[key]+(target[key]-pose[key])*(1-Math.exp(-dt*15));el.style.setProperty(`--pose-${key}`,String(pose[key]));}
   for(const [key,value] of Object.entries(directionalValues(currentAngle,t,input.current.anim,input.current.speed,reduced)))el.style.setProperty(`--${key}`,String(value));
   el.dataset.facing=String(currentAngle);
  };
  const frame=(now:number)=>{
   const dt=Math.min(.05,Math.max(0,(now-last)/1000));last=now;
   if(currentAnim!==input.current.anim||currentPerch!==input.current.perch){currentAnim=input.current.anim;currentPerch=input.current.perch;start=now;}
   write((now-start)/1000,dt);raf=requestAnimationFrame(frame);
  };
  const sync=()=>{cancelAnimationFrame(raf);if(media.matches)write(0,0,true);else{last=performance.now();raf=requestAnimationFrame(frame);}};
  const visibility=()=>{if(document.hidden)cancelAnimationFrame(raf);else sync();};
  media.addEventListener('change',sync);document.addEventListener('visibilitychange',visibility);sync();
  return()=>{cancelAnimationFrame(raf);media.removeEventListener('change',sync);document.removeEventListener('visibilitychange',visibility);};
 // Current props live in input; the one loop is intentionally mounted once.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[]);
 useEffect(()=>{
  const el=rig.current;if(!el||!window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const p=sampleCoralMotion(anim,2,speed,perch);p.kickL=0;p.kickR=0;
  if(anim==='walk'||anim==='run'){p.y=0;p.sx=1;p.sy=1;p.lean=0;}
  for(const [k,v] of Object.entries(p))el.style.setProperty(`--pose-${k}`,String(v));
  for(const [k,v] of Object.entries(directionalValues(facingAngle,0,anim,speed,true)))el.style.setProperty(`--${k}`,String(v));
 },[anim,speed,perch,facingAngle]);
 return rig;
}
