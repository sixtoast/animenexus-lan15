"use client";
import {useEffect,useRef} from "react";

/** Latest inputs without restarting springs; pause offscreen and cap decorative work. */
export function useVisualFrame(callback:(now:number,dt:number)=>void) {
 const latest=useRef(callback);latest.current=callback;
 useEffect(()=>{
  const media=window.matchMedia('(prefers-reduced-motion: reduce)');
  let frame=0,last=performance.now();
  const tick=(now:number)=>{
   if(now-last>=1000/30){const dt=Math.min(.05,(now-last)/1000);last=now;latest.current(now,dt);}
   frame=requestAnimationFrame(tick);
  };
  const sync=()=>{cancelAnimationFrame(frame);last=performance.now();if(!document.hidden&&!media.matches)frame=requestAnimationFrame(tick);};
  document.addEventListener('visibilitychange',sync);media.addEventListener('change',sync);sync();
  return()=>{cancelAnimationFrame(frame);document.removeEventListener('visibilitychange',sync);media.removeEventListener('change',sync);};
 },[]);
}
