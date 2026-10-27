"use client";

import { useEffect, useState } from "react";

const COLORS = ["#12a59b", "#f6a01a", "#ff5a5f", "#6b3fa0", "#149fc4"];

/** Festejo breve la primera vez que se ve una propuesta (una vez por propuesta y navegador). */
export function Confetti({ id }: { id: string }) {
  const [pieces, setPieces] = useState<{ left: number; delay: number; dur: number; color: string; round: boolean }[]>([]);
  useEffect(() => {
    const key = `viora-confetti-${id}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // sin almacenamiento: se muestra igual
    }
    const t = setTimeout(
      () =>
        setPieces(
          Array.from({ length: 70 }, (_, i) => ({
            left: Math.random() * 100,
            delay: Math.random() * 0.8,
            dur: 2.2 + Math.random() * 1.6,
            color: COLORS[i % COLORS.length],
            round: i % 3 === 0,
          })),
        ),
      0,
    );
    const end = setTimeout(() => setPieces([]), 5000);
    return () => {
      clearTimeout(t);
      clearTimeout(end);
    };
  }, [id]);
  if (!pieces.length) return null;
  return (
    <div className="confetti" aria-hidden>
      {pieces.map((c, i) => (
        <i key={i} style={{ left: `${c.left}%`, animationDelay: `${c.delay}s`, animationDuration: `${c.dur}s`, background: c.color, borderRadius: c.round ? "50%" : "2px" }} />
      ))}
    </div>
  );
}
