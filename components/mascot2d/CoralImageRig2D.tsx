"use client";
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
import brows from "./brows.png";
import eyeLeft from "./eye-left.png";
import eyeRight from "./eye-right.png";
import mouth from "./mouth.png";
import "./coral-image-rig.css";

type Rect=[number,number,number,number];
type Props={expression:string;blink:boolean;gazeX:number;gazeY:number;blush:number;turn:number;mouthOpen:number;mouthWide:number;mouthMood:number};
type LayerDef={name:string;src:string;source:Rect;target:Rect;z:number;className?:string};
const W=1024,H=1536;
const LAYERS:LayerDef[]=[
 {name:"leg-left",src:legLeft.src,source:[337,119,336,1274],target:[367,1060,137,430],z:1},
 {name:"leg-right",src:legRight.src,source:[346,82,336,1333],target:[540,1060,137,430],z:2},
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
 {name:"lantern",src:lantern.src,source:[125,61,774,1380],target:[96,848,197,353],z:14},
];
// Nested SVG viewBoxes crop in source pixels, avoiding CSS background-position
// percentages (which are relative to the remaining space, not the source image).
function Layer({d}:{d:LayerDef}) {
 const [x,y,width,height]=d.target;
 return <svg x={x} y={y} width={width} height={height} viewBox={d.source.join(" ")} preserveAspectRatio="none" overflow="hidden" data-coral-part={d.name}>
  <image href={d.src} x="0" y="0" width={W} height={H}/>
 </svg>;
}
const part=(name:string)=><Layer key={name} d={LAYERS.find(d=>d.name===name)!}/>;
const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
export function CoralImageRig2D({expression,blink,gazeX,gazeY,blush,turn,mouthOpen,mouthWide,mouthMood}:Props){
 const sleepy=expression==="sleepy",sad=["sad","scared"].includes(expression),happy=["happy","excited","proud","smug","mischievous"].includes(expression);
 const open=clamp(Math.max(mouthOpen,expression==="surprised"?.8:expression==="excited"?.35:0),0,1);
 const eyeScale=blink?.04:sleepy?.55:expression==="annoyed"?.75:1;
 const gx=clamp(gazeX,-6,6)*1.3+clamp(turn,-.6,.6)*8,gy=clamp(gazeY,-5,5);
 return <svg className="coral-rig" viewBox="0 0 1024 1536" preserveAspectRatio="xMidYMax meet" aria-hidden="true" focusable="false" data-registration="source-pixels">
  <g className="coral-body-motion">
   <g className="coral-leg coral-leg-left">{part("leg-left")}</g>
   <g className="coral-leg coral-leg-right">{part("leg-right")}</g>
   <g className="coral-arm coral-arm-left">{part("arm-left")}{part("lantern")}</g>
   <g className="coral-arm coral-arm-right">{part("arm-right")}</g>
   {part("body")}
   <g className="coral-bow">{part("bow")}</g>
  </g>
  <g className="coral-head">
   {part("hood-back")}{part("hair-back")}{part("face-base")}
   <g transform={`translate(${gx} ${gy})`}>
    <g transform={`translate(0 ${sad?8:0})`}>{part("brows")}</g>
    <g transform={`translate(0 490) scale(1 ${eyeScale}) translate(0 -490)`}>{part("eye-left")}{part("eye-right")}</g>
    <g opacity={clamp(blush,0,1)*.3} fill="#f29785"><ellipse cx="385" cy="550" rx="33" ry="14"/><ellipse cx="650" cy="550" rx="33" ry="14"/></g>
    {open>.08?<ellipse cx="510" cy="578" rx={12+clamp(mouthWide,0,1)*12} ry={5+open*22} fill="#763c40" stroke="#a36662" strokeWidth="3"/>:sad||mouthMood<-.4?<path d="M490 582 Q510 566 531 581" fill="none" stroke="#8c5d4d" strokeWidth="3" strokeLinecap="round"/>:<g transform={`translate(510 578) scale(${happy?1.15:1} 1) translate(-510 -578)`}>{part("mouth")}</g>}
   </g>
   <g className="coral-hair">{part("hair-front")}</g>
  </g>
 </svg>;
}
