"use client";
import {memo,useId} from 'react';
import {FACE_TRIANGLES,type FaceMeshKind} from './faceMesh';
type Rect=[number,number,number,number];
/** Shared texture, fixed topology, cached imperative vertex updates from the rig clock. */
function FaceLayer({kind,src,source,target}:{kind:FaceMeshKind;src:string;source:Rect;target:Rect}){
 const id=useId().replace(/[^a-zA-Z0-9_-]/g,''),[x,y,width,height]=target;
 return <g transform={`translate(${x} ${y})`} data-face-mesh={kind} data-width={width} data-height={height} data-deformed="false">
  <defs>
   <svg id={`${id}-texture`} width={width} height={height} viewBox={source.join(' ')} preserveAspectRatio="none" overflow="hidden"><image href={src} width="1024" height="1536"/></svg>
   {FACE_TRIANGLES.map((t,i)=>{
    const pts=t.map(p=>({x:p.x*width,y:p.y*height})),cx=pts.reduce((s,p)=>s+p.x,0)/3,cy=pts.reduce((s,p)=>s+p.y,0)/3;
    // Small UV overlap covers anti-alias cracks without moving shared vertices.
    const k=1+2/Math.min(width*.22,height*.22);
    return <clipPath id={`${id}-clip-${i}`} key={i}><path d={`M${pts.map(p=>`${cx+(p.x-cx)*k} ${cy+(p.y-cy)*k}`).join(' L')} Z`}/></clipPath>;
   })}
  </defs>
  <use className="coral-face-rest" href={`#${id}-texture`}/>
  <g className="coral-face-skin">{FACE_TRIANGLES.map((_,i)=><g data-face-triangle={i} key={i}><g clipPath={`url(#${id}-clip-${i})`}><use href={`#${id}-texture`}/></g></g>)}</g>
 </g>;
}
export const DeformableFaceLayer=memo(FaceLayer);
