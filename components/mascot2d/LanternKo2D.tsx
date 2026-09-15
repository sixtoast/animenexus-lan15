"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import type { LanternKo2DProps } from "./types";
import styles from "./lantern-ko-2d.module.css";
import "./artwork.css";

const clamp=(v:number,lo=-1,hi=1)=>Math.min(hi,Math.max(lo,v));
const HAPPY=new Set(["happy","excited","proud","smug","mischievous"]);
const SAD=new Set(["sad","scared"]);
export function LanternKo2D({expression,emotions,lookBias={x:0,y:0},anim,yaw=0,speed=0,justLanded=false,className=""}:LanternKo2DProps){
 const [blink,setBlink]=useState(false);
 useEffect(()=>{let timer=0,off=false;const schedule=()=>{timer=window.setTimeout(()=>{if(off)return;setBlink(true);window.setTimeout(()=>!off&&setBlink(false),110);schedule()},2300+Math.random()*3300)};schedule();return()=>{off=true;window.clearTimeout(timer)}},[]);
 const pose=useMemo(()=>{const happy=HAPPY.has(expression),sad=SAD.has(expression),sleepy=expression==="sleepy",surprised=expression==="surprised"||expression==="scared",annoyed=expression==="annoyed"||expression==="focused",thinking=expression==="curious"||expression==="confused";return{happy,sad,sleepy,surprised,annoyed,thinking,blush:clamp(.16+emotions.happiness*.32+emotions.stress*.38,0,1)}},[expression,emotions.happiness,emotions.stress]);
 const vars={"--gaze-x":`${clamp(lookBias.x)*6}px`,"--gaze-y":`${clamp(lookBias.y)*4}px`,"--head-x":`${clamp(lookBias.x)*2.4}px`,"--head-y":`${clamp(lookBias.y)*1.6}px`,"--yaw":`${clamp(yaw,-.6,.6)*3}deg`,"--blush":pose.blush,"--energy":Math.max(.2,emotions.energy),"--speed":Math.min(1,speed)} as CSSProperties;
 const mouth=pose.surprised?styles.mouthOpen:pose.sad?styles.mouthSad:pose.happy?styles.mouthHappy:styles.mouthNeutral;
 return <div className={`${styles.root} ${justLanded?styles.landed:""} ${className}`} style={vars} data-expression={expression} data-anim={anim} aria-label="Lantern-ko 2.5D">
  <div className={styles.shadow}/><div className={styles.backCloak} data-layer="back-cloak"><i/><b/></div>
  <div className={styles.body} data-layer="body"><div className={`${styles.arm} ${styles.armLeft}`}/><div className={`${styles.arm} ${styles.armRight}`}/><div className={styles.torso}><i/></div><div className={styles.bow}><i/><i/><b/></div><div className={styles.cloakFrontLeft}/><div className={styles.cloakFrontRight}/></div>
  <div className={styles.headRig}><div className={styles.hood} data-layer="hood"><i/><b/></div><div className={styles.hairBack} data-layer="hair-back"/>
   <div className={styles.face} data-layer="face"><div className={`${styles.blush} ${styles.blushLeft}`}/><div className={`${styles.blush} ${styles.blushRight}`}/>
    {([-1,1] as const).map(side=><div key={side} className={`${styles.eye} ${side<0?styles.eyeLeft:styles.eyeRight} ${(blink||pose.sleepy)?styles.blink:""} ${pose.surprised?styles.eyeWide:""}`}><div className={styles.sclera}/><div className={styles.irisRig}><div className={styles.iris}/><div className={styles.irisGold}/><div className={styles.pupil}/><div className={styles.highlightLarge}/><div className={styles.highlightSmall}/></div><div className={styles.upperLash}/></div>)}
    <div className={`${styles.brow} ${styles.browLeft} ${pose.sad?styles.browSadLeft:""} ${pose.annoyed?styles.browAngryLeft:""} ${pose.thinking?styles.browThinkingLeft:""}`}/><div className={`${styles.brow} ${styles.browRight} ${pose.sad?styles.browSadRight:""} ${pose.annoyed?styles.browAngryRight:""}`}/><div className={`${styles.mouth} ${mouth}`}/>
   </div><div className={styles.hairFront} data-layer="hair-front"><i/><b/></div><div className={styles.lantern} data-layer="lantern"><span/><b/><i/></div>
  </div>
 </div>;
}
