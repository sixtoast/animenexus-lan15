"use client";
import {useMemo,useState} from "react";
import type {MascotAnim,MascotEmotions} from "@/lib/mascot/types";
import type {PerchPose} from "./types";
import styles from "./live-art-lantern.module.css";

const BASE_ART="https://raw.githubusercontent.com/sixtoast/animenexus-lan15/b2afb50de2419af15d8e93370f86ca9341cdaf4b/public/mascot2d/live/base-front.png";
export type LiveArtLanternKoProps={emotions:MascotEmotions;anim:MascotAnim;yaw?:number;speed?:number;justLanded?:boolean;gazeOverride?:{x:number;y:number};perchPose?:PerchPose;onAssetError?:()=>void};
/** Image-first renderer. Approved art stays authoritative while clipped regions gain independent Live2D-style follow-through. */
export function LiveArtLanternKo({emotions,anim,yaw=0,speed=0,justLanded=false,gazeOverride={x:0,y:0},perchPose="stand",onAssetError}:LiveArtLanternKoProps){
 const [ready,setReady]=useState(false);const mood=useMemo(()=>emotions.sleepiness>.62?"sleepy":emotions.stress>.62?"stressed":emotions.happiness>.62?"happy":emotions.curiosity>.62?"curious":"neutral",[emotions]);
 const face=useMemo(()=>({blink:anim==="sleep"?1:0,smile:anim==="happy"||anim==="celebrate"?1:emotions.happiness,surprise:anim==="surprised"?1:0}),[anim,emotions.happiness]);
 const motion=anim==="run"?1:anim==="walk"?.58:anim==="jump"?.82:0;
 const vars={"--lk-yaw":`${yaw*5}deg`,"--lk-gaze-x":`${gazeOverride.x*1.2}px`,"--lk-gaze-y":`${gazeOverride.y*.8}px`,"--face-x":`${gazeOverride.x*3.1+yaw*2.2}px`,"--face-y":`${gazeOverride.y*1.8}px`,"--face-squash":String(1-face.blink*.08+face.surprise*.035),"--face-wide":String(1+Math.abs(yaw)*.035),"--hair-lag":`${-yaw*2.4-gazeOverride.x*.7}px`,"--hair-side":`${yaw*1.8}px`,"--fringe-shift":`${gazeOverride.x*.55+yaw*.7}px`,"--cloak-lag":`${-yaw*1.4}px`,"--cloak-open":String(1+motion*.018),"--bow-lag":`${-yaw*.9}px`,"--lantern-lag":`${-yaw*3.2}px`,"--smile-lift":`${-face.smile*.8}px`,"--lk-speed":String(speed),"--motion":String(motion)} as React.CSSProperties;
 const region=(className:string)=><img className={`${styles.region} ${className}`} src={BASE_ART} alt="" draggable={false}/>;
 return <div className={styles.root} data-ready={ready} data-anim={anim} data-mood={mood} data-perch={perchPose} data-landed={justLanded||undefined} style={vars} aria-hidden>
  <div className={styles.shadow}/><div className={styles.breath}><div className={styles.turn}><div className={styles.artStack}>
   <img className={styles.art} src={BASE_ART} alt="" draggable={false} onLoad={()=>setReady(true)} onError={onAssetError}/>
   {region(styles.cloakRegion)}{region(styles.hairBackRegion)}{region(styles.hairLeftRegion)}{region(styles.hairRightRegion)}{region(styles.fringeRegion)}{region(styles.bowRegion)}{region(styles.faceRegion)}{region(styles.lanternRegion)}
  </div></div></div>
 </div>;
}
