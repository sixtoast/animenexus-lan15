"use client";
import {useEffect,useMemo,useRef,useState} from "react";
import type {MascotAnim,MascotEmotions} from "@/lib/mascot/types";
import styles from "./live-art-face.module.css";

type Point={x:number;y:number};
export type LiveArtFaceRigProps={emotions:MascotEmotions;anim:MascotAnim;gaze:Point;yaw:number};
/** Continuous facial controls for the image-first renderer. These are overlays/deformation cues, not replacement artwork. */
export function LiveArtFaceRig({emotions,anim,gaze,yaw}:LiveArtFaceRigProps){
 const [blink,setBlink]=useState(0),timer=useRef<number|null>(null);
 useEffect(()=>{let alive=true;const schedule=()=>{if(!alive)return;timer.current=window.setTimeout(()=>{setBlink(1);window.setTimeout(()=>{setBlink(0);schedule()},105)},2200+Math.random()*3600)};schedule();return()=>{alive=false;if(timer.current)clearTimeout(timer.current)}},[]);
 const pose=useMemo(()=>{const sleepy=emotions.sleepiness,stress=emotions.stress,happy=emotions.happiness,curious=emotions.curiosity;return{eyeOpen:blink?0:anim==="sleep"?0:Math.max(.38,1-sleepy*.42),smile:anim==="happy"||anim==="celebrate"?1:Math.max(0,happy-.35),surprise:anim==="surprised"?1:0,soft:anim==="shy"?1:0,brow:stress>.55?-.55:curious>.58?.38:0}},[anim,blink,emotions]);
 const vars={"--face-x":`${gaze.x*3.8+yaw*1.6}px`,"--face-y":`${gaze.y*2.4}px`,"--eye-open":String(pose.eyeOpen),"--smile":String(pose.smile),"--surprise":String(pose.surprise),"--soft":String(pose.soft),"--brow":String(pose.brow)} as React.CSSProperties;
 return <div className={styles.rig} style={vars} aria-hidden><span className={`${styles.eye} ${styles.leftEye}`}><i/></span><span className={`${styles.eye} ${styles.rightEye}`}><i/></span><span className={`${styles.brow} ${styles.leftBrow}`}/><span className={`${styles.brow} ${styles.rightBrow}`}/><span className={styles.blush}/><span className={styles.mouth}/></div>;
}
