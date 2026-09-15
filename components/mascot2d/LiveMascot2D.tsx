"use client";
import {useCallback,useEffect,useRef,useState} from "react";
import {useMascotStore} from "@/lib/mascot/store";
import {worldToScreen,screenToWorld} from "@/lib/mascot/world-coords";
import {buildTerrain,getHomePlatform,nearestPlatform,planHops,type TerrainPlatform} from "@/lib/mascot/page-terrain";
import {clearMovementCommand,peekMovementCommand} from "@/lib/mascot/movement-command";
import {areInteractionsEnabled} from "@/lib/mascot/a11y";
import {wireStoreMovement} from "@/lib/mascot/wire-movement";
import {installBuiltinMascotEvents} from "@/lib/mascot/builtin-events";
import {installNexusAttentionBridge} from "@/lib/mascot/nexus-attention-bridge";
import {Mascot2DEngineAdapter} from "./Mascot2DEngineAdapter";

type Point={x:number;y:number};
const HOME:Point={x:1.05,y:-.72};
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
const top=(p:TerrainPlatform):Point=>({x:p.x,y:p.y+p.hh});

/** 2.5D body: same brain command channel + DOM terrain planner, no Three.js dependency. */
export function LiveMascot2D({reducedMotion=false}:{reducedMotion?:boolean}){
 const storePos=useMascotStore(s=>s.position),setPosition=useMascotStore(s=>s.setPosition),setTarget=useMascotStore(s=>s.setTarget),setAnim=useMascotStore(s=>s.setAnim);
 const [world,setWorld]=useState<Point>(()=>storePos??HOME),[dragging,setDragging]=useState(false),[landed,setLanded]=useState(false);
 const platforms=useRef<TerrainPlatform[]>([]),route=useRef<TerrainPlatform[]>([]),active=useRef<string|null>(null),raf=useRef<number|null>(null),worldRef=useRef(world),landTimer=useRef<number|null>(null);
 worldRef.current=world;
 useEffect(()=>{wireStoreMovement();installBuiltinMascotEvents();installNexusAttentionBridge();const rebuild=()=>{try{platforms.current=buildTerrain()}catch(e){console.warn("[Lantern-ko 2D] terrain rebuild failed",e)}};rebuild();const a=window.setTimeout(rebuild,250),b=window.setTimeout(rebuild,900);window.addEventListener("resize",rebuild);window.addEventListener("scroll",rebuild,{passive:true});return()=>{clearTimeout(a);clearTimeout(b);window.removeEventListener("resize",rebuild);window.removeEventListener("scroll",rebuild)}},[]);
 useEffect(()=>{let alive=true;const pulse=()=>{if(!alive||dragging)return;const cmd=peekMovementCommand();if(cmd&&cmd.id!==active.current){active.current=cmd.id;const ps=platforms.current;const dest=(cmd.platformId&&ps.find(p=>p.id===cmd.platformId))||nearestPlatform(ps,cmd.target.x,cmd.target.y);const from=nearestPlatform(ps,worldRef.current.x,worldRef.current.y);route.current=dest?planHops(from,dest,ps):[];if(!route.current.length&&dest)route.current=[dest];if(!route.current.length){route.current=[{id:"direct",type:"generic",x:cmd.target.x,y:cmd.target.y,hw:.05,hh:0,priority:1,clientX:0,clientY:0}]}}
   const goal=route.current[0];if(goal){const dest=top(goal),cur=worldRef.current,dx=dest.x-cur.x,dy=dest.y-cur.y,d=Math.hypot(dx,dy);if(d<.025){const next=route.current.shift();if(next){worldRef.current=dest;setWorld(dest);setPosition(dest);setLanded(true);if(landTimer.current)clearTimeout(landTimer.current);landTimer.current=window.setTimeout(()=>setLanded(false),300)}if(!route.current.length&&cmd){clearMovementCommand(cmd.id);active.current=null;setTarget(null);setAnim(cmd.mode==="return-home"?"idle":"happy")}}else{const speed=(cmd?.speed??1)*(reducedMotion?1.8:1.05),step=Math.min(d,speed*.016);const next={x:cur.x+dx/d*step,y:cur.y+dy/d*step};worldRef.current=next;setWorld(next);setPosition(next);setAnim(cmd?.mode==="jump"?"jump":cmd?.mode==="run"||d>.5?"run":"walk")}}
   raf.current=requestAnimationFrame(pulse)};raf.current=requestAnimationFrame(pulse);return()=>{alive=false;if(raf.current)cancelAnimationFrame(raf.current);if(landTimer.current)clearTimeout(landTimer.current)}},[dragging,reducedMotion,setPosition,setTarget,setAnim]);
 const screen=worldToScreen(world.x,world.y);
 const down=useCallback((e:React.PointerEvent)=>{if(!areInteractionsEnabled())return;e.preventDefault();e.currentTarget.setPointerCapture?.(e.pointerId);clearMovementCommand();route.current=[];active.current=null;setDragging(true);setAnim("surprised")},[setAnim]);
 const move=useCallback((e:React.PointerEvent)=>{if(!dragging)return;e.preventDefault();const p=screenToWorld(e.clientX,e.clientY),aspect=window.innerWidth/Math.max(window.innerHeight,1),next={x:clamp(p.x,-aspect+.12,aspect-.12),y:clamp(p.y,-.9,.9)};worldRef.current=next;setWorld(next);setPosition(next)},[dragging,setPosition]);
 const up=useCallback((e:React.PointerEvent)=>{if(!dragging)return;e.preventDefault();setDragging(false);const ps=platforms.current,nearest=nearestPlatform(ps,worldRef.current.x,worldRef.current.y);if(nearest){const snap=top(nearest);worldRef.current=snap;setWorld(snap);setPosition(snap)}setLanded(true);if(landTimer.current)clearTimeout(landTimer.current);landTimer.current=window.setTimeout(()=>setLanded(false),380);setAnim("idle")},[dragging,setPosition,setAnim]);
 const home=getHomePlatform(platforms.current);
 return <><div className="mascot-home-pad" aria-hidden data-renderer="2d" style={home?{left:home.clientX,top:home.clientY}:undefined}/><div style={{position:"fixed",left:screen.clientX,top:screen.clientY,width:1,height:1,zIndex:70,pointerEvents:"none",transform:"translate3d(0,0,0)"}} data-mascot-renderer="2d"><div style={{position:"absolute",left:-110,top:-276,pointerEvents:"auto",touchAction:"none",cursor:dragging?"grabbing":"grab"}} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}><Mascot2DEngineAdapter depth={reducedMotion?.45:1} justLanded={landed}/></div></div></>;
}
