import Image from "next/image";

// The mark to the left of the name, and the name itself with "We" in cyan.
// One component because it sits on every WeFunnels surface and the approved
// package is explicit that it is a symbol with an alpha channel rather than
// a generic icon: a box of black behind it on a dark blue ground is the
// failure this guards against.
export function Wordmark({
  size = "md",
  className = "",
}: {
  size?: "sm" | "md";
  className?: string;
}) {
  const mark = size === "sm" ? { w: 48, h: 27 } : { w: 64, h: 36 };
  const text = size === "sm" ? "text-[20px]" : "text-[25px]";

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <Image
        src="/brand/wefunnels-mark.png"
        alt=""
        width={mark.w}
        height={mark.h}
        className="object-contain"
        priority
      />
      <span className={`${text} font-bold tracking-[-0.04em] whitespace-nowrap`}>
        <span className="text-[var(--wf-accent)]">We</span>Funnels
      </span>
    </div>
  );
}
