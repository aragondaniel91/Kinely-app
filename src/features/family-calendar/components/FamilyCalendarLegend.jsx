import { cn } from "@/lib/utils";
import { colorClasses } from "@/lib/personColorUtils";
import { familyGradientStyle } from "@/features/family-calendar/utils/familyCalendarColorStyles";

const ALL_FILTER_ID = "all";
const FAMILY_FILTER_ID = "family";

function AllFilterDot({ active = false }) {
  return (
    <span
      className={cn(
        "relative h-4 w-4 shrink-0 rounded-full border border-slate-400 bg-slate-100 shadow-sm",
        active && "ring-2 ring-slate-300 ring-offset-2 ring-offset-white"
      )}
      aria-hidden="true"
    >
      <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-600" />
    </span>
  );
}

function LegendDot({ colorId = "family", active = false, gradientStyle = null }) {
  if (colorId === ALL_FILTER_ID) {
    return <AllFilterDot active={active} />;
  }

  const colors = colorClasses(colorId, "slate");

  return (
    <span
      className={cn(
        "h-4 w-4 shrink-0 rounded-full border border-white shadow-sm",
        gradientStyle ? "" : colors.dot,
        active && "ring-2 ring-slate-300 ring-offset-2 ring-offset-white"
      )}
      style={gradientStyle || undefined}
      aria-hidden="true"
    />
  );
}

export default function FamilyCalendarLegend({
  people = [],
  selectedPersonId = ALL_FILTER_ID,
  onSelectPerson,
}) {
  const sharedFamilyGradient = familyGradientStyle(people);

  const items = [
    { id: ALL_FILTER_ID, displayName: "ALL", type: "all", colorId: ALL_FILTER_ID },
    ...people,
    {
      id: FAMILY_FILTER_ID,
      displayName: "Family",
      type: "family",
      colorId: FAMILY_FILTER_ID,
      gradientStyle: sharedFamilyGradient,
    },
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
            <LegendDot
              colorId={person.colorId || "family"}
              active={active}
              gradientStyle={person.gradientStyle}
            />
            <span>{person.displayName || person.name || person.label}</span>
          </button>
        );
      })}
    </div>
  );
}
