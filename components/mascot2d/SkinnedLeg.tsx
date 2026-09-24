"use client";
import {useId} from 'react';
import leg from './leg-left.png';
import {LEG_TRIANGLES,LEG_WIDTH,LEG_HEIGHT} from './legMesh';

// Sub-pixel antialiasing of adjacent SVG clips leaves dark cracks unless their
// texture coverage overlaps. Expand UV clips only; joint geometry is unchanged.
const COVERAGE=LEG_TRIANGLES.map(t=>{
 const cx=t.reduce((s,p)=>s+p.x,0)/3,cy=t.reduce((s,p)=>s+p.y,0)/3;
 const height=Math.max(...t.map(p=>p.y))-Math.min(...t.map(p=>p.y));
 const altitude=LEG_WIDTH*height/Math.hypot(LEG_WIDTH,height),scale=1+6/altitude;
 return `M${t.map(p=>`${cx+(p.x-cx)*scale} ${cy+(p.y-cy)*scale}`).join(' L')} Z`;
});

/** One shared texture; all triangles retain matching UVs across the knee. */
export function SkinnedLeg({side}:{side:'left'|'right'}){
 const id=useId().replace(/[^a-zA-Z0-9_-]/g,'');
 return <g data-leg-mesh={side} transform="translate(367 1060)">
  <defs><svg id={`${id}-texture`} width={LEG_WIDTH} height={LEG_HEIGHT} viewBox="337 119 336 1274" preserveAspectRatio="none" overflow="hidden"><image href={leg.src} width="1024" height="1536"/></svg>
   {COVERAGE.map((d,i)=><clipPath key={i} id={`${id}-clip-${i}`} clipPathUnits="userSpaceOnUse"><path d={d}/></clipPath>)}
  </defs>
  <use className="coral-leg-rest-texture" href={`#${id}-texture`}/>
  <g className="coral-leg-skin">{LEG_TRIANGLES.map((_,i)=><g key={i} data-leg-triangle={i}><g clipPath={`url(#${id}-clip-${i})`}><use href={`#${id}-texture`}/></g></g>)}</g>
 </g>;
}
