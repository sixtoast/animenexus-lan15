import {triangleMatrix,type Point,type Triangle} from './legMesh';
export type FaceMeshKind='face'|'eye-left'|'eye-right';
const GRID=[0,.22,.5,.78,1];
export const FACE_TRIANGLES:Triangle[]=GRID.slice(0,-1).flatMap((y,row)=>GRID.slice(0,-1).flatMap((x,col)=>{
 const a={x,y},b={x:GRID[col+1],y},c={x,y:GRID[row+1]},d={x:b.x,y:c.y};
 return [[a,b,c],[b,d,c]] as Triangle[];
}));
const finite=(n:number,limit:number)=>Math.max(-limit,Math.min(limit,Number.isFinite(n)?n:0));
/** Local UV deformation. Eye boundaries remain pinned; no whole-eye translation. */
export function faceVertex(p:Point,kind:FaceMeshKind,turn:number,gazeX:number,gazeY:number):Point{
 const {x:u,y:v}=p;
 if(kind==='face'){
  const t=finite(turn,1),horizontal=1-(2*u-1)**2;
  return {x:.5+(u-.5)*(1-.06*Math.abs(t))+t*.09*horizontal*Math.sin(Math.PI*v),y:v+t*.035*(2*u-1)*Math.sin(Math.PI*v)};
 }
 const weight=Math.sin(Math.PI*u)**2*Math.sin(Math.PI*v)**2;
 return {x:u+finite(gazeX,6.6)/120*weight,y:v+finite(gazeY,3.5)/99*weight};
}
export function faceMatrices(kind:FaceMeshKind,width:number,height:number,turn:number,gazeX:number,gazeY:number){
 const scale=(p:Point)=>({x:p.x*width,y:p.y*height});
 return FACE_TRIANGLES.map(t=>triangleMatrix(t.map(scale) as Triangle,t.map(p=>scale(faceVertex(p,kind,turn,gazeX,gazeY))) as Triangle));
}
export function bindFaceMeshes(root:SVGSVGElement){
 const meshes=Array.from(root.querySelectorAll<SVGGElement>('[data-face-mesh]')).map(el=>({el,kind:el.dataset.faceMesh as FaceMeshKind,width:Number(el.dataset.width),height:Number(el.dataset.height),nodes:Array.from(el.querySelectorAll<SVGGElement>('[data-face-triangle]')),last:''}));
 return (turn:number,gazeX:number,gazeY:number,eyeOpen:number)=>{
  if(Math.abs(turn)>=80/90)return;
  for(const mesh of meshes){
   if(mesh.kind!=='face'&&eyeOpen<.01)continue;
   const key=mesh.kind==='face'?turn.toFixed(3):`${gazeX.toFixed(2)}:${gazeY.toFixed(2)}`;
   if(key===mesh.last)continue;mesh.last=key;
   const active=mesh.kind==='face'?Math.abs(turn)>.001:Math.abs(gazeX)+Math.abs(gazeY)>.01;
   mesh.el.dataset.deformed=active?'true':'false';
   if(!active)continue;
   faceMatrices(mesh.kind,mesh.width,mesh.height,turn,gazeX,gazeY).forEach((matrix,i)=>mesh.nodes[i]?.setAttribute('transform',`matrix(${matrix.map(n=>Math.round(n*100000)/100000).join(' ')})`));
  }
 };
}
