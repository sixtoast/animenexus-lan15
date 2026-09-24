"use client";
import {useEffect,useRef} from "react";
import {REST_POSE,sampleCoralMotion,type CoralPose} from "./coralMotion";
import {clampAngle,directionalValues} from "./directionalMotion";
import {advanceSpring,channel,advanceLid,lidState,expressionTargets} from "./puppetDynamics";
import {bindLegMesh} from "./legMesh";
type FaceInput={expression:string;blink:boolean;gazeX:number;gazeY:number;mouthOpen:number;mouthWide:number;mouthMood:number};
const NEUTRAL:FaceInput={expression:'neutral',blink:false,gazeX:0,gazeY:0,mouthOpen:0,mouthWide:0,mouthMood:0};

/** One frame loop owns pose and turn channels. No per-frame React state. */
export function useCoralMotion(anim:string,speed:number,perch:string,facingAngle=0,face:FaceInput=NEUTRAL){
 const rig=useRef<SVGSVGElement>(null),input=useRef({anim,speed,perch,facingAngle,face});input.current={anim,speed,perch,facingAngle,face};
 const refresh=useRef<()=>void>(()=>{});
 useEffect(()=>{
  const el=rig.current;if(!el)return;
  const media=window.matchMedia("(prefers-reduced-motion: reduce)");
  let raf=0,last=performance.now(),elapsed=0,currentAnim=anim,currentPerch=perch,currentAngle=clampAngle(facingAngle);
  const pose={...REST_POSE};
  const updateLegMesh=bindLegMesh(el);
  const springs={angle:channel(currentAngle),body:channel(currentAngle),hair:channel(currentAngle),hood:channel(currentAngle),cloak:channel(),brow:channel(),curve:channel(.2),mouth:channel(),width:channel(),slump:channel(),gazeX:channel(),gazeY:channel()};
  const lid=lidState();
  const written=new Map<string,string>();
  const property=(key:string,value:number)=>{const next=String(Math.round(value*1000)/1000);if(written.get(key)!==next){written.set(key,next);el.style.setProperty(key,next);}};
  const write=(t:number,dt:number,reduced=false)=>{
   const targetAngle=clampAngle(input.current.facingAngle);
   // Signed interpolation passes through front when reversing; no instant mirror flip.
   const spring=(key:keyof typeof springs,target:number,frequency=3,damping=.82)=>{
    const s=springs[key];if(reduced){s.value=target;s.velocity=0;return target;}
    return advanceSpring(s,target,dt,frequency,damping);
   };
   currentAngle=clampAngle(spring('angle',targetAngle,3.2,.78));
   const target=sampleCoralMotion(input.current.anim,reduced?2:t,input.current.speed,input.current.perch);
   if(Math.abs(currentAngle)>=67.5&&(input.current.anim==='walk'||input.current.anim==='run')){target.y=0;target.lean=0;target.sx=1;target.sy=1;}
   if(reduced){target.kickL=0;target.kickR=0;if(input.current.anim==='walk'||input.current.anim==='run'){target.y=0;target.sx=1;target.sy=1;target.lean=0;target.legL=0;target.legR=0;}}
   for(const key of Object.keys(pose) as (keyof CoralPose)[]){pose[key]=reduced?target[key]:pose[key]+(target[key]-pose[key])*(1-Math.exp(-dt*15));property(`--pose-${key}`,pose[key]);}
   updateLegMesh(pose.seat,pose.kickL,pose.kickR);
   for(const [key,value] of Object.entries(directionalValues(currentAngle,t,input.current.anim,input.current.speed,reduced)))property(`--${key}`,value);
   property('--body-turn',spring('body',currentAngle,2.2,.95)/90);
   property('--hair-turn',spring('hair',currentAngle,2.1,.58)/90);
   property('--hood-turn',spring('hood',currentAngle,2.6,.9)/90);
   property('--cloth-lag',spring('cloak',-pose.lean*.35-springs.body.velocity*.015,1.8,.7));
   const f=input.current.face,e=expressionTargets(f.expression,f.mouthOpen,f.mouthWide,f.mouthMood);
   const eyeTarget=f.blink||input.current.anim==='sleep'?0:e.eye;
   if(reduced){lid.value=eyeTarget;lid.from=eyeTarget;lid.target=eyeTarget;lid.elapsed=0;}
   property('--eye-open',reduced?eyeTarget:advanceLid(lid,eyeTarget,dt));
   for(const key of ['brow','curve','mouth','width','slump'] as const)property(`--face-${key}`,spring(key,e[key],key==='slump'?1.2:4,1));
   property('--pupil-x',spring('gazeX',Math.max(-6,Math.min(6,f.gazeX))*1.1,7,1));
   property('--pupil-y',spring('gazeY',Math.max(-5,Math.min(5,f.gazeY))*.7,7,1));
   property('--chest-breath',reduced?0:Math.sin(t*Math.PI*2/(input.current.anim==='sleep'?5.2:4.2)));
   const front=Math.abs(currentAngle)<80?"on":"off",profile=Math.abs(currentAngle)>55?"on":"off";
   if(el.dataset.front!==front)el.dataset.front=front;if(el.dataset.profile!==profile)el.dataset.profile=profile;
  };
  const frame=(now:number)=>{
   const dt=Math.min(.05,Math.max(0,(now-last)/1000));last=now;
   if(currentAnim!==input.current.anim||currentPerch!==input.current.perch){currentAnim=input.current.anim;currentPerch=input.current.perch;elapsed=0;}
   elapsed+=dt;write(elapsed,dt);raf=requestAnimationFrame(frame);
  };
  const sync=()=>{cancelAnimationFrame(raf);if(document.hidden)return;if(media.matches)write(0,0,true);else{last=performance.now();raf=requestAnimationFrame(frame);}};
  refresh.current=()=>{if(media.matches)write(0,0,true);};
  const visibility=()=>{if(document.hidden)cancelAnimationFrame(raf);else sync();};
  media.addEventListener('change',sync);document.addEventListener('visibilitychange',visibility);sync();
  return()=>{refresh.current=()=>{};cancelAnimationFrame(raf);media.removeEventListener('change',sync);document.removeEventListener('visibilitychange',visibility);};
 // Current props live in input; the one loop is intentionally mounted once.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[]);
 useEffect(()=>{refresh.current();},[anim,speed,perch,facingAngle,face.expression,face.blink,face.gazeX,face.gazeY,face.mouthOpen,face.mouthWide,face.mouthMood]);
 return {rig};
}
