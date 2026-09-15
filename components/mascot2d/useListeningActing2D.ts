"use client";
import {useEffect,useRef,useState} from "react";
export type ListeningAct={kind:"rest"|"input-glance"|"acknowledge"|"attend";gazeX:number;gazeY:number;nod:number;lean:number};
type Input={active:boolean;attention:number;curiosity:number;energy:number;sleepiness:number;stress:number};
const REST:ListeningAct={kind:"rest",gazeX:0,gazeY:0,nod:0,lean:0};
const clamp=(v:number,lo=0,hi=1)=>Math.min(hi,Math.max(lo,v));
export function useListeningActing2D(input:Input){const [act,setAct]=useState<ListeningAct>(REST),latest=useRef(input);latest.current=input;
 useEffect(()=>{let alive=true,timer=0,clear=0;const schedule=()=>{if(!alive)return;const i=latest.current;if(!i.active){setAct(REST);timer=window.setTimeout(schedule,240);return}const engagement=clamp(.22+i.attention*.42+i.curiosity*.22+i.energy*.08-i.sleepiness*.18),delay=850+Math.random()*(1850-engagement*650);timer=window.setTimeout(()=>{if(!alive)return;const r=Math.random(),kind:ListeningAct["kind"]=r<.42?"input-glance":r<.7?"acknowledge":"attend";if(kind==="input-glance")setAct({kind,gazeX:(Math.random()-.5)*.08,gazeY:.18+Math.random()*.09,nod:0,lean:.08});else if(kind==="acknowledge")setAct({kind,gazeX:(Math.random()-.5)*.06,gazeY:.02,nod:.42+engagement*.28,lean:.1});else setAct({kind,gazeX:(Math.random()-.5)*.05,gazeY:-.02,nod:0,lean:.16+engagement*.12});clear=window.setTimeout(()=>alive&&setAct(REST),kind==="acknowledge"?260:430+Math.random()*260);schedule()},delay)};schedule();return()=>{alive=false;clearTimeout(timer);clearTimeout(clear)}},[]);return act}
