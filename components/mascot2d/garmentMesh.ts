import {triangleMatrix,type Point,type Triangle} from './legMesh';
export const GARMENT_WIDTH=610,GARMENT_HEIGHT=505;
const COLS=[0,.25,.5,.75,1],ROWS=[0,.5,.65,.82,1];
export const GARMENT_TRIANGLES:Triangle[]=ROWS.slice(0,-1).flatMap((v,row)=>COLS.slice(0,-1).flatMap((u,col)=>{
 const a={x:u*GARMENT_WIDTH,y:v*GARMENT_HEIGHT},b={x:COLS[col+1]*GARMENT_WIDTH,y:a.y},c={x:a.x,y:ROWS[row+1]*GARMENT_HEIGHT},d={x:b.x,y:c.y};
 return [[a,b,c],[b,d,c]] as Triangle[];
}));
const bounded=(n:number)=>Math.max(0,Math.min(1,Number.isFinite(n)?n:0));
/** The collar/cape stay registered. Only the lower skirt fans across the lap. */
export function garmentVertex(p:Point,seat:number,kickL:number,kickR:number):Point{
 const s=bounded(seat),u=p.x/GARMENT_WIDTH,v=p.y/GARMENT_HEIGHT,q=bounded((v-.5)/.5);
 const middle=1-(2*u-1)**2;
 const kickLift=(bounded(kickL)*Math.exp(-Math.pow((u-.35)/.18,2))+bounded(kickR)*Math.exp(-Math.pow((u-.65)/.18,2)))*8*q*q*s;
 return {x:GARMENT_WIDTH/2+(p.x-GARMENT_WIDTH/2)*(1+.2*q*s),y:p.y-s*(55*q+25*q*q*middle)-kickLift};
}
export function garmentMatrices(seat:number,kickL:number,kickR:number){
 const cache=new Map<string,Point>();
 return GARMENT_TRIANGLES.map(t=>triangleMatrix(t,t.map(p=>{
  const key=`${p.x}:${p.y}`;if(!cache.has(key))cache.set(key,garmentVertex(p,seat,kickL,kickR));return cache.get(key)!;
 }) as Triangle));
}
export function bindGarmentMesh(root:SVGSVGElement){
 const el=root.querySelector<SVGGElement>('[data-garment-mesh]'),nodes=el?Array.from(el.querySelectorAll<SVGGElement>('[data-garment-triangle]')):[];
 let last='';
 return (seat:number,kickL:number,kickR:number)=>{
  if(!el)return;
  const key=`${seat.toFixed(3)}:${kickL.toFixed(2)}:${kickR.toFixed(2)}`;if(last===key)return;last=key;
  el.dataset.deformed=seat>.0001?'true':'false';if(seat<=.0001)return;
  garmentMatrices(seat,kickL,kickR).forEach((m,i)=>nodes[i]?.setAttribute('transform',`matrix(${m.map(n=>Math.round(n*100000)/100000).join(' ')})`));
 };
}
