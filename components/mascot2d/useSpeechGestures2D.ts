"use client";
import {useEffect,useRef,useState} from "react";
export type SpeechGesture={kind:"rest"|"nod"|"present-left"|"present-right"|"emphasis";amount:number;gazeX:number;gazeY:number};
type Input={active:boolean;energy:number;happiness:number;confidence:number;stress:number;sleepiness:number};
const REST:SpeechGesture={kind:"rest",amount:0,gazeX:0,gazeY:0};
const clamp=(v:number,lo=0,hi=1)=>Math.min(hi,Math.max(lo,v));
export function useSpeechGestures2D(input:Input){const [gesture,setGesture]=useState<SpeechGesture>(REST),latest=useRef(input);latest.current=input;
 useEffect(()=>{if(!input.active){setGesture(REST);return}let alive=true,timer=0,clear=0;const schedule=()=>{if(!alive)return;const i=latest.current;if(!i.active){setGesture(REST);return}const express=clamp(.2+i.energy*.35+i.happiness*.18+i.confidence*.22-i.stress*.12-i.sleepiness*.18),delay=620+Math.random()*(1250-express*420);timer=window.setTimeout(()=>{if(!alive)return;const r=Math.random(),kind:SpeechGesture["kind"]=r<.38?"nod":r<.61?"emphasis":r<.805?"present-left":"present-right",side=kind==="present-left"?-1:kind==="present-right"?1:0,amount=.38+express*.5+Math.random()*.12;setGesture({kind,amount,gazeX:side*.18+(Math.random()-.5)*.08,gazeY:kind==="nod"?.06:(Math.random()-.5)*.05});clear=window.setTimeout(()=>alive&&setGesture(REST),kind==="nod"?260:380+Math.random()*180);schedule()},delay)};schedule();return()=>{alive=false;clearTimeout(timer);clearTimeout(clear)}},[input.active]);return gesture}
