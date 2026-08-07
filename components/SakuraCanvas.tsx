"use client";

import { useEffect, useRef } from "react";

type Petal = {
  x: number;
  y: number;
  r: number;
  speed: number;
  drift: number;
  rot: number;
  rotSpeed: number;
  alpha: number;
};

export function SakuraCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    let w = 0;
    let h = 0;
    let raf = 0;
    const petals: Petal[] = [];
    const baseN =
      typeof navigator !== "undefined" && navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4
        ? 16
        : 28;

    function speedMul() {
      const s = document.documentElement.dataset.session;
      if (s === "tonight") return 0.65;
      if (s === "break") return 0.45;
      return 1;
    }

    function alphaMul() {
      const s = document.documentElement.dataset.session;
      if (s === "tonight") return 1.15;
      if (s === "break") return 0.55;
      return 1;
    }

    function resize() {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas!.width = w;
      canvas!.height = h;
    }

    function spawn(p?: Partial<Petal>): Petal {
      return {
        x: Math.random() * w,
        y: Math.random() * h - h * 0.2,
        r: 4 + Math.random() * 6,
        speed: 0.4 + Math.random() * 1.2,
        drift: -0.4 + Math.random() * 0.8,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: -0.02 + Math.random() * 0.04,
        alpha: 0.15 + Math.random() * 0.35,
        ...p,
      };
    }

    resize();
    for (let i = 0; i < baseN; i++) petals.push(spawn());

    function tick() {
      ctx!.clearRect(0, 0, w, h);
      const sm = speedMul();
      const am = alphaMul();
      for (const p of petals) {
        p.y += p.speed * sm;
        p.x += (p.drift + Math.sin(p.y * 0.01) * 0.3) * sm;
        p.rot += p.rotSpeed;
        if (p.y > h + 20) {
          Object.assign(p, spawn({ y: -20, x: Math.random() * w }));
        }
        ctx!.save();
        ctx!.translate(p.x, p.y);
        ctx!.rotate(p.rot);
        ctx!.fillStyle = `rgba(240, 160, 144, ${p.alpha * am})`;
        ctx!.beginPath();
        ctx!.ellipse(0, 0, p.r, p.r * 0.55, 0, 0, Math.PI * 2);
        ctx!.fill();
        ctx!.restore();
      }
      raf = requestAnimationFrame(tick);
    }

    const onResize = () => resize();
    window.addEventListener("resize", onResize);
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <canvas
      id="sakuraCanvas"
      ref={ref}
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
        opacity: 0.85,
      }}
    />
  );
}
