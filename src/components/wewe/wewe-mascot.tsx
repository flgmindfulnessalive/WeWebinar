"use client";

import { useEffect, useId, useRef } from "react";

const MOVES = ["wewe-move-breathe", "wewe-move-tilt", "wewe-move-hop"] as const;
type Move = (typeof MOVES)[number];
const MOVE_DURATION_MS: Record<Move, number> = {
  "wewe-move-breathe": 2800,
  "wewe-move-tilt": 2400,
  "wewe-move-hop": 900,
};

// Wewe, the Support Agent's mascot. `idle` drives the random-movement loop
// (see globals.css for the keyframes) -- pass false for small avatars that
// appear many at once in the message list, so the transcript doesn't turn
// into a wall of bouncing icons; the bubble and panel-header instance keep
// it on. Blink timing is desynced per instance (random negative delay) so
// multiple Wewes on screen don't blink in lockstep.
export function WeweMascot({ className, idle = true }: { className?: string; idle?: boolean }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const eyes = el.querySelectorAll<HTMLElement>(".wewe-eye");
    const blinkDelay = `${(-(Math.random() * 4)).toFixed(2)}s`;
    eyes.forEach((eye) => {
      eye.style.animationDelay = blinkDelay;
    });

    if (!idle) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let timer: ReturnType<typeof setTimeout>;
    function cycle() {
      const move = MOVES[Math.floor(Math.random() * MOVES.length)];
      MOVES.forEach((m) => el!.classList.remove(m));
      void el!.offsetWidth; // reflow, so re-adding the same class restarts it
      el!.classList.add(move);
      const pause = 1200 + Math.random() * 2200;
      timer = setTimeout(cycle, MOVE_DURATION_MS[move] + pause);
    }
    timer = setTimeout(cycle, 500 + Math.random() * 1500);
    return () => clearTimeout(timer);
  }, [idle]);

  const shellId = `wewe-shell-${uid}`;
  const rimId = `wewe-rim-${uid}`;
  const antennaId = `wewe-antenna-${uid}`;

  return (
    <div ref={ref} className={className} aria-hidden="true">
      <svg viewBox="0 0 200 200" className="block size-full overflow-visible">
        <defs>
          <radialGradient id={shellId} cx="35%" cy="28%" r="75%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="55%" stopColor="#f6f7fb" />
            <stop offset="100%" stopColor="#e2e4ef" />
          </radialGradient>
          <linearGradient id={rimId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#4f46e5" />
            <stop offset="100%" stopColor="#c026d3" />
          </linearGradient>
          <linearGradient id={antennaId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c026d3" />
            <stop offset="100%" stopColor="#4f46e5" />
          </linearGradient>
        </defs>
        <circle cx="100" cy="108" r="76" fill={`url(#${shellId})`} />
        <path
          d="M32,132 A76,76 0 0 0 168,132"
          fill="none"
          stroke={`url(#${rimId})`}
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.5"
        />
        <ellipse cx="72" cy="70" rx="30" ry="17" fill="#ffffff" opacity="0.6" />
        <path d="M26,120 Q100,140 174,120" fill="none" stroke="#e7e9f4" strokeWidth="2" opacity="0.65" />
        <line x1="100" y1="32" x2="100" y2="14" stroke="#d7d8e6" strokeWidth="4" strokeLinecap="round" />
        <circle className="wewe-antenna-tip" cx="100" cy="12" r="7" fill={`url(#${antennaId})`} />
        <circle cx="61" cy="122" r="7" fill="#ffb4c6" opacity="0.5" />
        <circle cx="139" cy="122" r="7" fill="#ffb4c6" opacity="0.5" />
        <rect className="wewe-eye" x="70" y="92" width="16" height="24" rx="8" fill="#4338ca" />
        <rect className="wewe-eye" x="114" y="92" width="16" height="24" rx="8" fill="#4338ca" />
        <circle cx="75" cy="98" r="2.6" fill="#ffffff" opacity="0.95" />
        <circle cx="119" cy="98" r="2.6" fill="#ffffff" opacity="0.95" />
        <path d="M91,133 Q100,139 109,133" fill="none" stroke="#a7a3c9" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    </div>
  );
}
