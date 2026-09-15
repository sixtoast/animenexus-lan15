"use client";
import type { CSSProperties } from "react";
import styles from "./face-rig-2d.module.css";
type Props={expression:string;blink:boolean;gazeX:number;gazeY:number;blush:number};
const HAPPY=new Set(["happy","excited","proud","smug","mischievous"]);
const clamp=(v:number,lo=-1,hi=1)=>Math.min(hi,Math.max(lo,v));
export function FaceRig2D({expression,blink,gazeX,gazeY,blush}:Props){
 const sad=expression==="sad"||expression==="scared",surprised=expression==="surprised"||expression==="scared",sleepy=expression==="sleepy",angry=expression==="annoyed"||expression==="focused",thinking=expression==="curious"||expression==="confused",happy=HAPPY.has(expression),smug=expression==="smug"||expression==="mischievous";
 const gx=clamp(gazeX/6),gy=clamp(gazeY/5),squint=angry?.16:sleepy?.34:smug?.12:0,openness=blink?0:sleepy?.26:surprised?1.12:1-squint;
 const vars={"--fx":`${gazeX}px`,"--fy":`${gazeY}px`,"--fb":blush,"--eye-open":openness,"--pupil-x":`${gx*1.4}px`,"--pupil-y":`${gy*.9}px`,"--iris-scale":surprised?.94:angry?1.04:1,"--lid-bias":`${gy*1.5}px`} as CSSProperties;
 const mouth=surprised?styles.open:sad?styles.sad:happy?styles.happy:thinking?styles.thinking:styles.neutral;
 return <div className={styles.rig} style={vars} data-expression={expression}>
  <div className={styles.nose}/><div className={`${styles.blush} ${styles.blushL}`}/><div className={`${styles.blush} ${styles.blushR}`}/>
  {([-1,1] as const).map(side=><div key={side} className={`${styles.eye} ${side<0?styles.left:styles.right} ${(blink||sleepy)?styles.closed:""} ${surprised?styles.wide:""} ${smug&&side>0?styles.halfEye:""}`}><div className={styles.eyeWhite}/><div className={styles.gaze}><div className={styles.iris}><i/><b/><span/></div></div><div className={styles.upperLid}/><div className={styles.lash}/><div className={styles.lowerLash}/></div>)}
  <div className={`${styles.brow} ${styles.browL} ${sad?styles.sadL:""} ${angry?styles.angryL:""} ${thinking?styles.thinkL:""}`}/><div className={`${styles.brow} ${styles.browR} ${sad?styles.sadR:""} ${angry?styles.angryR:""} ${smug?styles.smugR:""}`}/>
  <div className={`${styles.mouth} ${mouth}`}>{surprised&&<i/>}</div>
 </div>;
}
