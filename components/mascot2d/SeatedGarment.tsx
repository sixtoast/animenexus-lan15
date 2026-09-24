"use client";
import {memo,useId} from 'react';
import body from './body.png';
import {GARMENT_TRIANGLES,GARMENT_WIDTH,GARMENT_HEIGHT} from './garmentMesh';
const COVERAGE=GARMENT_TRIANGLES.map(t=>{
 const cx=t.reduce((s,p)=>s+p.x,0)/3,cy=t.reduce((s,p)=>s+p.y,0)/3;
 const dx=Math.max(...t.map(p=>p.x))-Math.min(...t.map(p=>p.x)),dy=Math.max(...t.map(p=>p.y))-Math.min(...t.map(p=>p.y));
 const scale=1+4/(dx*dy/Math.hypot(dx,dy));
 return `M${t.map(p=>`${cx+(p.x-cx)*scale} ${cy+(p.y-cy)*scale}`).join(' L')} Z`;
});
export const SeatedGarment=memo(function SeatedGarment(){
 const id=useId().replace(/[^a-zA-Z0-9_-]/g,'');
 return <g data-garment-mesh="lap" data-deformed="false" transform="translate(217 625)">
  <defs>
   <svg id={`${id}-texture`} width={GARMENT_WIDTH} height={GARMENT_HEIGHT} viewBox="54 454 915 778" preserveAspectRatio="none" overflow="hidden"><image href={body.src} width="1024" height="1536"/></svg>
   {COVERAGE.map((d,i)=><clipPath key={i} id={`${id}-clip-${i}`}><path d={d}/></clipPath>)}
  </defs>
  <use className="coral-garment-rest" href={`#${id}-texture`}/>
  <g className="coral-garment-skin">{GARMENT_TRIANGLES.map((_,i)=><g key={i} data-garment-triangle={i}><g clipPath={`url(#${id}-clip-${i})`}><use href={`#${id}-texture`}/></g></g>)}</g>
 </g>;
});
