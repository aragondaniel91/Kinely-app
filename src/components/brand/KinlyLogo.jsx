import React from "react";
import { cn } from "@/lib/utils";

export default function KinlyLogo({ showWordmark = true, className = "", markClassName = "" }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <svg
        viewBox="0 0 72 72"
        aria-hidden="true"
        className={cn("h-11 w-11 shrink-0", markClassName)}
      >
        <defs>
          <linearGradient id="kinlyBlue" x1="25" y1="6" x2="55" y2="52" gradientUnits="userSpaceOnUse">
            <stop stopColor="#6EA6F7" />
            <stop offset="1" stopColor="#5B8DEF" />
          </linearGradient>
          <linearGradient id="kinlyWarm" x1="12" y1="8" x2="40" y2="64" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FFB74D" />
            <stop offset="1" stopColor="#FF7B72" />
          </linearGradient>
          <linearGradient id="kinlyGreen" x1="16" y1="31" x2="46" y2="62" gradientUnits="userSpaceOnUse">
            <stop stopColor="#7BC9A1" />
            <stop offset="1" stopColor="#53B98D" />
          </linearGradient>
        </defs>

        <circle cx="17" cy="13" r="7.8" fill="url(#kinlyWarm)" />
        <circle cx="52" cy="13" r="7.8" fill="url(#kinlyBlue)" />

        <path
          d="M14.3 25.4C6.8 32.6 8.2 47.4 18.2 55.4L32.2 66.6C33.5 67.6 35.4 67.6 36.7 66.6L50.9 55.4C60.9 47.4 62.2 32.6 54.8 25.4C48.9 19.8 39.1 20.9 34.5 29.8C30 20.9 20.2 19.8 14.3 25.4Z"
          fill="url(#kinlyWarm)"
        />
        <path
          d="M54.8 25.4C48.9 19.8 39.1 20.9 34.5 29.8C32.8 26.4 30.4 24.1 27.7 22.9L22.1 43.7L34.5 57.1L50.9 55.4C60.9 47.4 62.2 32.6 54.8 25.4Z"
          fill="url(#kinlyBlue)"
          opacity="0.92"
        />
        <path
          d="M16.9 41.5C17.2 46.4 20 51.5 24.9 55.4L32.2 61.2C33.5 62.2 35.4 62.2 36.7 61.2L44.2 55.4C45.1 54.7 45.9 54 46.6 53.2C41.8 48.8 37.7 44.9 34.5 40.2C30.5 46 25.4 50.3 19.9 54.1C16.8 50.1 15.7 45.6 16.9 41.5Z"
          fill="url(#kinlyGreen)"
        />
        <path
          d="M34.5 50.9L27.9 45.7C24.4 43 24 37.8 27.1 34.9C29.5 32.7 33.2 33.2 34.5 36.5C35.9 33.2 39.6 32.7 41.9 34.9C45.1 37.8 44.6 43 41.2 45.7L34.5 50.9Z"
          fill="#F8F7F4"
          opacity="0.96"
        />
      </svg>

      {showWordmark && (
        <span className="font-heading text-4xl font-black leading-none tracking-[-0.08em] text-[#101D37]">
          kinly
        </span>
      )}
    </div>
  );
}
