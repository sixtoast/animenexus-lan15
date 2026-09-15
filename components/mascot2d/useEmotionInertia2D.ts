"use client";
import {useEffect,useRef,useState} from "react";
import type {MascotEmotions} from "@/lib/mascot/types";
const clamp=(v:number)=>Math.min(1,Math.max(0,v));
type Channel=keyof MascotEmotions;
type Motion={x:number;v:number};
const CHANNELS:Channel[]=["curiosity","energy","happiness","boredom","sleepiness","attention","confidence","stress"];
const rates:Record<Channel,{rise:number;fall:number;damping:number}>={curiosity:{rise:10,fall:5.4,damping:8.2},energy:{rise:8.2,fall:4.2,damping:8.8},happiness:{rise:9.5,fall:4.5,damping:8},boredom:{rise:4.4,fall:7,damping:9},sleepiness:{rise:3.8,fall:5.2,damping:9.5},attention:{rise:12,fall:6.5,damping:10},confidence:{rise:6.5,fall:3.8,damping:8.5},stress:{rise:13,fall:3.5,damping:8}};
export function useEmotionInertia2D(target:MascotEmotions){const targetRef=useRef(target),motionRef=useRef<Record<Channel,Motion>|null>(null),[value,setValue]=useState<MascotEmotions>(target);targetRef.current=target;
 if(!motionRef.current){const seed={} as Record<Channel,Motion>;CHANNELS.forEach(k=>seed[k]={x:clamp(target[k]),v:0});motionRef.current=seed}
 useEffect(()=>{let raf=0,last=performance.now(),alive=true,lastPaint=0;const tick=(now:number)=>{if(!alive)return;const dt=Math.min(.04,Math.max(.008,(now-last)/1000));last=now;const m=motionRef.current!,t=targetRef.current,next={} as MascotEmotions;let moving=false;for(const k of CHANNELS){const s=m[k],goal=clamp(t[k]),cfg=rates[k],stiff=goal>s.x?cfg.rise:cfg.fall;s.v+=(goal-s.x)*stiff*stiff*dt;s.v*=Math.exp(-cfg.damping*dt);s.x=clamp(s.x+s.v*dt);if(Math.abs(goal-s.x)>.002||Math.abs(s.v)>.003)moving=true;next[k]=s.x}if(now-lastPaint>33&&(moving||now-lastPaint>160)){lastPaint=now;setValue(next)}raf=requestAnimationFrame(tick)};raf=requestAnimationFrame(tick);return()=>{alive=false;cancelAnimationFrame(raf)}},[]);return value}
