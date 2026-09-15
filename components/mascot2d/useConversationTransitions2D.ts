"use client";
import {useEffect,useRef,useState} from "react";
export type ConversationPhase="idle"|"notice"|"listen"|"anticipate"|"speak-in"|"speak"|"settle";
export type ConversationTransition={phase:ConversationPhase;notice:number;anticipate:number;speakIn:number;settle:number};
type Input={speaking:boolean;listening:boolean};
const ZERO:ConversationTransition={phase:"idle",notice:0,anticipate:0,speakIn:0,settle:0};
export function useConversationTransitions2D({speaking,listening}:Input){const [state,setState]=useState<ConversationTransition>(ZERO),prev=useRef({speaking:false,listening:false});
 useEffect(()=>{const before=prev.current;prev.current={speaking,listening};const timers:number[]=[];const later=(ms:number,fn:()=>void)=>timers.push(window.setTimeout(fn,ms));
  if(speaking){setState({phase:"speak-in",notice:0,anticipate:0,speakIn:1,settle:0});later(180,()=>setState({phase:"speak",notice:0,anticipate:0,speakIn:0,settle:0}))}
  else if(listening){if(!before.listening&&before.speaking){setState({phase:"settle",notice:0,anticipate:0,speakIn:0,settle:1});later(260,()=>setState({phase:"listen",notice:0,anticipate:0,speakIn:0,settle:0}))}else if(!before.listening){setState({phase:"notice",notice:1,anticipate:0,speakIn:0,settle:0});later(220,()=>setState({phase:"listen",notice:0,anticipate:0,speakIn:0,settle:0}))}else setState(s=>s.phase==="notice"?s:{phase:"listen",notice:0,anticipate:0,speakIn:0,settle:0})}
  else if(before.listening&&!before.speaking){setState({phase:"anticipate",notice:0,anticipate:1,speakIn:0,settle:0});later(520,()=>setState({phase:"idle",notice:0,anticipate:0,speakIn:0,settle:0}))}
  else if(before.speaking){setState({phase:"settle",notice:0,anticipate:0,speakIn:0,settle:1});later(320,()=>setState(ZERO))}
  else setState(ZERO);
  return()=>timers.forEach(clearTimeout)
 },[speaking,listening]);return state}
