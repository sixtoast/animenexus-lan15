"use client";
import {useEffect,useRef,useState} from "react";

/** One timer owner: changing gaze/emotion cannot cancel an in-flight reopening. */
export function useCoralBlink(sleepiness:number,stress:number,expression:string,gaze:{x:number;y:number},sleeping:boolean){
 const latest=useRef({sleepiness,stress,expression,sleeping});
 latest.current={sleepiness,stress,expression,sleeping};
 const request=useRef<()=>void>(()=>{}),previous=useRef(gaze);
 const [blink,setBlink]=useState(false);
 const [blinkKind,setKind]=useState<"normal"|"slow"|"shift">("normal");
 useEffect(()=>{
  let closeTimer=0,openTimer=0,busy=false,lastBlink=0,alive=true;
  const close=(shift:boolean)=>{
   const e=latest.current;
   if(!alive||document.hidden||busy||e.sleeping||performance.now()-lastBlink<900)return;
   if(shift&&["surprised","scared"].includes(e.expression))return;
   busy=true;lastBlink=performance.now();
   const slow=e.sleepiness>.65;
   setKind(shift?"shift":slow?"slow":"normal");setBlink(true);
   openTimer=window.setTimeout(()=>{if(!alive)return;setBlink(false);busy=false},slow?180:110);
  };
  // Schedule independently of close(), including when sleep suppresses a blink.
  const tick=()=>{close(false);closeTimer=window.setTimeout(tick,3200+Math.random()*2500)};
  closeTimer=window.setTimeout(tick,2800+Math.random()*1800);
  request.current=()=>close(true);
  const visibility=()=>{clearTimeout(closeTimer);clearTimeout(openTimer);busy=false;setBlink(false);if(!document.hidden)closeTimer=window.setTimeout(tick,1800+Math.random()*1800);};
  document.addEventListener('visibilitychange',visibility);
  return()=>{alive=false;clearTimeout(closeTimer);clearTimeout(openTimer);request.current=()=>{};document.removeEventListener('visibilitychange',visibility)};
 },[]);
 useEffect(()=>{const p=previous.current;previous.current=gaze;if(Math.hypot(gaze.x-p.x,gaze.y-p.y)>.65)request.current()},[gaze.x,gaze.y]);
 return {blink:blink||sleeping,blinkKind};
}
