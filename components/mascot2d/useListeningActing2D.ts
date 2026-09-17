"use client";
import {useEffect,useRef,useState} from "react";
export type ListeningAct={kind:"rest"|"soft-glance"|"acknowledge"|"attend";gazeX:number;gazeY:number;nod:number;lean:number};
type Input={active:boolean;attention:number;curiosity:number;energy:number;sleepiness:number;stress:number};
const REST:ListeningAct={kind:"rest",gazeX:0,gazeY:0,nod:0,lean:0};
const clamp=(v:number,lo=0,hi=1)=>Math.min(hi,Math.max(lo,v));
export function useListeningActing2D(input:Input){const [act,setAct]=useState<ListeningAct>(REST),latest=useRef(input);latest.current=input;
 useEffect(()=>{if(!input.active){setAct(REST);return}let alive=true,timer=0,clear=0;const schedule=()=>{if(!alive)return;const i=latest.current;if(!i.active){setAct(REST);return}const engagement=clamp(.22+i.attention*.42+i.curiosity*.22+i.energy*.08-i.sleepiness*.18),delay=850+Math.random()*(1850-engagement*650);timer=window.setTimeout(()=>{if(!alive)return;const r=Math.random(),kind:ListeningAct["kind"]=r<.42?"soft-glance":r<.7?"acknowledge":"attend";if(kind==="soft-glance")setAct({kind,gazeX:(Math.random()-.5)*.1,gazeY:(Math.random()-.5)*.055,nod:0,lean:.06});else if(kind==="acknowledge")setAct({kind,gazeX:(Math.random()-.5)*.06,gazeY:.02,nod:.42+engagement*.28,lean:.1});else setAct({kind,gazeX:(Math.random()-.5)*.05,gazeY:-.02,nod:0,lean:.16+engagement*.12});clear=window.setTimeout(()=>alive&&setAct(REST),kind==="acknowledge"?260:430+Math.random()*260);schedule()},delay)};schedule();return()=>{alive=false;clearTimeout(timer);clearTimeout(clear)}},[input.active]);return act}
