import React from "react";

export default function TasksPageLayout({ children }) {
  return (
    <div className="relative min-h-full overflow-hidden bg-transparent px-3 pb-28 pt-2 md:px-6 md:pb-12">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 top-12 h-80 w-80 rounded-full bg-accent/10 blur-3xl" />
        <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-primary/8 blur-3xl" />
        <div className="absolute bottom-10 left-1/3 h-80 w-80 rounded-full bg-secondary/45 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-[1500px] space-y-5">
        {children}
      </div>
    </div>
  );
}
