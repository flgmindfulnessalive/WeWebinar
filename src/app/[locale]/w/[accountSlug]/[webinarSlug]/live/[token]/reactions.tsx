"use client";

import { useCallback, useRef, useState } from "react";
import { useTranslations } from "next-intl";

// Facebook-Live-style tap reactions: a small emoji bar over the video: each
// tap records a `reaction` viewer_event (so Analytics can show who reacted
// and with what) and spawns a particle that rises and fades on this
// viewer's own screen. That's the ceiling of what "real-time" means here --
// nothing in this room syncs between different viewers' browsers (the chat
// and the "conectados" count are both local simulations too), so a
// reaction is a local effect for the person who sent it, not a broadcast
// other simultaneous viewers see.
const REACTION_EMOJIS = ["❤️", "👏", "😂", "😮", "👍"];
const PARTICLE_LIFETIME_MS = 2600;

type Particle = { id: number; emoji: string; jitterPx: number };

export function LiveReactions({ onReact }: { onReact: (emoji: string) => void }) {
  const t = useTranslations("LiveRoom");
  const [particles, setParticles] = useState<Particle[]>([]);
  const nextId = useRef(0);
  const reducedMotionRef = useRef<boolean | null>(null);

  const prefersReducedMotion = useCallback(() => {
    if (reducedMotionRef.current === null) {
      reducedMotionRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }
    return reducedMotionRef.current;
  }, []);

  const send = useCallback(
    (emoji: string) => {
      onReact(emoji);
      if (prefersReducedMotion()) return;
      const id = nextId.current++;
      setParticles((prev) => [...prev, { id, emoji, jitterPx: Math.random() * 28 - 14 }]);
      setTimeout(() => {
        setParticles((prev) => prev.filter((p) => p.id !== id));
      }, PARTICLE_LIFETIME_MS);
    },
    [onReact, prefersReducedMotion]
  );

  return (
    <>
      <div aria-hidden className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
        {particles.map((p) => (
          <span
            key={p.id}
            className="animate-float-up-fade absolute bottom-20 text-3xl drop-shadow-md"
            style={{ right: `${16 + p.jitterPx}px` }}
          >
            {p.emoji}
          </span>
        ))}
      </div>
      {/* Bottom-left, not bottom-right -- a link-style CTA in "fixed_button"
          mode already claims that corner (see CtaOverlay below), and the
          two can be active at the same time. */}
      <div className="absolute bottom-4 left-3 z-10 flex gap-1 rounded-full bg-black/60 p-1.5 backdrop-blur-sm sm:left-4">
        {REACTION_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => send(emoji)}
            aria-label={t("sendReaction", { emoji })}
            className="flex size-9 items-center justify-center rounded-full text-xl transition-transform hover:scale-110 hover:bg-white/10 active:scale-95"
          >
            {emoji}
          </button>
        ))}
      </div>
    </>
  );
}
