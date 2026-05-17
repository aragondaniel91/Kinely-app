import React from "react";
import { cn } from "@/lib/utils";

export default function KinlyLogo({
  showWordmark = true,
  className = "",
  imageClassName = "",
}) {
  return (
    <div className={cn("flex items-center", className)}>
      <img
        src={showWordmark ? "/kinly-logo.svg" : "/kinly-icon.svg"}
        alt="Kinly"
        className={cn(
          showWordmark ? "h-12 w-auto object-contain" : "h-11 w-11 object-contain",
          imageClassName
        )}
      />
    </div>
  );
}
