/* eslint-disable react-hooks/set-state-in-effect */
// frontend/src/hooks/useReservationTimer.ts
"use client";

import { useEffect, useState } from "react";

export function useReservationTimer(
  expiresAt?: string,
  onElapsed?: () => void
) {
  const [remainingMs, setRemainingMs] = useState<number | null>(null);

  useEffect(() => {
    if (!expiresAt) {
      setRemainingMs(null);
      return;
    }

    const target = new Date(expiresAt).getTime();
    let last = Math.max(target - Date.now(), 0);

    const tick = () => {
      const now = Date.now();
      const diff = target - now;
      const next = diff > 0 ? diff : 0;

      setRemainingMs(next);

      // fire callback once when going from >0 to 0
      if (last > 0 && next === 0 && onElapsed) {
        onElapsed();
      }

      last = next;
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt, onElapsed]);

  const totalSeconds =
    remainingMs !== null ? Math.floor(remainingMs / 1000) : null;

  const mm =
    totalSeconds !== null
      ? String(Math.floor(totalSeconds / 60)).padStart(2, "0")
      : "--";
  const ss =
    totalSeconds !== null ? String(totalSeconds % 60).padStart(2, "0") : "--";

  return { remainingMs, mm, ss };
}
