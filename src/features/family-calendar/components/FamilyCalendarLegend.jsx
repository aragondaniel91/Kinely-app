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
          "h-4 w-4 shrink-0 rounded-full border border-slate-300 bg-white shadow-sm",
          active && "ring-2 ring-blue-200"
        )}
      >
        <span className="block h-full w-full rounded-full bg-gradient-to-br from-blue-400 via-emerald-400 to-violet-400 opacity-80" />
      </span>
    );
  }

  const colors = colorClasses(colorId, "slate");

  return (
    <span
      className={cn(
        "h-4 w-4 shrink-0 rounded-full border border-white shadow-sm",
        !gradientStyle && colors.dot,
        active && "ring-2 ring-blue-200"
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
