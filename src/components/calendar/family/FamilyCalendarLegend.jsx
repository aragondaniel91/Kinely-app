import { cn } from "@/lib/utils";
import { colorClasses } from "@/lib/personColorUtils";

function LegendDot({ colorId = "family", active = false }) {
  const colors = colorClasses(colorId, "slate");
  return (
    <span
      className={cn(
        "h-4 w-4 shrink-0 rounded-full border border-white shadow-sm",
        colors.dot,
        active && "ring-2 ring-blue-200"
      )}
    />
  );
}

export default function FamilyCalendarLegend({ people = [], selectedPersonId = "family", onSelectPerson }) {
  const items = [
    { id: "family", displayName: "ALL", colorId: "family", type: "group" },
    ...people,
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
            <LegendDot colorId={person.colorId} active={active} />
            <span>{person.displayName}</span>
          </button>
        );
      })}
    </div>
  );
}
