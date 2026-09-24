"use client";
import {useId} from "react";
import {useCoralMotion} from "./useCoralMotion";
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
import brows from "./brows.png";
import eyeLeft from "./eye-left.png";
import eyeRight from "./eye-right.png";
import mouth from "./mouth.png";
import {ProfileRig} from "./DirectionalRig";
import grip from "./poses/grip.png";
import "./coral-image-rig.css";

type Rect=[number,number,number,number];
type Props={facingAngleDeg?:number;anim?:string;speed?:number;perch?:string;expression:string;blink:boolean;gazeX:number;gazeY:number;blush:number;turn:number;mouthOpen:number;mouthWide:number;mouthMood:number};
type LayerDef={name:string;src:string;source:Rect;target:Rect;z:number;canvas?:[number,number];className?:string};
const W=1024,H=1536;
const generated="/mascot2d/generated/";
const LAYERS:LayerDef[]=[
 {name:"sit-left",src:generated+"exec-56f21a7f-878e-4b40-995a-5e6614c9e9f7.png",source:[468,185,320,970],target:[386,1024,115,290],canvas:[1254,1254],z:2},
 {name:"sit-right",src:generated+"exec-ecf4d229-f5ea-4f44-a341-dad95754ed42.png",source:[465,187,325,965],target:[543,1024,115,290],canvas:[1254,1254],z:2},
 {name:"kick-left",src:generated+"exec-0e1cda31-34c9-4e82-9071-c4f39278cc0b.png",source:[431,75,375,1110],target:[377,1009,135,265],canvas:[1254,1254],z:2},
 {name:"kick-right",src:generated+"exec-88a89e41-1eef-45ad-b7c7-a743d7f1392a.png",source:[450,76,374,1110],target:[533,1009,135,265],canvas:[1254,1254],z:2},
 {name:"sitting",src:generated+"exec-43bff40e-49cb-4317-982b-fff1682ecbc6.png",source:[22,315,1210,609],target:[248,825,550,280],canvas:[1254,1254],z:3},
 {name:"point-prepare",src:generated+"exec-50fe19a7-2dda-4e61-896c-a2c2d1f57800.png",source:[171,236,929,821],target:[630,710,295,265],canvas:[1254,1254],z:5},
 {name:"pointing",src:generated+"exec-4a657319-86bc-476b-8915-1bc3590026c5.png",source:[53,233,1176,819],target:[630,710,405,282],canvas:[1254,1254],z:5},
 {name:"grip",src:grip.src,source:[106,166,872,1200],target:[80,660,360,550],z:4},
 {name:"leg-left",src:legLeft.src,source:[337,119,336,1274],target:[367,1060,137,430],z:1},
 {name:"leg-right",src:legLeft.src,source:[337,119,336,1274],target:[367,1060,137,430],z:2},
 {name:"body",src:body.src,source:[54,454,915,778],target:[217,625,610,505],z:3},
 {name:"arm-left",src:armLeft.src,source:[130,271,826,992],target:[140,660,290,350],z:4},
 {name:"arm-right",src:armRight.src,source:[76,169,871,1078],target:[630,690,292,370],z:5},
 {name:"bow",src:bow.src,source:[210,526,632,480],target:[409,662,201,155],z:6},
 {name:"hood-back",src:hoodBack.src,source:[62,103,903,626],target:[140,95,748,530],z:7},
 {name:"hair-back",src:hairBack.src,source:[62,197,928,691],target:[190,165,650,490],z:8},
 {name:"face-base",src:faceBase.src,source:[191,400,642,694],target:[323,290,430,365],z:9},
 {name:"brows",src:brows.src,source:[226,368,571,77],target:[350,388,310,28],z:10},
 {name:"eye-left",src:eyeLeft.src,source:[205,526,627,433],target:[344,440,120,99],z:11},
 {name:"eye-right",src:eyeRight.src,source:[218,507,689,459],target:[554,440,120,99],z:11},
 {name:"mouth",src:mouth.src,source:[442,756,136,33],target:[488,573,43,9],z:12},
 {name:"hair-front",src:hairFront.src,source:[32,31,968,983],target:[200,15,625,645],z:13},
 {name:"lantern",src:lantern.src,source:[125,61,774,1380],target:[96,866,197,353],z:14},
];
// Nested SVG viewBoxes crop in source pixels, avoiding CSS background-position
// percentages (which are relative to the remaining space, not the source image).
function Layer({d}:{d:LayerDef}) {
 const [x,y,width,height]=d.target;
 return <svg x={x} y={y} width={width} height={height} viewBox={d.source.join(" ")} preserveAspectRatio="none" overflow="hidden" data-coral-part={d.name}>
  <image href={d.src} x="0" y="0" width={d.canvas?.[0]??W} height={d.canvas?.[1]??H}/>
 </svg>;
}
const part=(name:string)=><Layer key={name} d={LAYERS.find(d=>d.name===name)!}/>;
const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
// Reveal intact eye artwork with a lid mask. Never flatten the iris to blink.
function Eye({side,id}:{side:"left"|"right";id:string}){
 const x=side==="left"?344:554;
 return <g className={`coral-eye-turn coral-eye-turn-${side}`}>
  <defs><clipPath id={id}><rect x={x-4} y="437" width="128" height="105" className="coral-eye-mask"/></clipPath></defs>
  <g clipPath={`url(#${id})`}><g className="coral-eye-track">{part(`eye-${side}`)}</g></g>
  <path className="coral-lid" d={`M${x+8} 528 Q${x+60} 542 ${x+110} 528 m-3 2 8 -6`} fill="none" stroke="#463039" strokeWidth="5" strokeLinecap="round"/>
 </g>;
}
export function CoralImageRig2D({anim="idle",speed=0,perch="stand",facingAngleDeg,expression,blink,gazeX,gazeY,blush,turn,mouthOpen,mouthWide,mouthMood}:Props){
 const facing=(anim==="sit"||anim==="point"||perch==="sit")?0:facingAngleDeg??(["walk","run"].includes(anim)?(turn<-.05?-90:90):0);
 const {rig}=useCoralMotion(anim,speed,perch,facing,{expression,blink,gazeX,gazeY,mouthOpen,mouthWide,mouthMood}),id=useId().replace(/[^a-zA-Z0-9_-]/g,"");
 const sleepy=expression==="sleepy";
 const open=clamp(Math.max(mouthOpen,expression==="surprised"?.8:expression==="excited"?.35:0),0,1);
 const openness=blink||anim==="sleep"?0:sleepy?.62:expression==="annoyed"?.8:1;
 // The blank face is centred at x=538; the uploaded features were centred at 510.
 const gx=28,gy=0;
 return <svg ref={rig} className="coral-rig" viewBox="0 0 1024 1536" preserveAspectRatio="xMidYMax meet" aria-hidden="true" focusable="false" data-registration="source-pixels" data-eyes-closed={openness===0?"true":"false"}>
  <g className="coral-landing"><g className="coral-whole">
  <g className="coral-front-view">
  <g className="coral-body-motion">
   <g className="coral-standing-legs"><g className="coral-leg coral-leg-left"><g className="coral-leg-seat coral-leg-seat-left">{part("leg-left")}</g></g>
   {/* Both legs share one silhouette so calf and boot proportions match exactly. */}
   <g className="coral-leg coral-leg-right"><g className="coral-leg-seat coral-leg-seat-right"><g transform="translate(1044 0) scale(-1 1)">{part("leg-right")}</g></g></g></g>
   <g className="coral-arm coral-arm-left">{part("grip")}</g>
   <g className="coral-arm coral-arm-right"><g className="coral-rest-arm">{part("arm-right")}</g><g className="coral-point-arm">{part("pointing")}</g></g>
   <g className="coral-dress-settle">{part("body")}</g>
   <g className="coral-bow">{part("bow")}</g>
  </g>
  <g transform="translate(-20 0)"><g className="coral-head-action"><g className="coral-head">
   <g className="coral-head-volume"><g className="coral-hood-lag">{part("hood-back")}</g><g className="coral-hair-back-lag">{part("hair-back")}</g>{part("face-base")}</g>
   <g className="coral-face-turn"><g className="coral-features" style={{transform:`translate(${gx}px,${gy}px)`}}>
    <g className="coral-brows">{part("brows")}</g>
    <Eye side="left" id={`${id}-left`}/><Eye side="right" id={`${id}-right`}/>
    <g opacity={clamp(blush,0,1)*.3} fill="#f29785"><ellipse cx="385" cy="550" rx="33" ry="14"/><ellipse cx="650" cy="550" rx="33" ry="14"/></g>
    <g className="coral-mouth-closed"><path className="coral-mouth-curve" d="M490 578 Q510 590 531 578" fill="none" stroke="#8c5d4d" strokeWidth="3" strokeLinecap="round"/></g>
    <ellipse className="coral-mouth-open" cx="510" cy="578" rx="22" ry="26" fill="#763c40" stroke="#a36662" strokeWidth="3"/>
   </g>
   </g><g className="coral-hair-turn"><g className="coral-hair">{part("hair-front")}</g></g>
  </g></g>
  </g>
  </g>
  <ProfileRig openness={openness} mouthOpen={open}/>
  </g></g>
 </svg>;
}
