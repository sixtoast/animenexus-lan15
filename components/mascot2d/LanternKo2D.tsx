"use client";
import {useEffect,useMemo,useState} from "react";
import type {CSSProperties} from "react";
import type {LanternKo2DProps} from "./types";
import {FaceRig2D} from "./FaceRig2D";
import styles from "./lantern-ko-2d.module.css";
import "./artwork.css";
const clamp=(v:number,lo=-1,hi=1)=>Math.min(hi,Math.max(lo,v));
export function LanternKo2D({expression,emotions,lookBias={x:0,y:0},anim,yaw=0,speed=0,justLanded=false,className="",depth=1}:LanternKo2DProps){
 const [blink,setBlink]=useState(false);
 useEffect(()=>{let timer=0,off=false;const schedule=()=>{timer=window.setTimeout(()=>{if(off)return;setBlink(true);window.setTimeout(()=>!off&&setBlink(false),110);schedule()},2300+Math.random()*3300)};schedule();return()=>{off=true;window.clearTimeout(timer)}},[]);
 const pose=useMemo(()=>({gx:clamp(lookBias.x)*5.2,gy:clamp(lookBias.y)*3.6,blush:clamp(.18+emotions.happiness*.34+emotions.stress*.4,0,1)}),[lookBias.x,lookBias.y,emotions.happiness,emotions.stress]);
 const px=clamp(lookBias.x)*clamp(depth,0,1),py=clamp(lookBias.y)*clamp(depth,0,1);
 const vars={"--head-x":`${px*2.4}px`,"--head-y":`${py*1.6}px`,"--yaw":`${clamp(yaw,-.6,.6)*3}deg`,"--energy":Math.max(.2,emotions.energy),"--speed":Math.min(1,speed),"--depth-back-x":`${-px*1.4}px`,"--depth-back-y":`${-py*.5}px`,"--depth-body-x":`${px*.7}px`,"--depth-body-y":`${py*.35}px`,"--depth-hair-x":`${px*1.4}px`,"--depth-hair-y":`${py*.8}px`,"--depth-front-x":`${px*2.1}px`,"--depth-front-y":`${py*1.1}px`,"--depth-tip-x":`${px*2.8}px`,"--depth-tip-y":`${py*1.5}px`} as CSSProperties;
 return <div className={`${styles.root} ${justLanded?styles.landed:""} ${className}`} style={vars} data-expression={expression} data-anim={anim} aria-label="Lantern-ko 2.5D">
  <div className={styles.shadow}/><div className={styles.backCloak} data-layer="back-cloak"/>
  <div className={styles.body} data-layer="body"><div className={`${styles.arm} ${styles.armLeft}`}/><div className={`${styles.arm} ${styles.armRight}`}/><div className={styles.torso}/><div className={styles.bow}><i/><i/><b/></div><div className={styles.cloakFrontLeft}/><div className={styles.cloakFrontRight}/></div>
  <div className={styles.headRig}><div className={styles.hood} data-layer="hood"/><div className={styles.hairBack} data-layer="hair-back"/><div className={styles.face} data-layer="face"><FaceRig2D expression={expression} blink={blink} gazeX={pose.gx} gazeY={pose.gy} blush={pose.blush}/></div><div className={styles.hairFront} data-layer="hair-front"/><div className={styles.lantern} data-layer="lantern"><span/><b/><i/></div></div>
 </div>;
}
