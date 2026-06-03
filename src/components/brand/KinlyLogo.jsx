import React from "react";
import { cn } from "@/lib/utils";

export default function KinlyLogo({ showWordmark = true, className = "", markClassName = "" }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <svg
        viewBox="0 0 72 72"
        aria-hidden="true"
        className={cn("h-9 w-9 shrink-0", markClassName)}
      >
        <defs>
          <linearGradient id="kinlyMarkWarm" x1="12" y1="10" x2="44" y2="62" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FFB24C" />
            <stop offset="1" stopColor="#FF7B72" />
          </linearGradient>
          <linearGradient id="kinlyMarkBlue" x1="58" y1="8" x2="26" y2="58" gradientUnits="userSpaceOnUse">
            <stop stopColor="#6FA6F7" />
            <stop offset="1" stopColor="#5B8DEF" />
          </linearGradient>
          <linearGradient id="kinlyMarkGreen" x1="24" y1="38" x2="46" y2="62" gradientUnits="userSpaceOnUse">
            <stop stopColor="#7BC9A1" />
            <stop offset="1" stopColor="#55B98D" />
          </linearGradient>
        </defs>

        <circle cx="18" cy="15" r="7.5" fill="url(#kinlyMarkWarm)" />
        <circle cx="54" cy="15" r="7.5" fill="url(#kinlyMarkBlue)" />

        <path
          d="M16.5 28.5C8.2 36.6 10.2 51.8 21.5 59.4L33.1 67.2C34.8 68.3 37.2 68.3 38.9 67.2L50.5 59.4C61.8 51.8 63.8 36.6 55.5 28.5C49 22.2 38.7 23.7 36 33.2C33.3 23.7 23 22.2 16.5 28.5Z"
          fill="url(#kinlyMarkWarm)"
        />
        <path
          d="M55.5 28.5C49 22.2 38.7 23.7 36 33.2C34.5 28 31 25.1 27 24.2L25.2 43.9L36 59.8L50.5 59.4C61.8 51.8 63.8 36.6 55.5 28.5Z"
          fill="url(#kinlyMarkBlue)"
          opacity="0.92"
        />
        <path
          d="M20.2 45.5C21.4 51 25.5 56.1 31.5 60.1L33.1 61.2C34.8 62.3 37.2 62.3 38.9 61.2L40.7 60.1C44.7 57.4 48 54.2 50 50.7C44.2 48.2 39.6 43.9 36 38C31.6 45.2 25.8 49.4 20.2 52.1C19.5 49.8 19.5 47.6 20.2 45.5Z"
          fill="url(#kinlyMarkGreen)"
        />
        <path
          d="M36 51.5L29.5 46.8C25.9 44.2 25.5 38.8 28.8 35.9C31.2 33.8 34.8 34.4 36 38C37.2 34.4 40.8 33.8 43.2 35.9C46.5 38.8 46.1 44.2 42.5 46.8L36 51.5Z"
          fill="#F8F7F4"
          opacity="0.96"
        />
      </svg>

      {showWordmark && (
        <span className="kinly-wordmark text-3xl font-semibold leading-none tracking-normal">
          Kinely
        </span>
      )}
    </div>
  );
}
