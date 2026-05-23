import React, { useEffect } from "react";
import {
  PartyPopper,
  Sparkles,
  Trophy,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function RewardCelebrationOverlay({ celebration, onClose }) {
  useEffect(() => {
    if (!celebration) return;

    const timer = window.setTimeout(() => {
      onClose?.();
    }, 2800);

    return () => window.clearTimeout(timer);
  }, [celebration, onClose]);

  if (!celebration) return null;

  const isFamily = celebration.type === "family";

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center px-4">
      <button
        type="button"
        aria-label="Close celebration"
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/20 backdrop-blur-[2px]"
      />

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {Array.from({ length: 16 }).map((_, index) => (
          <Sparkles
            key={index}
            className={cn(
              "absolute h-5 w-5 animate-pulse text-accent",
              index % 2 === 0 && "text-primary",
              index % 3 === 0 && "text-amber-500"
            )}
            style={{
              left: `${8 + ((index * 17) % 84)}%`,
              top: `${10 + ((index * 23) % 76)}%`,
              animationDelay: `${index * 90}ms`,
            }}
          />
        ))}
      </div>

      <div className="relative w-full max-w-md animate-in zoom-in-95 fade-in-0 duration-300">
        <div className="relative overflow-hidden rounded-[2.25rem] border border-white/80 bg-white/92 p-6 text-center shadow-[0_30px_90px_rgba(15,23,42,0.28)] backdrop-blur-2xl">
          <div className="absolute -left-16 -top-16 h-44 w-44 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -bottom-16 -right-16 h-44 w-44 rounded-full bg-accent/15 blur-3xl" />

          <div className="relative">
            <div className="mx-auto flex h-24 w-24 animate-bounce items-center justify-center rounded-[2rem] bg-gradient-to-br from-amber-100 via-orange-100 to-white shadow-inner">
              {isFamily ? (
                <PartyPopper className="h-12 w-12 text-amber-600" />
              ) : (
                <Trophy className="h-12 w-12 text-amber-600" />
              )}
            </div>

            <p className="mt-5 text-xs font-black uppercase tracking-[0.24em] text-accent">
              Reward unlocked
            </p>

            <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
              {celebration.title}
            </h2>

            <p className="mt-2 text-sm font-bold leading-6 text-slate-500">
              {celebration.message}
            </p>

            <Button
              type="button"
              onClick={onClose}
              className="pointer-events-auto mt-5 rounded-2xl font-black"
            >
              Awesome
            </Button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="pointer-events-auto absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-slate-50 text-slate-400 transition hover:bg-white hover:text-slate-900 hover:shadow-sm"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
