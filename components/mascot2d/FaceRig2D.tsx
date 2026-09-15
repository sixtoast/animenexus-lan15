"use client";
import type { CSSProperties } from "react";
import styles from "./face-rig-2d.module.css";
type Props={expression:string;blink:boolean;gazeX:number;gazeY:number;blush:number;turn?:number;mouthOpen?:number;mouthWide?:number;mouthMood?:number};
const HAPPY=new Set(["happy","excited","proud","smug","mischievous"]);
const clamp=(v:number,lo=-1,hi=1)=>Math.min(hi,Math.max(lo,v));
export function FaceRig2D({expression,blink,gazeX,gazeY,blush,turn=0,mouthOpen=0,mouthWide=0,mouthMood=0}:Props){
 const sad=expression==="sad"||expression==="scared",surprised=expression==="surprised"||expression==="scared",sleepy=expression==="sleepy",angry=expression==="annoyed"||expression==="focused",thinking=expression==="curious"||expression==="confused",happy=HAPPY.has(expression),smug=expression==="smug"||expression==="mischievous";
 const gx=clamp(gazeX/6),gy=clamp(gazeY/5),t=clamp(turn,-.6,.6),amount=Math.abs(t)/.6,squint=angry?.16:sleepy?.34:smug?.12:0,openness=blink?0:sleepy?.26:surprised?1.12:1-squint,expressionOpen=surprised?.88:expression==="excited"?.18:thinking?.1:0,expressionWide=expression==="excited"?.72:happy?.42:smug?.25:thinking?.12:0,expressionMood=happy?.72:smug?.45:sad?-.7:angry?-.28:sleepy?-.12:0,proceduralOpen=clamp(Math.max(expressionOpen,mouthOpen),0,1),proceduralWide=clamp(Math.max(expressionWide,mouthWide),0,1),mood=clamp(expressionMood+mouthMood);
 const vars={"--fx":`${gazeX}px`,"--fy":`${gazeY}px`,"--fb":blush,"--eye-open":openness,"--pupil-x":`${gx*1.4}px`,"--pupil-y":`${gy*.9}px`,"--iris-scale":surprised?.94:angry?1.04:1,"--lid-bias":`${gy*1.5}px`,"--turn":t,"--turn-amount":amount,"--feature-shift":`${t*5.2}px`,"--nose-turn":`${t*7.2}px`,"--mouth-turn":`${t*4.6}px`,"--mouth-open":proceduralOpen,"--mouth-wide":proceduralWide,"--mouth-mood":mood,"--mouth-asym":`${t*2.2}px`} as CSSProperties;
 const mouth=proceduralOpen>.08?styles.proceduralOpen:surprised?styles.open:sad?styles.sad:happy?styles.happy:thinking?styles.thinking:styles.neutral;
 return <div className={styles.rig} style={vars} data-expression={expression} data-turn={t<-.08?"left":t>.08?"right":"front"}>
  <div className={styles.nose}/><div className={`${styles.blush} ${styles.blushL}`}/><div className={`${styles.blush} ${styles.blushR}`}/>
  {([-1,1] as const).map(side=>{const near=t===0?false:(t>0?side>0:side<0);return <div key={side} data-depth={near?"near":"far"} className={`${styles.eye} ${side<0?styles.left:styles.right} ${(blink||sleepy)?styles.closed:""} ${surprised?styles.wide:""} ${smug&&side>0?styles.halfEye:""}`}><div className={styles.eyeWhite}/><div className={styles.gaze}><div className={styles.iris}><i/><b/><span/></div></div><div className={styles.upperLid}/><div className={styles.lash}/><div className={styles.lowerLash}/></div>})}
  <div className={`${styles.brow} ${styles.browL} ${sad?styles.sadL:""} ${angry?styles.angryL:""} ${thinking?styles.thinkL:""}`}/><div className={`${styles.brow} ${styles.browR} ${sad?styles.sadR:""} ${angry?styles.angryR:""} ${smug?styles.smugR:""}`}/>
  <div className={`${styles.mouth} ${mouth}`}>{proceduralOpen>.08&&<i/>}</div>
 </div>;
}
