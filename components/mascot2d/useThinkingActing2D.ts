"use client";
import {useEffect,useRef,useState} from "react";
export type ThinkingBeat={kind:"rest"|"consider"|"inspect"|"resolve";gazeX:number;gazeY:number;tilt:number;nod:number;lean:number};
type Input={active:boolean;curiosity:number;attention:number;energy:number;sleepiness:number;stress:number};
const REST:ThinkingBeat={kind:"rest",gazeX:0,gazeY:0,tilt:0,nod:0,lean:0};
const clamp=(v:number,lo=0,hi=1)=>Math.min(hi,Math.max(lo,v));
export function useThinkingActing2D(input:Input){
 const [beat,setBeat]=useState<ThinkingBeat>(REST),latest=useRef(input);latest.current=input;
 useEffect(()=>{if(!input.active){setBeat(REST);return}let alive=true,timer=0,clear=0;const schedule=()=>{if(!alive)return;const i=latest.current,curiosity=clamp(i.curiosity),attention=clamp(i.attention),sleep=clamp(i.sleepiness),stress=clamp(i.stress),energy=clamp(i.energy),delay=850+Math.random()*(1250+sleep*650-attention*260);timer=window.setTimeout(()=>{if(!alive)return;const r=Math.random(),kind:ThinkingBeat["kind"]=r<.48?"consider":r<.82?"inspect":"resolve",side=Math.random()>.5?1:-1,intensity=clamp(.34+curiosity*.28+attention*.18+energy*.08-stress*.08-sleep*.1,.2,.82);setBeat({kind,gazeX:side*(kind==="inspect"?.22:.1)*intensity,gazeY:(kind==="consider"?-.12:kind==="resolve"?.07:-.03)*intensity,tilt:side*(.7+curiosity*1.25)*intensity,nod:kind==="resolve"?.75*intensity:kind==="consider"?-.22*intensity:0,lean:(.35+attention*.35)*intensity});clear=window.setTimeout(()=>alive&&setBeat(REST),kind==="resolve"?310:520+Math.random()*260);schedule()},Math.max(620,delay))};schedule();return()=>{alive=false;clearTimeout(timer);clearTimeout(clear)}},[input.active]);return beat;
}
