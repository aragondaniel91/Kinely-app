import { cn } from "@/lib/utils";
import { colorClasses } from "@/lib/personColorUtils";

function LegendDot({ colorId = "family" }) {
  const colors = colorClasses(colorId, "slate");
  return <span className={cn("h-4 w-4 shrink-0 rounded-full border border-white shadow-sm", colors.dot)} />;
}

export default function FamilyCalendarLegend({ people = [], selectedPersonId = "family", onSelectPerson }) {
  const items = [
    {
      id: "family",
      displayName: "ALL",
      colorId: "family",
      type: "group",
    },
    ...people,
  ];

  return (
    <div className="flex flex-wrap items-center gap-3">
      {items.map((person) => {
        const active = selectedPersonId === person.id;
        return (
          <button
            key={person.id}
            type="button"
            onClick={() => onSelectPerson?.(person.id)}
            className={cn(
              "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-black transition",
              active
                ? "border-blue-300 bg-blue-50 text-blue-700 shadow-sm"
                : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50/50 hover:text-blue-700"
            )}
          >
            <LegendDot colorId={person.colorId} />
            {person.displayName}
          </button>
        );
      })}
    </div>
  );
}
