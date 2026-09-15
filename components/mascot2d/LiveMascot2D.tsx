"use client";
import {useCallback,useEffect,useRef,useState} from "react";
import {useMascotStore} from "@/lib/mascot/store";
import {worldToScreen,screenToWorld} from "@/lib/mascot/world-coords";
import {areInteractionsEnabled} from "@/lib/mascot/a11y";
import {Mascot2DEngineAdapter} from "./Mascot2DEngineAdapter";

type Point={x:number;y:number};
const HOME:Point={x:1.05,y:-.72};
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));

/** DOM renderer host. It consumes the canonical page-world store coordinates without WebGL. */
export function LiveMascot2D({reducedMotion=false}:{reducedMotion?:boolean}){
 const storePos=useMascotStore(s=>s.position);
 const target=useMascotStore(s=>s.target);
 const setPosition=useMascotStore(s=>s.setPosition);
 const setTarget=useMascotStore(s=>s.setTarget);
 const setAnim=useMascotStore(s=>s.setAnim);
 const [world,setWorld]=useState<Point>(()=>storePos??HOME);
 const [dragging,setDragging]=useState(false);
 const [landed,setLanded]=useState(false);
 const raf=useRef<number|null>(null);
 const worldRef=useRef(world);
 worldRef.current=world;

 useEffect(()=>{if(dragging)return;const dest=target??storePos;if(!dest)return;if(raf.current)cancelAnimationFrame(raf.current);let last=performance.now();const tick=(now:number)=>{const dt=Math.min(.05,(now-last)/1000);last=now;const cur=worldRef.current;const dx=dest.x-cur.x,dy=dest.y-cur.y,d=Math.hypot(dx,dy);if(d<.018){setWorld(dest);setPosition(dest);setLanded(true);window.setTimeout(()=>setLanded(false),380);if(target)setTarget(null);setAnim("idle");raf.current=null;return}const speed=reducedMotion?1.8:1.15;const step=Math.min(d,speed*dt);const next={x:cur.x+dx/d*step,y:cur.y+dy/d*step};worldRef.current=next;setWorld(next);setPosition(next);setAnim(d>.35?"run":"walk");raf.current=requestAnimationFrame(tick)};raf.current=requestAnimationFrame(tick);return()=>{if(raf.current)cancelAnimationFrame(raf.current)}},[target,storePos,dragging,reducedMotion,setPosition,setTarget,setAnim]);

 const screen=worldToScreen(world.x,world.y);
 const down=useCallback((e:React.PointerEvent)=>{if(!areInteractionsEnabled())return;e.preventDefault();e.currentTarget.setPointerCapture?.(e.pointerId);setDragging(true);setAnim("surprised")},[setAnim]);
 const move=useCallback((e:React.PointerEvent)=>{if(!dragging)return;e.preventDefault();const p=screenToWorld(e.clientX,e.clientY);const aspect=window.innerWidth/Math.max(window.innerHeight,1);const next={x:clamp(p.x,-aspect+.12,aspect-.12),y:clamp(p.y,-.9,.9)};worldRef.current=next;setWorld(next);setPosition(next)},[dragging,setPosition]);
 const up=useCallback((e:React.PointerEvent)=>{if(!dragging)return;e.preventDefault();setDragging(false);setLanded(true);window.setTimeout(()=>setLanded(false),380);setAnim("idle")},[dragging,setAnim]);
 return <div style={{position:"fixed",left:screen.clientX,top:screen.clientY,width:1,height:1,zIndex:70,pointerEvents:"none",transform:"translate3d(0,0,0)"}} data-mascot-renderer="2d"><div style={{position:"absolute",left:-110,top:-276,pointerEvents:"auto",touchAction:"none",cursor:dragging?"grabbing":"grab"}} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}><Mascot2DEngineAdapter depth={reducedMotion?.45:1} justLanded={landed}/></div></div>;
}
