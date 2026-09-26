"use client";

import { useEffect } from "react";

export function DetailCinematography() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".cinema-detail-page");
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    let tx = innerWidth / 2, x = tx, ty = innerHeight / 2, y = ty;
    const update = () => {
      raf = 0;
      x += (tx - x) * .07;
      y += (ty - y) * .07;
      root.style.setProperty("--detail-pointer-x", (x / innerWidth * 100) + "%");
      root.style.setProperty("--detail-pointer-y", (y / innerHeight * 100) + "%");
      root.style.setProperty("--detail-pointer-dx", ((x / innerWidth - .5) * 16) + "px");
      root.style.setProperty("--detail-pointer-dy", ((y / innerHeight - .5) * 10) + "px");
      if (Math.abs(tx-x)>.4 || Math.abs(ty-y)>.4) raf=requestAnimationFrame(update);
    };
    const pointer=(e:PointerEvent)=>{tx=e.clientX;ty=e.clientY;if(!raf)raf=requestAnimationFrame(update)};
    addEventListener("pointermove",pointer,{passive:true});
    update();
    const sections=Array.from(root.querySelectorAll<HTMLElement>(".detail-section"));
    const observer=new IntersectionObserver(entries=>entries.forEach(e=>e.target.classList.toggle("is-detail-active",e.isIntersecting)),{threshold:.16});
    sections.forEach(s=>observer.observe(s));
    return()=>{removeEventListener("pointermove",pointer);if(raf)cancelAnimationFrame(raf);observer.disconnect()};
  },[]);
  return null;
}
