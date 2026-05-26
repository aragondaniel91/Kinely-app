import { cn } from "@/lib/utils";
import { colorClasses } from "@/lib/personColorUtils";

const ALL_FILTER_ID = "all";
const FAMILY_FILTER_ID = "family";

function LegendDot({ colorId = "family", active = false, gradientStyle = null }) {
  const isSharedFamilyDot = colorId === "all" || colorId === "family";

  if (isSharedFamilyDot) {
    return (
      <span
        className={cn(
          "relative inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white shadow-sm",
          active && "ring-2 ring-slate-300 ring-offset-2 ring-offset-white"
        )}
        aria-hidden="true"
      >
        <span className="absolute left-[5px] top-[5px] h-1.5 w-1.5 rounded-full bg-blue-500" />
        <span className="absolute right-[5px] top-[5px] h-1.5 w-1.5 rounded-full bg-emerald-500" />
        <span className="absolute bottom-[5px] left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-violet-500" />
      </span>
    );
  }

  const colors = colorClasses(colorId, "slate");

  return (
    <span
      className={cn(
        "h-4 w-4 shrink-0 rounded-full border border-white shadow-sm",
        !gradientStyle && colors.dot,
        active && "ring-2 ring-slate-300 ring-offset-2 ring-offset-white"
      )}
      style={gradientStyle || undefined}
    />
  );
}

export default function FamilyCalendarLegend({ people = [], selectedPersonId = ALL_FILTER_ID, onSelectPerson }) {
  const items = [
    { id: ALL_FILTER_ID, displayName: "ALL", type: "all", colorId: "all" },
    ...people,
    { id: FAMILY_FILTER_ID, displayName: "Family", type: "family", colorId: "family" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
      {items.map((person) => {
        const active = selectedPersonId === person.id;
        return (
          <button
            key={person.id}
            type="button"
            onClick={() => onSelectPerson?.(person.id)}
            className={cn(
              "flex items-center gap-2 text-[15px] font-semibold transition",
              active ? "text-slate-950" : "text-slate-700 hover:text-blue-700"
            )}
          >
            <LegendDot colorId={person.colorId || "family"} active={active} gradientStyle={person.gradientStyle} />
            <span>{person.displayName}</span>
          </button>
        );
      })}
    </div>
  );
}
