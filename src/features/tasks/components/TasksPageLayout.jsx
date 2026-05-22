import React from "react";

export default function TasksPageLayout({ children }) {
  return (
    <div className="relative min-h-full overflow-hidden bg-[#f8f4ec] px-3 pb-28 pt-2 md:px-6 md:pb-12">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-20 top-10 h-80 w-80 rounded-full bg-emerald-200/30 blur-3xl" />
        <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-orange-100/70 blur-3xl" />
        <div className="absolute bottom-10 left-1/3 h-80 w-80 rounded-full bg-violet-100/55 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-[1500px] space-y-5">
        {children}
      </div>
    </div>
  );
}
