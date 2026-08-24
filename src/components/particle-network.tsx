"use client";

import { useEffect, useRef } from "react";

const LINK_DISTANCE = 130;
const MOUSE_LINK_DISTANCE = 180;
const SPEED = 0.15;

type Particle = { x: number; y: number; vx: number; vy: number };

// Canvas-based "constellation" network -- small dots drifting slowly,
// connected by thin lines when close to each other, plus extra lines
// reaching toward the cursor so the whole thing visibly reacts to mouse
// movement. Zero dependencies (no particles.js/tsparticles), matching how
// the marketing hero's other background effects (GradientBlobs,
// MouseSpotlight) are built. Shared between the login page's dark panel
// (denser, more prominent) and the marketing home hero (sparser, subtler
// -- an accent detail, not a dominant background), tuned via props rather
// than two near-duplicate components.
export function ParticleNetwork({
  color = "148, 163, 255", // rgb triplet, no alpha -- soft indigo by default
  particleCount = 70,
  opacity = 1,
}: {
  color?: string;
  particleCount?: number;
  opacity?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let particles: Particle[] = [];
    let mouse: { x: number; y: number } | null = null;
    let raf = 0;

    function resize() {
      const rect = canvas!.getBoundingClientRect();
      dpr = window.devicePixelRatio || 1;
      width = rect.width;
      height = rect.height;
      canvas!.width = width * dpr;
      canvas!.height = height * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function seed() {
      particles = Array.from({ length: particleCount }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * SPEED,
        vy: (Math.random() - 0.5) * SPEED,
      }));
    }

    function step() {
      ctx!.clearRect(0, 0, width, height);

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;
        p.x = Math.min(Math.max(p.x, 0), width);
        p.y = Math.min(Math.max(p.y, 0), height);
      }

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i];
          const b = particles[j];
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          if (dist < LINK_DISTANCE) {
            ctx!.strokeStyle = `rgba(${color}, ${0.25 * (1 - dist / LINK_DISTANCE) * opacity})`;
            ctx!.beginPath();
            ctx!.moveTo(a.x, a.y);
            ctx!.lineTo(b.x, b.y);
            ctx!.stroke();
          }
        }

        if (mouse) {
          const dist = Math.hypot(particles[i].x - mouse.x, particles[i].y - mouse.y);
          if (dist < MOUSE_LINK_DISTANCE) {
            ctx!.strokeStyle = `rgba(${color}, ${0.5 * (1 - dist / MOUSE_LINK_DISTANCE) * opacity})`;
            ctx!.beginPath();
            ctx!.moveTo(particles[i].x, particles[i].y);
            ctx!.lineTo(mouse.x, mouse.y);
            ctx!.stroke();
          }
        }
      }

      ctx!.fillStyle = `rgba(${color}, ${0.8 * opacity})`;
      for (const p of particles) {
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, 1.6, 0, Math.PI * 2);
        ctx!.fill();
      }

      raf = requestAnimationFrame(step);
    }

    function handleMove(e: PointerEvent) {
      const rect = canvas!.getBoundingClientRect();
      mouse = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }
    function handleLeave() {
      mouse = null;
    }

    resize();
    seed();
    raf = requestAnimationFrame(step);

    window.addEventListener("resize", resize);
    canvas.addEventListener("pointermove", handleMove);
    canvas.addEventListener("pointerleave", handleLeave);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("pointermove", handleMove);
      canvas.removeEventListener("pointerleave", handleLeave);
    };
  }, [color, particleCount, opacity]);

  return <canvas ref={canvasRef} aria-hidden className="absolute inset-0 size-full" />;
}
