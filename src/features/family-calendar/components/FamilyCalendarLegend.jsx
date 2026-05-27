import { cn } from "@/lib/utils";
import { colorClasses } from "@/lib/personColorUtils";

const ALL_FILTER_ID = "all";
const FAMILY_FILTER_ID = "family";

const FAMILY_SIGNATURE_STYLE = {
  background:
    "linear-gradient(135deg, #006B9E 0%, #007A55 42%, #B7791F 72%, #C92B55 100%)",
};

function LegendDot({ colorId = "family", active = false }) {
  if (colorId === "all") {
    return (
      <span
        className={cn(
          "h-4 w-4 shrink-0 rounded-full border border-slate-300 bg-slate-100 shadow-sm",
          active && "ring-2 ring-slate-300 ring-offset-2 ring-offset-white"
        )}
        aria-hidden="true"
      />
    );
  }

  if (colorId === "family") {
    return (
      <span
        className={cn(
          "h-4 w-4 shrink-0 rounded-full border border-white shadow-sm",
          active && "ring-2 ring-slate-300 ring-offset-2 ring-offset-white"
        )}
        style={FAMILY_SIGNATURE_STYLE}
        aria-hidden="true"
      />
    );
  }

  const colors = colorClasses(colorId, "slate");

  return (
    <span
      className={cn(
        "h-4 w-4 shrink-0 rounded-full border border-white shadow-sm",
        colors.dot,
        active && "ring-2 ring-slate-300 ring-offset-2 ring-offset-white"
      )}
      aria-hidden="true"
    />
  );
}

export default function FamilyCalendarLegend({
  people = [],
  selectedPersonId = ALL_FILTER_ID,
  onSelectPerson,
}) {
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
              active ? "text-slate-950" : "text-slate-700 hover:text-slate-950"
            )}
          >
            <LegendDot colorId={person.colorId || "family"} active={active} />
            <span>{person.displayName || person.name || person.label}</span>
          </button>
        );
      })}
    </div>
  );
}
