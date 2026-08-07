"use client";

import { useEffect, useRef } from "react";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  w: number;
  h: number;
  rot: number;
  vr: number;
};

const COLORS = ["#f0a090", "#efc07a", "#f8c4b8", "#fff", "#e8a598", "#d4847a"];

export function fireConfetti(durationMs = 1800) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("animenexus:confetti", { detail: { durationMs } }),
  );
}

export function ConfettiHost() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let particles: Particle[] = [];
    let raf = 0;
    let running = false;

    function resize() {
      canvas!.width = window.innerWidth;
      canvas!.height = window.innerHeight;
    }

    function spawn(n = 80) {
      const w = canvas!.width;
      for (let i = 0; i < n; i++) {
        particles.push({
          x: w * 0.5 + (Math.random() - 0.5) * w * 0.4,
          y: -20 - Math.random() * 40,
          vx: (Math.random() - 0.5) * 8,
          vy: 2 + Math.random() * 6,
          life: 1,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          w: 4 + Math.random() * 6,
          h: 6 + Math.random() * 8,
          rot: Math.random() * Math.PI,
          vr: (Math.random() - 0.5) * 0.3,
        });
      }
    }

    function tick() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles = particles.filter((p) => p.life > 0.02);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.12;
        p.vx *= 0.99;
        p.rot += p.vr;
        p.life -= 0.012;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      if (particles.length) {
        raf = requestAnimationFrame(tick);
      } else {
        running = false;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }

    function onBurst(e: Event) {
      const detail = (e as CustomEvent).detail as { durationMs?: number };
      resize();
      spawn(90);
      if (!running) {
        running = true;
        raf = requestAnimationFrame(tick);
      }
      window.setTimeout(() => {
        particles.forEach((p) => {
          p.life = Math.min(p.life, 0.3);
        });
      }, detail?.durationMs ?? 1800);
    }

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("animenexus:confetti", onBurst);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("animenexus:confetti", onBurst);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1500,
        pointerEvents: "none",
      }}
    />
  );
}
