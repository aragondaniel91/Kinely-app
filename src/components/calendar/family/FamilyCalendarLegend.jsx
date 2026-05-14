import { cn } from "@/lib/utils";
import { colorClasses, colorHex } from "@/lib/personColorUtils";

const ALL_FILTER_ID = "all";
const FAMILY_FILTER_ID = "family";

function familyGradientStyle(people = []) {
  const colors = people
    .map((person) => colorHex(person.colorId || person.color || "family", "blue"))
    .filter(Boolean);

  const uniqueColors = Array.from(new Set(colors));
  const fallback = ["#3b82f6", "#10b981", "#f97316", "#8b5cf6"];
  const gradientColors = uniqueColors.length ? uniqueColors : fallback;

  return {
    background: `linear-gradient(90deg, ${gradientColors.join(", ")})`,
  };
}

function LegendDot({ colorId = "family", active = false, gradientStyle = null }) {
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
  const allGradient = familyGradientStyle(people);
  const items = [
    { id: ALL_FILTER_ID, displayName: "ALL", type: "all", gradientStyle: allGradient },
    ...people,
    { id: FAMILY_FILTER_ID, displayName: "Family", colorId: "indigo", type: "family" },
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
