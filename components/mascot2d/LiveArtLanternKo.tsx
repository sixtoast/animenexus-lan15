"use client";
import {useMemo,useState} from "react";
import type {MascotAnim,MascotEmotions} from "@/lib/mascot/types";
import type {PerchPose} from "./types";
import {useLiveArtPhysics} from "./useLiveArtPhysics";
import {WarpedArtRegion} from "./WarpedArtRegion";
import styles from "./live-art-lantern.module.css";

const BASE_ART="https://raw.githubusercontent.com/sixtoast/animenexus-lan15/b2afb50de2419af15d8e93370f86ca9341cdaf4b/public/mascot2d/live/base-front.png";
export type LiveArtLanternKoProps={emotions:MascotEmotions;anim:MascotAnim;yaw?:number;speed?:number;justLanded?:boolean;gazeOverride?:{x:number;y:number};perchPose?:PerchPose;onAssetError?:()=>void};
export function LiveArtLanternKo({emotions,anim,yaw=0,speed=0,justLanded=false,gazeOverride={x:0,y:0},perchPose="stand",onAssetError}:LiveArtLanternKoProps){
 const [ready,setReady]=useState(false);const mood=useMemo(()=>emotions.sleepiness>.62?"sleepy":emotions.stress>.62?"stressed":emotions.happiness>.62?"happy":emotions.curiosity>.62?"curious":"neutral",[emotions]);
 const face=useMemo(()=>({blink:anim==="sleep"?1:0,smile:anim==="happy"||anim==="celebrate"?1:emotions.happiness,surprise:anim==="surprised"?1:0}),[anim,emotions.happiness]),motion=anim==="run"?1:anim==="walk"?.58:anim==="jump"?.82:0;
 const physics=useLiveArtPhysics({headX:gazeOverride.x*.72+yaw*.62,headY:gazeOverride.y*.62,bodyX:yaw*.32,bodyY:gazeOverride.y*.16,hairX:-yaw*.9-gazeOverride.x*.22,cloakX:-yaw*.52},false);
 const vars={"--lk-yaw":`${physics.bodyX*5}deg`,"--lk-gaze-x":`${physics.bodyX*1.2}px`,"--lk-gaze-y":`${physics.bodyY*.8}px`,"--head-angle-x":String(physics.headX),"--head-angle-y":String(physics.headY),"--face-x":`${physics.headX*1.2}px`,"--face-y":`${physics.headY*.8}px`,"--face-squash":String(1-face.blink*.08+face.surprise*.035),"--face-wide":String(1+Math.abs(physics.headX)*.018),"--fringe-shift":`${physics.headX*1.25}px`,"--bow-lag":`${physics.hairX*.9}px`,"--lantern-lag":`${physics.hairX*3.6}px`,"--smile-lift":`${-face.smile*.8}px`,"--lk-speed":String(speed),"--motion":String(motion)} as React.CSSProperties;
 const region=(className:string)=><img className={`${styles.region} ${className}`} src={BASE_ART} alt="" draggable={false}/>;
 return <div className={styles.root} data-ready={ready} data-anim={anim} data-mood={mood} data-perch={perchPose} data-landed={justLanded||undefined} style={vars} aria-hidden><div className={styles.shadow}/><div className={styles.breath}><div className={styles.turn}><div className={styles.artStack}><img className={styles.art} src={BASE_ART} alt="" draggable={false} onLoad={()=>setReady(true)} onError={onAssetError}/><WarpedArtRegion src={BASE_ART} className={styles.cloakMesh} kind="cloak" headX={physics.cloakX} headY={physics.bodyY} motion={motion}/><WarpedArtRegion src={BASE_ART} className={styles.hairLeftMesh} kind="hair-left" headX={physics.hairX} headY={physics.headY} motion={motion}/><WarpedArtRegion src={BASE_ART} className={styles.hairRightMesh} kind="hair-right" headX={physics.hairX} headY={physics.headY} motion={motion}/>{region(styles.fringeRegion)}{region(styles.bowRegion)}<WarpedArtRegion src={BASE_ART} className={styles.faceMesh} kind="face" headX={physics.headX} headY={physics.headY}/>{region(styles.lanternRegion)}</div></div></div></div>;
}
