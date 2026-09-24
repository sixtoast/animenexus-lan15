/** Front-view, two-bone skinning in a shallow 3D projection. Units: rig pixels. */
export const LEG_WIDTH=137, LEG_HEIGHT=430, THIGH_LENGTH=124, SHIN_LENGTH=124;
export const LEG_ROWS=[0,56,94,108,124,140,158,205,232,248,266,330,430] as const;
export type Point={x:number;y:number};
type Vec3={y:number;z:number};
const clamp=(v:number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,v));
const smooth=(v:number)=>{const u=clamp(v,0,1);return u*u*(3-2*u);};
const rad=(degrees:number)=>degrees*Math.PI/180;
const along=(length:number,angle:number):Vec3=>({y:length*Math.cos(angle),z:length*Math.sin(angle)});
const plus=(a:Vec3,b:Vec3):Vec3=>({y:a.y+b.y,z:a.z+b.z});
export function legSkeleton(seat:number,kick:number){
 seat=clamp(Number.isFinite(seat)?seat:0,0,1);kick=clamp(Number.isFinite(kick)?kick:0,-1,1);
 const thigh=rad(82*seat),shin=rad(58*kick*seat),foot=shin*.2;
 const hip={y:0,z:0},knee=along(THIGH_LENGTH,thigh),ankle=plus(knee,along(SHIN_LENGTH,shin));
 return {seat,thigh,shin,foot,hip,knee,ankle};
}
export function legVertex(x:number,y:number,seat:number,kick:number):Point{
 const s=legSkeleton(seat,kick);
 const upper=along(y,s.thigh),lower=plus(s.knee,along(y-THIGH_LENGTH,s.shin));
 const kneeWeight=smooth((y-108)/32);
 let p={y:upper.y*(1-kneeWeight)+lower.y*kneeWeight,z:upper.z*(1-kneeWeight)+lower.z*kneeWeight};
 // Blend at the cuff; retain the boot volume instead of stretching the entire leg.
 const foot=plus(s.ankle,along(y-THIGH_LENGTH-SHIN_LENGTH,s.foot)),footWeight=smooth((y-232)/34);
 p={y:p.y*(1-footWeight)+foot.y*footWeight,z:p.z*(1-footWeight)+foot.z*footWeight};
 const spread=-10*s.seat*Math.min(1,y/THIGH_LENGTH),width=1+p.z/1600;
 return {x:LEG_WIDTH/2+spread+(x-LEG_WIDTH/2)*width,y:p.y+p.z*.12};
}
export type Triangle=[Point,Point,Point];
export const LEG_TRIANGLES:Triangle[]=LEG_ROWS.slice(0,-1).flatMap((y,i)=>{
 const next=LEG_ROWS[i+1],a={x:0,y},b={x:LEG_WIDTH,y},c={x:0,y:next},d={x:LEG_WIDTH,y:next};
 return [[a,b,c],[b,d,c]] as Triangle[];
});
/** Affine texture map: source triangle -> skinned triangle. */
export function triangleMatrix(src:Triangle,dst:Triangle):number[]{
 const [p,q,r]=src,[u,v,w]=dst;
 const dx1=q.x-p.x,dy1=q.y-p.y,dx2=r.x-p.x,dy2=r.y-p.y,det=dx1*dy2-dx2*dy1;
 const a=((v.x-u.x)*dy2-(w.x-u.x)*dy1)/det,c=((w.x-u.x)*dx1-(v.x-u.x)*dx2)/det;
 const b=((v.y-u.y)*dy2-(w.y-u.y)*dy1)/det,d=((w.y-u.y)*dx1-(v.y-u.y)*dx2)/det;
 return [a,b,c,d,u.x-a*p.x-c*p.y,u.y-b*p.x-d*p.y];
}
export function sampleLegMesh(seat:number,kick:number){
 return LEG_TRIANGLES.map(src=>triangleMatrix(src,src.map(p=>legVertex(p.x,p.y,seat,kick)) as Triangle));
}
export function bindLegMesh(root:SVGSVGElement){
 const legs=['left','right'].map(side=>({nodes:Array.from(root.querySelectorAll<SVGGElement>(`[data-leg-mesh="${side}"] [data-leg-triangle]`)),last:''}));
 return (seat:number,kickLeft:number,kickRight:number)=>{
  legs.forEach((leg,index)=>{
   const kick=index===0?kickLeft:kickRight,key=`${seat.toFixed(4)}:${kick.toFixed(4)}`;
   if(key===leg.last)return;leg.last=key;
   sampleLegMesh(seat,kick).forEach((m,i)=>leg.nodes[i]?.setAttribute('transform',`matrix(${m.map(v=>Math.round(v*100000)/100000).join(' ')})`));
  });
 };
}
