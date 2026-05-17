import React from "react";
import { cn } from "@/lib/utils";

export default function KinlyLogo({ showWordmark = true, className = "", markClassName = "" }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <svg
        viewBox="0 0 64 64"
        aria-hidden="true"
        className={cn("h-10 w-10 shrink-0", markClassName)}
      >
        <defs>
          <linearGradient id="kinlyBlue" x1="14" y1="6" x2="46" y2="58" gradientUnits="userSpaceOnUse">
            <stop stopColor="#5B8DEF" />
            <stop offset="1" stopColor="#8E7BFF" />
          </linearGradient>
          <linearGradient id="kinlyWarm" x1="50" y1="8" x2="20" y2="56" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FFD166" />
            <stop offset="1" stopColor="#FF7B72" />
          </linearGradient>
          <linearGradient id="kinlyGreen" x1="12" y1="28" x2="46" y2="56" gradientUnits="userSpaceOnUse">
            <stop stopColor="#7BC9A1" />
            <stop offset="1" stopColor="#5B8DEF" />
          </linearGradient>
        </defs>
        <circle cx="22" cy="14" r="7" fill="url(#kinlyBlue)" />
        <circle cx="44" cy="14" r="7" fill="url(#kinlyWarm)" />
        <path
          d="M15.7 25.2C8.6 31.9 9.4 44.1 17.3 50.1L31.9 61 46.7 50.1C54.6 44.1 55.4 31.9 48.3 25.2C42.8 20 34.1 20.9 32 27.8C29.9 20.9 21.2 20 15.7 25.2Z"
          fill="url(#kinlyGreen)"
        />
        <path
          d="M31.9 52.3L23.2 45.8C18.1 42 17.6 34.2 22.1 30.1C25.4 27 30.6 27.7 31.9 32.2C33.3 27.7 38.5 27 41.8 30.1C46.3 34.2 45.8 42 40.7 45.8L31.9 52.3Z"
          fill="#F8F7F4"
          opacity="0.96"
        />
      </svg>

      {showWordmark && (
        <div className="leading-none">
          <p className="font-heading text-2xl font-black tracking-tight text-[#12203A]">kinly</p>
          <p className="mt-1 hidden text-[10px] font-bold tracking-[0.18em] text-slate-400 sm:block">
            CONNECTED HOMES
          </p>
        </div>
      )}
    </div>
  );
}
