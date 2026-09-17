"use client";
import type {CSSProperties,ReactNode} from "react";
import {FaceRig2D} from "./FaceRig2D";
import armLeft from "./arm-left.png";
import armRight from "./arm-right.png";
import body from "./body.png";
import bow from "./bow.png";
import faceBase from "./face-base.png";
import hairBack from "./hair-back.png";
import hairFront from "./hair-front.png";
import hoodBack from "./hood-back.png";
import lantern from "./lantern.png";
import legLeft from "./leg-left.png";
import legRight from "./leg-right.png";
import "./coral-image-rig.css";

type Rect=[number,number,number,number];
type Props={expression:string;blink:boolean;gazeX:number;gazeY:number;blush:number;turn:number;mouthOpen:number;mouthWide:number;mouthMood:number};
const CANVAS_W=1024,CANVAS_H=1536;
function Layer({src,source,target,name,className=""}:{src:string;source:Rect;target:Rect;name:string;className?:string}){
 const [sx,sy,sw,sh]=source,[tx,ty,tw,th]=target;
 const style={left:`${tx/CANVAS_W*100}%`,top:`${ty/CANVAS_H*100}%`,width:`${tw/CANVAS_W*100}%`,height:`${th/CANVAS_H*100}%`} as CSSProperties;
 const imageStyle={left:`${-sx/sw*100}%`,top:`${-sy/sh*100}%`,width:`${CANVAS_W/sw*100}%`,height:`${CANVAS_H/sh*100}%`} as CSSProperties;
 return <div className={`coral-layer ${className}`} data-layer={name} style={style}><img src={src} alt="" draggable={false} style={imageStyle}/></div>;
}
function Group({name,className="",children}:{name:string;className?:string;children:ReactNode}){return <div className={`coral-group ${className}`} data-layer={name}>{children}</div>}
export function CoralImageRig2D({expression,blink,gazeX,gazeY,blush,turn,mouthOpen,mouthWide,mouthMood}:Props){
 return <div className="coral-rig" aria-hidden="true">
  <div className="coral-shadow"/>
  <Group name="legs" className="coral-legs">
   <Layer src={legLeft.src} source={[337,119,336,1274]} target={[367,1060,137,430]} name="leg-left"/>
   <Layer src={legRight.src} source={[346,82,336,1333]} target={[540,1060,137,430]} name="leg-right"/>
  </Group>
  <Layer src={body.src} source={[54,454,915,778]} target={[217,625,610,505]} name="body" className="coral-body"/>
  <Layer src={armLeft.src} source={[130,271,826,992]} target={[140,660,290,350]} name="arm-left" className="coral-arm coral-arm-left"/>
  <Layer src={armRight.src} source={[76,169,871,1078]} target={[630,690,292,370]} name="arm-right" className="coral-arm coral-arm-right"/>
  <Layer src={bow.src} source={[210,526,632,480]} target={[409,662,201,155]} name="bow" className="coral-bow"/>
  <Group name="head" className="coral-head">
   <Layer src={hoodBack.src} source={[62,103,903,626]} target={[140,95,748,530]} name="hood" className="coral-hood"/>
   <Layer src={hairBack.src} source={[62,197,928,691]} target={[190,165,650,490]} name="hair-back" className="coral-hair-back"/>
   <Layer src={faceBase.src} source={[191,400,642,694]} target={[323,290,430,365]} name="face-base" className="coral-face-base"/>
   <div className="coral-face-rig" data-layer="face"><FaceRig2D expression={expression} blink={blink} gazeX={gazeX} gazeY={gazeY} blush={blush} turn={turn} mouthOpen={mouthOpen} mouthWide={mouthWide} mouthMood={mouthMood}/></div>
   <Layer src={hairFront.src} source={[32,31,968,983]} target={[200,15,625,645]} name="hair-front" className="coral-hair-front"/>
  </Group>
  <Layer src={lantern.src} source={[125,61,774,1380]} target={[96,848,197,353]} name="lantern" className="coral-lantern"/>
 </div>;
}
