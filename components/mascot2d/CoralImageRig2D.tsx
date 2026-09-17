"use client";
import type {CSSProperties} from "react";
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
function Layer({d}:{d:LayerDef}){const [sx,sy,sw,sh]=d.source,[tx,ty,tw,th]=d.target;const frame={left:`${tx/W*100}%`,top:`${ty/H*100}%`,width:`${tw/W*100}%`,height:`${th/H*100}%`,zIndex:d.z} as CSSProperties;const image={left:`${-sx/sw*100}%`,top:`${-sy/sh*100}%`,width:`${W/sw*100}%`,height:`${H/sh*100}%`} as CSSProperties;return <div className={`coral-manifest-layer ${d.className??""}`} data-layer={d.name} style={frame}><img src={d.src} alt="" draggable={false} style={image}/></div>}
export function CoralImageRig2D(_props:Props){return <div className="coral-rig" aria-hidden="true" data-registration="manifest">{LAYERS.map(d=><Layer key={d.name} d={d}/>)}</div>}
