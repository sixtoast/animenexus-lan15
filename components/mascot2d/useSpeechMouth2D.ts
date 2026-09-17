"use client";
import {useEffect,useRef,useState} from "react";

type Input={active:boolean;energy:number;happiness:number;stress:number;sleepiness:number};
export type SpeechMouth={open:number;wide:number;mood:number;shape:"silence"|"closed"|"narrow"|"wide"|"open"};
const REST:SpeechMouth={open:0,wide:0,mood:0,shape:"silence"};
const clamp=(v:number,lo=0,hi=1)=>Math.min(hi,Math.max(lo,v));
const SHAPES=[
 {shape:"closed" as const,open:.03,wide:.12,w:1.3},
 {shape:"narrow" as const,open:.32,wide:.08,w:1},
 {shape:"wide" as const,open:.38,wide:.72,w:1.15},
 {shape:"open" as const,open:.78,wide:.35,w:.9}
];
export function useSpeechMouth2D({active,energy,happiness,stress,sleepiness}:Input):SpeechMouth{
 const [mouth,setMouth]=useState<SpeechMouth>(REST),input=useRef({active,energy,happiness,stress,sleepiness});input.current={active,energy,happiness,stress,sleepiness};
 useEffect(()=>{if(!active){setMouth(REST);return}let alive=true,timer=0;const choose=()=>{if(!alive)return;const i=input.current;if(!i.active){setMouth(REST);return}const pauseChance=.13+i.sleepiness*.08;if(Math.random()<pauseChance){setMouth({open:0,wide:.05,mood:clamp(i.happiness-i.stress*.4,-1,1),shape:"closed"});timer=window.setTimeout(choose,75+Math.random()*150);return}const total=SHAPES.reduce((n,s)=>n+s.w,0),r=Math.random()*total;let acc=0,pick=SHAPES[0];for(const s of SHAPES){acc+=s.w;if(r<=acc){pick=s;break}}const intensity=.72+i.energy*.22-i.sleepiness*.12,stressTight=1-i.stress*.18;setMouth({open:clamp(pick.open*intensity),wide:clamp(pick.wide*stressTight+i.happiness*.1),mood:clamp(i.happiness-i.stress*.4,-1,1),shape:pick.shape});const cadence=82-i.energy*18+i.sleepiness*32+Math.random()*55;timer=window.setTimeout(choose,Math.max(58,cadence))};choose();return()=>{alive=false;clearTimeout(timer)}},[active]);
 return mouth;
}
