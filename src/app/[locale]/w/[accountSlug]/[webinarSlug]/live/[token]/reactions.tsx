"use client";

import { useCallback, useRef, useState } from "react";
import { useTranslations } from "next-intl";

// Facebook-Live-style tap reactions: a collapsed circular launcher over the
// video that reveals an emoji fan on hover (desktop) or tap (touch): each
// send records a `reaction` viewer_event (so Analytics can show who reacted
// and with what) and spawns a particle that rises and fades on this
// viewer's own screen. That's the ceiling of what "real-time" means here --
// nothing in this room syncs between different viewers' browsers (the chat
// and the "conectados" count are both local simulations too), so a
// reaction is a local effect for the person who sent it, not a broadcast
// other simultaneous viewers see.
const REACTION_EMOJIS = ["❤️", "👏", "😂", "😮", "👍"];
const PARTICLE_LIFETIME_MS = 2600;
const FAN_STAGGER_MS = 40;

type Particle = { id: number; emoji: string; jitterPx: number };

export function LiveReactions({ onReact }: { onReact: (emoji: string) => void }) {
  const t = useTranslations("LiveRoom");
  const [particles, setParticles] = useState<Particle[]>([]);
  const [open, setOpen] = useState(false);
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
          two can be active at the same time.
          Collapsed by default: a translucent circle that reveals the emoji
          fan on hover/focus (desktop, via CSS `group-*`) or on tap (touch,
          via the `open` state) instead of a bar that's always on screen. */}
      <div
        className="group absolute bottom-4 left-3 z-10 flex items-center sm:left-4"
        onMouseLeave={() => setOpen(false)}
      >
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label={t("openReactions")}
          aria-expanded={open}
          className="flex size-[42px] shrink-0 items-center justify-center rounded-full border border-white/30 bg-white/10 backdrop-blur-sm transition-colors hover:border-white/40 hover:bg-white/20 group-focus-within:border-white/40 group-focus-within:bg-white/20"
        >
          <svg viewBox="0 0 24 24" className="size-[19px] fill-none stroke-white" strokeWidth={1.6}>
            <path d="M12 21s-7-4.35-9.5-8.5C.5 8.5 3 5 6.5 5 9 5 11 7 12 8.5 13 7 15 5 17.5 5 21 5 23.5 8.5 21.5 12.5 19 16.85 12 21 12 21z" />
          </svg>
        </button>
        <div
          className={`flex items-center overflow-hidden rounded-full transition-all duration-300 ease-out ${
            open
              ? "ml-2 max-w-[280px] opacity-100"
              : "ml-0 max-w-0 opacity-0 group-focus-within:ml-2 group-focus-within:max-w-[280px] group-focus-within:opacity-100 group-hover:ml-2 group-hover:max-w-[280px] group-hover:opacity-100"
          }`}
        >
          <div className="flex items-center gap-0.5 rounded-full border border-white/30 bg-white/10 p-1 backdrop-blur-sm">
            {REACTION_EMOJIS.map((emoji, i) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  send(emoji);
                  setOpen(false);
                }}
                aria-label={t("sendReaction", { emoji })}
                style={{ transitionDelay: open ? `${i * FAN_STAGGER_MS}ms` : "0ms" }}
                className={`flex size-8 shrink-0 scale-75 items-center justify-center rounded-full text-lg opacity-0 transition-all duration-150 hover:scale-125 hover:bg-white/15 active:scale-95 ${
                  open
                    ? "scale-100 opacity-100"
                    : "group-focus-within:scale-100 group-focus-within:opacity-100 group-hover:scale-100 group-hover:opacity-100"
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
