"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";

// Mismo patrón que WaitingRoomClient: ancla una sola vez contra el par
// (expiresAt, serverNow) que manda el servidor, después tickea solo con el
// tiempo transcurrido localmente desde el montaje -- nunca con el reloj
// absoluto del navegador, así un reloj desincronizado del visitante nunca
// alarga ni acorta la ventana real de 1 hora.
function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function OfferCountdown({
  expiresAt,
  serverNow,
  onExpire,
}: {
  expiresAt: string;
  serverNow: string;
  onExpire: () => void;
}) {
  const t = useTranslations("DemoOffer");
  const initialRemainingMs = useMemo(
    () => new Date(expiresAt).getTime() - new Date(serverNow).getTime(),
    [expiresAt, serverNow]
  );
  const [mountedAt] = useState(() => Date.now());
  const [remainingMs, setRemainingMs] = useState(initialRemainingMs);

  useEffect(() => {
    if (initialRemainingMs <= 0) {
      onExpire();
      return;
    }
    const interval = setInterval(() => {
      const remaining = initialRemainingMs - (Date.now() - mountedAt);
      setRemainingMs(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        onExpire();
      }
    }, 500);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialRemainingMs, mountedAt]);

  return (
    <div className="flex flex-col items-center gap-1">
      <span className="font-mono text-4xl font-bold tabular-nums" style={{ color: "var(--brand)" }}>
        {formatCountdown(remainingMs)}
      </span>
      <span className="text-xs tracking-wide text-muted-foreground uppercase">{t("countdownLabel")}</span>
    </div>
  );
}
