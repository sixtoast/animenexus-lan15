"use client";
import {useMemo,useState} from "react";
import type {MascotAnim,MascotEmotions} from "@/lib/mascot/types";
import type {PerchPose} from "./types";
import styles from "./live-art-lantern.module.css";

const BASE_ART="https://raw.githubusercontent.com/sixtoast/animenexus-lan15/b2afb50de2419af15d8e93370f86ca9341cdaf4b/public/mascot2d/live/base-front.png";
export type LiveArtLanternKoProps={emotions:MascotEmotions;anim:MascotAnim;yaw?:number;speed?:number;justLanded?:boolean;gazeOverride?:{x:number;y:number};perchPose?:PerchPose;onAssetError?:()=>void};
/** Image-first renderer. The coherent raster is intentionally kept whole in V1; later passes replace regions with deformable image meshes. */
export function LiveArtLanternKo({emotions,anim,yaw=0,speed=0,justLanded=false,gazeOverride={x:0,y:0},perchPose="stand",onAssetError}:LiveArtLanternKoProps){
 const [ready,setReady]=useState(false);const mood=useMemo(()=>emotions.sleepiness>.62?"sleepy":emotions.stress>.62?"stressed":emotions.happiness>.62?"happy":emotions.curiosity>.62?"curious":"neutral",[emotions]);
 const vars={"--lk-yaw":`${yaw*5}deg`,"--lk-gaze-x":`${gazeOverride.x*3.2}px`,"--lk-gaze-y":`${gazeOverride.y*2.2}px`,"--lk-speed":String(speed)} as React.CSSProperties;
 return <div className={styles.root} data-ready={ready} data-anim={anim} data-mood={mood} data-perch={perchPose} data-landed={justLanded||undefined} style={vars} aria-hidden>
  <div className={styles.shadow}/><div className={styles.breath}><div className={styles.turn}><img className={styles.art} src={BASE_ART} alt="" draggable={false} onLoad={()=>setReady(true)} onError={onAssetError}/></div></div>
 </div>;
}
