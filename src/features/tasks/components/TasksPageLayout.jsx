import React from "react";

export default function TasksPageLayout({ children }) {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-[#fbfaf6] px-3 pb-28 pt-2 md:px-6 md:pb-16">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-28 top-10 h-80 w-80 rounded-full bg-accent/8 blur-3xl" />
        <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-primary/6 blur-3xl" />
        <div className="absolute left-1/2 top-[38%] h-72 w-72 -translate-x-1/2 rounded-full bg-[#fff3c7]/35 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-[1500px] space-y-5">
        {children}
      </div>
    </div>
  );
}
