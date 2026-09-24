"use client";
import {useEffect,useRef} from "react";
import {subscribeVisualClock} from "./visualClock";

/** Latest inputs without restarting springs; pause offscreen and cap decorative work. */
export function useVisualFrame(callback:(now:number,dt:number)=>void) {
 const latest=useRef(callback);latest.current=callback;
 useEffect(()=>subscribeVisualClock((now,dt)=>latest.current(now,dt),30),[]);
}
