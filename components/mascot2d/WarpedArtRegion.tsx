"use client";
import {useEffect,useRef} from "react";

type Props={src:string;className?:string;headX:number;headY:number;width?:number;height?:number};
/** Small affine mesh renderer for the approved raster. It bends sampled artwork instead of rotating a flat duplicate. */
export function WarpedArtRegion({src,className,headX,headY,width=210,height=268}:Props){
 const ref=useRef<HTMLCanvasElement>(null),image=useRef<HTMLImageElement|null>(null);
 useEffect(()=>{const img=new Image();img.crossOrigin="anonymous";img.src=src;img.onload=()=>{image.current=img;draw()};return()=>{image.current=null}},[src]);
 const draw=()=>{const canvas=ref.current,img=image.current;if(!canvas||!img)return;const ctx=canvas.getContext("2d");if(!ctx)return;ctx.clearRect(0,0,width,height);ctx.save();ctx.beginPath();ctx.ellipse(width*.5,height*.30,width*.245,height*.185,0,0,Math.PI*2);ctx.clip();const cols=6,rows=5,cw=width/cols,ch=height/rows,sx=img.naturalWidth/cols,sy=img.naturalHeight/rows;for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){const nx=(x+.5)/cols-.5,ny=(y+.5)/rows-.30,fall=Math.max(0,1-Math.hypot(nx*.95,ny*.75));const dx=headX*(5.2+nx*4.4)*fall,dy=headY*(3.2-ny*2.2)*fall,stretch=1+Math.abs(headX)*.022*fall;ctx.save();ctx.translate(x*cw+dx,y*ch+dy);ctx.scale(stretch,1+Math.abs(headY)*.012*fall);ctx.drawImage(img,x*sx,y*sy,sx+1,sy+1,0,0,cw+1,ch+1);ctx.restore()}ctx.restore()};
 useEffect(()=>{draw()},[headX,headY,width,height]);
 return <canvas ref={ref} className={className} width={width} height={height} aria-hidden/>;
}
