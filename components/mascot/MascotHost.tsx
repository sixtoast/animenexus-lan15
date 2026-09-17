"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useMascotStore, mascotNotify } from "@/lib/mascot/store";
import { useMotion } from "@/components/MotionProvider";
import { isAudioEnabled, loadAudioPref, setAudioEnabled } from "@/lib/mascot/audio";
import { areInteractionsEnabled, bindMascotKeyboard, companionStatusLine, loadA11yPrefs, setInteractionsEnabled } from "@/lib/mascot/a11y";
import { installCinematographyBridge } from "@/lib/mascot/cinematography-bridge";
import { UiAwareness } from "./UiAwareness";
import { ContextBridge } from "./ContextBridge";
import { ThoughtBubble } from "./ThoughtBubble";
import { UiTheatreBridge } from "./UiTheatreBridge";
import { MemoryBoot } from "./MemoryBoot";
import { MascotErrorBoundary } from "./MascotErrorBoundary";
import { detectPerfTier, PERF_TIER_LABEL } from "@/lib/mascot/performance";

type MascotRenderer="3d"|"2.5d";
const RENDERER_KEY="anime_nexus_mascot_renderer";
const LiveTerrain=dynamic(()=>import("./LiveTerrain").then(m=>m.LiveTerrain),{ssr:false,loading:()=> <div className="mascot-loading" aria-live="polite">Loading 3D companion…</div>});
const LiveMascot2D=dynamic(()=>import("@/components/mascot2d/LiveMascot2D").then(m=>m.LiveMascot2D),{ssr:false,loading:()=> <div className="mascot-loading" aria-live="polite">Loading 2.5D companion…</div>});
const EnvironmentalReactions2D=dynamic(()=>import("@/components/mascot2d/EnvironmentalReactions2D").then(m=>m.EnvironmentalReactions2D),{ssr:false});
const MascotDebugPanel=dynamic(()=>import("./MascotDebugPanel").then(m=>m.MascotDebugPanel),{ssr:false});

export function MascotHost(){
 const enabled=useMascotStore(s=>s.enabled),setEnabled=useMascotStore(s=>s.setEnabled);const {reducedMotion}=useMotion();const pathname=usePathname();
 // 2.5D is the default showcase renderer. Existing visitors keep an explicit saved choice.
 const [ready,setReady]=useState(false),[hiddenTab,setHiddenTab]=useState(false),[modalOpen,setModalOpen]=useState(false),[lowPower,setLowPower]=useState(false),[perfTier,setPerfTier]=useState<string>("balanced"),[webglError,setWebglError]=useState<string|null>(null),[dockOpen,setDockOpen]=useState(false),[audioOn,setAudioOn]=useState(false),[interactOn,setInteractOn]=useState(true),[statusMsg,setStatusMsg]=useState(""),[renderer,setRenderer]=useState<MascotRenderer>("2.5d");
 useEffect(()=>{setReady(true);try{const saved=localStorage.getItem("anime_nexus_mascot");setEnabled(saved!=="off");const r=localStorage.getItem(RENDERER_KEY);if(r==="2.5d"||r==="3d")setRenderer(r)}catch{setEnabled(true)}loadAudioPref();setAudioOn(isAudioEnabled());const a11y=loadA11yPrefs();setInteractOn(a11y.interactionsEnabled);const mobile=window.matchMedia("(max-width: 480px)").matches||(navigator as Navigator&{connection?:{saveData?:boolean}}).connection?.saveData===true;setLowPower(mobile);setPerfTier(detectPerfTier({lowPower:mobile,width:window.innerWidth}));try{const c=document.createElement("canvas"),gl=c.getContext("webgl2")||c.getContext("webgl")||c.getContext("experimental-webgl");setWebglError(gl?null:"WebGL is not available in this browser.")}catch(e){setWebglError(e instanceof Error?e.message:"WebGL context could not be created.")}installCinematographyBridge()},[setEnabled]);
 useEffect(()=>{const onVis=()=>setHiddenTab(document.hidden);document.addEventListener("visibilitychange",onVis);return()=>document.removeEventListener("visibilitychange",onVis)},[]);
 useEffect(()=>{const check=()=>setModalOpen(!!(document.querySelector('[role="dialog"]:not([hidden]), .modal-root.open, .cmdk-root[data-open="true"], .ai-panel.open')||document.body.classList.contains("modal-open")));const id=window.setInterval(check,600);check();return()=>clearInterval(id)},[]);
 useEffect(()=>{if(enabled)try{mascotNotify({type:"route",path:pathname})}catch{}},[pathname,enabled]);
 const hideCompanion=useCallback(()=>{setEnabled(false);try{localStorage.setItem("anime_nexus_mascot","off")}catch{}setStatusMsg("Companion hidden. Site works without it.")},[setEnabled]);
 const showCompanion=useCallback(()=>{setEnabled(true);try{localStorage.setItem("anime_nexus_mascot","on")}catch{}setStatusMsg("Companion shown.")},[setEnabled]);
 const toggleAudio=useCallback(()=>{const next=!isAudioEnabled();setAudioEnabled(next);setAudioOn(next);setStatusMsg(next?"Companion sound on":"Companion sound off")},[]);
 const toggleInteract=useCallback(()=>{const next=!areInteractionsEnabled();setInteractionsEnabled(next);setInteractOn(next);setStatusMsg(next?"Companion interactions on":"Companion interactions off")},[]);
 const chooseRenderer=useCallback((next:MascotRenderer)=>{if(next==="3d"&&webglError){setStatusMsg("3D is unavailable here. Lantern-ko is staying in 2.5D.");return}setRenderer(next);try{localStorage.setItem(RENDERER_KEY,next)}catch{}setStatusMsg(next==="2.5d"?"Lantern-ko switched to Live2D-style 2.5D":"Lantern-ko switched to 3D")},[webglError]);
 useEffect(()=>{if(!enabled)return;return bindMascotKeyboard({toggleHide:hideCompanion,toggleMute:toggleAudio,toggleInteractions:toggleInteract})},[enabled,hideCompanion,toggleAudio,toggleInteract]);
 useEffect(()=>{try{(window as unknown as {__mascotInteract?:boolean}).__mascotInteract=interactOn}catch{}},[interactOn]);
 if(!ready)return null;
 if(!enabled)return <><div className="sr-only" role="status" aria-live="polite">{statusMsg||"Companion hidden. Site works without it."}</div><button type="button" className="mascot-enable" onClick={showCompanion} title="Show optional companion" aria-label="Show optional companion">🕯️</button><MascotDebugPanel/></>;
 const forceReduced=reducedMotion,activeRenderer:MascotRenderer=webglError&&renderer==="3d"?"2.5d":renderer;
 if(hiddenTab)return null;
 const srLine=companionStatusLine({enabled:true,reducedMotion:!!forceReduced,audioOn,interactionsOn:interactOn});
 return <><div className="sr-only" role="status" aria-live="polite">{statusMsg||srLine}</div><MemoryBoot/><MascotErrorBoundary><UiAwareness/><ContextBridge/><UiTheatreBridge/>{activeRenderer==="2.5d"?<EnvironmentalReactions2D/>:null}</MascotErrorBoundary><MascotErrorBoundary>{activeRenderer==="2.5d"?<LiveMascot2D reducedMotion={forceReduced}/>:<LiveTerrain reducedMotion={forceReduced} lowPower={lowPower}/>}</MascotErrorBoundary><ThoughtBubble/><div className={"mascot-dock"+(modalOpen?" mascot-dock--soft":"")+(dockOpen?" mascot-dock--open":" mascot-dock--collapsed")} role="region" aria-label="Optional companion controls"><button type="button" className="mascot-dock-handle" aria-expanded={dockOpen} aria-controls="mascot-dock-panel" aria-label={dockOpen?"Collapse Lantern-ko controls":"Open Lantern-ko controls"} onClick={()=>setDockOpen(v=>!v)}><span className="mascot-dock-handle-dot" aria-hidden/><span className="mascot-dock-handle-label">Lantern-ko</span></button><div id="mascot-dock-panel" className="mascot-dock-panel" hidden={!dockOpen}><span className="mascot-dock-label" aria-hidden="true">{activeRenderer==="2.5d"?"Live2D-style 2.5D":PERF_TIER_LABEL[perfTier as keyof typeof PERF_TIER_LABEL]||"Medium"}{forceReduced?" · calm":""}</span><button type="button" className="mascot-hide" onClick={()=>chooseRenderer(activeRenderer==="3d"?"2.5d":"3d")} aria-label="Switch companion renderer">Renderer: {activeRenderer==="3d"?"3D":"2.5D"}</button><button type="button" className="mascot-hide" onClick={toggleAudio} title="Toggle companion sound (Alt+Shift+M)" aria-label="Toggle companion sound" aria-pressed={audioOn}>Sound {audioOn?"on":"off"}</button><button type="button" className="mascot-hide" onClick={toggleInteract} title="Toggle companion interactions (Alt+Shift+I)" aria-label="Toggle companion interactions" aria-pressed={interactOn}>{interactOn?"Interactive":"Passive"}</button><button type="button" className="mascot-hide" onClick={hideCompanion} title="Hide companion (Alt+Shift+H)" aria-label="Hide companion">Hide</button></div></div><MascotDebugPanel/></>;
}
