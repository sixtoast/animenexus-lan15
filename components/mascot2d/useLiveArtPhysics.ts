"use client";
import {useEffect,useRef,useState} from "react";

type Target={headX:number;headY:number;bodyX:number;bodyY:number;hairX:number;cloakX:number};
type State=Target;
const ZERO:State={headX:0,headY:0,bodyX:0,bodyY:0,hairX:0,cloakX:0};
export function useLiveArtPhysics(target:Target,reduced=false){
 const targetRef=useRef(target),state=useRef<State>({...ZERO}),velocity=useRef<State>({...ZERO}),[out,setOut]=useState<State>({...ZERO});targetRef.current=target;
 useEffect(()=>{if(reduced){state.current={...targetRef.current};setOut({...state.current});return}let raf=0,last=performance.now(),alive=true;const tick=(now:number)=>{if(!alive)return;const dt=Math.min(.032,Math.max(.001,(now-last)/1000));last=now;const next={...state.current},v={...velocity.current};(Object.keys(next) as (keyof State)[]).forEach(k=>{const stiffness=k.startsWith("head")?150:k.startsWith("body")?90:k==="hairX"?58:42,damping=k.startsWith("head")?19:k.startsWith("body")?16:k==="hairX"?12:10;const a=(targetRef.current[k]-next[k])*stiffness-v[k]*damping;v[k]+=a*dt;next[k]+=v[k]*dt});state.current=next;velocity.current=v;setOut(next);raf=requestAnimationFrame(tick)};raf=requestAnimationFrame(tick);return()=>{alive=false;cancelAnimationFrame(raf)}},[reduced]);return out;
}
