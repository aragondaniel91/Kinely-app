import React from "react";

export default function TasksPageLayout({ children }) {
  return (
    <div className="relative min-h-full bg-transparent px-3 pb-28 pt-2 md:px-6 md:pb-12">
      <div className="relative z-10 mx-auto max-w-[1500px] space-y-5">
        {children}
      </div>
    </div>
  );
}
