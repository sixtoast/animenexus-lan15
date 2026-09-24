"use client";
import {useId} from 'react';
import leg from './leg-left.png';
import {LEG_TRIANGLES,LEG_WIDTH,LEG_HEIGHT} from './legMesh';

/** One shared texture; all triangles retain matching UVs across the knee. */
export function SkinnedLeg({side}:{side:'left'|'right'}){
 const id=useId().replace(/[^a-zA-Z0-9_-]/g,'');
 return <g data-leg-mesh={side} transform="translate(367 1060)">
  <defs><svg id={`${id}-texture`} width={LEG_WIDTH} height={LEG_HEIGHT} viewBox="337 119 336 1274" preserveAspectRatio="none" overflow="hidden"><image href={leg.src} width="1024" height="1536"/></svg>
   {LEG_TRIANGLES.map((t,i)=><clipPath key={i} id={`${id}-clip-${i}`} clipPathUnits="userSpaceOnUse"><path d={`M${t.map(p=>`${p.x} ${p.y}`).join(' L')} Z`}/></clipPath>)}
  </defs>
  {LEG_TRIANGLES.map((_,i)=><g key={i} data-leg-triangle={i}><g clipPath={`url(#${id}-clip-${i})`}><use href={`#${id}-texture`}/></g></g>)}
 </g>;
}
