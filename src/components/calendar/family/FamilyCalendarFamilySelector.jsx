import { Check, ChevronDown, Home, Users } from "lucide-react";

import { cn } from "@/lib/utils";
import { useFamily } from "@/lib/FamilyContext";

function getFamilyName(profile) {
  return profile?.family_name || profile?.familyName || profile?.name || "Family";
}

function getFamilyMeta(profile) {
  const members = Array.isArray(profile?.members) ? profile.members.length : 0;
  const children = Array.isArray(profile?.children) ? profile.children.length : 0;
  const parts = [];
  if (members) parts.push(`${members} member${members === 1 ? "" : "s"}`);
  if (children) parts.push(`${children} child${children === 1 ? "" : "ren"}`);
  return parts.join(" · ") || "Household";
}

export default function FamilyCalendarFamilySelector() {
  const { profile, allProfiles = [], activeProfileId, setActiveProfileId, isLoading } = useFamily();
  const activeName = getFamilyName(profile);
  const hasMultipleFamilies = allProfiles.length > 1;

  if (!hasMultipleFamilies) {
    return (
      <div className="flex items-center gap-2 text-sm font-black text-slate-950">
        <span className="text-base">🏠</span>
        <div>
          <p className="leading-none">Family Wall</p>
          <p className="mt-1 text-[11px] font-semibold text-slate-400">{activeName}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative inline-block text-left">
      <button
        type="button"
        disabled={isLoading}
        className="flex items-center gap-2 rounded-2xl px-1 py-1 text-sm font-black text-slate-950 transition hover:bg-slate-50 disabled:opacity-60"
      >
        <span className="text-base">🏠</span>
        <div className="text-left">
          <p className="leading-none">Family Wall</p>
          <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-slate-400">
            <span className="max-w-[220px] truncate">{activeName}</span>
            <ChevronDown className="h-3 w-3" />
          </p>
        </div>
      </button>

      <div className="invisible absolute left-0 top-full z-[80] mt-3 w-[340px] overflow-hidden rounded-3xl border border-slate-200 bg-white opacity-0 shadow-2xl shadow-slate-900/15 transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
        <div className="border-b border-slate-100 px-4 py-3">
          <p className="text-sm font-black text-slate-950">Switch family</p>
          <p className="text-xs font-semibold text-slate-400">Choose the household calendar to view.</p>
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {allProfiles.map((family) => {
            const selected = family.id === activeProfileId || family.familyId === activeProfileId;
            const familyId = family.id || family.familyId;
            return (
              <button
                key={familyId}
                type="button"
                onClick={() => setActiveProfileId?.(familyId)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition",
                  selected ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-50"
                )}
              >
                <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl", selected ? "bg-blue-100" : "bg-slate-100")}>
                  {family.type === "custody" ? <Users className="h-4 w-4" /> : <Home className="h-4 w-4" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-black">{getFamilyName(family)}</span>
                  <span className="block truncate text-xs font-semibold text-slate-400">{getFamilyMeta(family)}</span>
                </span>
                {selected && <Check className="h-4 w-4 shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
