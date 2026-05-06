import React, { useEffect, useMemo, useState } from "react";
import { Baby, CalendarDays, HeartHandshake, Layers, Shield, UsersRound } from "lucide-react";
import { collection, getDocs, query, where } from "firebase/firestore";

import { db } from "@/lib/firebase";
import { useFamily } from "@/lib/FamilyContext";
import CustodyCalendar from "@/pages/CustodyCalendar";
import { Badge } from "@/components/ui/badge";

const calendarTypes = [
  { value: "family", label: "Family Calendar", icon: CalendarDays },
  { value: "custody", label: "Custody Calendar", icon: HeartHandshake },
  { value: "all", label: "All Calendar", icon: Layers },
];

function groupChildren(group) {
  if (Array.isArray(group.children) && group.children.length) return group.children;
  if (Array.isArray(group.childNames) && group.childNames.length) return group.childNames;
  if (group.childName) return [group.childName];
  return [];
}

function groupParents(group) {
  if (Array.isArray(group.coParents)) return group.coParents;
  if (Array.isArray(group.parents)) return group.parents;
  return [];
}

function CalendarSwitch({ activeCalendar, setActiveCalendar }) {
  return (
    <div className="inline-flex overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {calendarTypes.map((item) => {
        const Icon = item.icon;
        const active = activeCalendar === item.value;

        return (
          <button
            key={item.value}
            type="button"
            onClick={() => setActiveCalendar?.(item.value)}
            className={`flex h-10 items-center gap-2 border-r border-slate-200 px-3 text-sm font-extrabold last:border-r-0 ${
              active ? "bg-blue-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{item.label.replace(" Calendar", "")}</span>
          </button>
        );
      })}
    </div>
  );
}

function CustodyGroupSelector({ groups, selectedGroupId, onSelect }) {
  if (!groups.length) return null;

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {groups.map((group) => {
        const active = group.id === selectedGroupId;
        const children = groupChildren(group);
        const parents = groupParents(group);

        return (
          <button
            key={group.id}
            type="button"
            onClick={() => onSelect(group.id)}
            className={`min-w-[260px] rounded-3xl border p-4 text-left transition ${
              active
                ? "border-blue-300 bg-blue-50 shadow-sm"
                : "border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50/40"
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white">
                <Baby className="h-5 w-5" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-black text-slate-950">
                    {group.name || "Custody Group"}
                  </p>
                  {group.legacy && (
                    <Badge variant="outline" className="border-amber-200 bg-amber-50 text-[10px] text-amber-700">
                      Legacy
                    </Badge>
                  )}
                </div>
                <p className="mt-1 truncate text-xs font-semibold text-slate-500">
                  {children.join(", ") || "Child not selected"}
                </p>
                <p className="mt-1 truncate text-xs font-semibold text-slate-400">
                  {parents.map((parent) => parent.name || parent.email).filter(Boolean).join(" & ") || "Co-parent pending"}
                </p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export default function CustodyCalendarView({
  activeCalendar = "custody",
  setActiveCalendar,
  viewMode = "month",
  setViewMode,
}) {
  const { myEmail, profile, familyId, dadName, momName } = useFamily();
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [loadingGroups, setLoadingGroups] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadGroups() {
      if (!myEmail) {
        setGroups([]);
        setLoadingGroups(false);
        return;
      }

      setLoadingGroups(true);

      try {
        const custodyQuery = query(
          collection(db, "custodyGroups"),
          where("memberEmails", "array-contains", myEmail)
        );
        const snap = await getDocs(custodyQuery);
        const data = snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));

        if (!cancelled) {
          setGroups(data);
          setSelectedGroupId((current) => current || data[0]?.id || "legacy-family-custody");
        }
      } catch (error) {
        console.error("Error loading custody groups:", error);
        if (!cancelled) setGroups([]);
      } finally {
        if (!cancelled) setLoadingGroups(false);
      }
    }

    loadGroups();

    return () => {
      cancelled = true;
    };
  }, [myEmail, familyId]);

  const legacyGroup = useMemo(
    () => ({
      id: "legacy-family-custody",
      name: `${profile?.family_name || profile?.familyName || "Family"} Custody`,
      children: profile?.children || [],
      coParents: [
        { name: dadName || "Dad", email: myEmail || "" },
        { name: momName || "Mom", email: profile?.parent2_email || profile?.parent2Email || "" },
      ],
      legacy: true,
    }),
    [profile, dadName, momName, myEmail]
  );

  const availableGroups = useMemo(() => {
    if (groups.length > 0) return groups;
    return [legacyGroup];
  }, [groups, legacyGroup]);

  const selectedGroup = useMemo(
    () => availableGroups.find((group) => group.id === selectedGroupId) || availableGroups[0] || null,
    [availableGroups, selectedGroupId]
  );

  const selectedChildren = selectedGroup ? groupChildren(selectedGroup) : [];
  const selectedParents = selectedGroup ? groupParents(selectedGroup) : [];
  const familyName = profile?.family_name || profile?.familyName || "Current Family";

  return (
    <div className="min-h-full bg-[#f8fbff] p-2 md:p-4">
      <div className="mx-auto max-w-none rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-white px-4 py-4 md:px-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                  <HeartHandshake className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-lg font-black text-slate-950">Custody Calendar</p>
                  <p className="text-xs font-semibold text-slate-400">{familyName}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-4xl font-black tracking-tight text-slate-950 md:text-5xl">
                  Shared Custody
                </h1>
                <Badge variant="outline" className="gap-1 border-blue-200 bg-blue-50 text-blue-700">
                  <Shield className="h-3 w-3" /> Co-parent space
                </Badge>
              </div>

              <p className="mt-2 max-w-2xl text-sm font-semibold text-slate-500">
                Select the custody group first. The calendar below keeps the original custody logic and layout.
              </p>
            </div>

            <div className="flex flex-col items-end gap-3">
              <button type="button" className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700">
                <UsersRound className="h-5 w-5" />
              </button>
              <CalendarSwitch activeCalendar={activeCalendar} setActiveCalendar={setActiveCalendar} />
            </div>
          </div>

          <div className="mt-5">
            {loadingGroups ? (
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-500">
                Loading custody groups...
              </div>
            ) : (
              <CustodyGroupSelector
                groups={availableGroups}
                selectedGroupId={selectedGroup?.id}
                onSelect={setSelectedGroupId}
              />
            )}
          </div>

          {selectedGroup && (
            <div className="mt-3 grid grid-cols-1 gap-2 text-xs font-semibold text-slate-500 md:grid-cols-3">
              <div className="rounded-2xl bg-slate-50 px-3 py-2">
                <span className="font-black uppercase tracking-wide text-slate-400">Selected</span>
                <p className="mt-0.5 text-slate-700">{selectedGroup.name || "Custody Group"}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-3 py-2">
                <span className="font-black uppercase tracking-wide text-slate-400">Children</span>
                <p className="mt-0.5 text-slate-700">{selectedChildren.join(", ") || "Not selected"}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-3 py-2">
                <span className="font-black uppercase tracking-wide text-slate-400">Co-parents</span>
                <p className="mt-0.5 truncate text-slate-700">
                  {selectedParents.map((parent) => parent.name || parent.email).filter(Boolean).join(" & ") || "Pending"}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="custody-original-calendar-wrapper bg-[#f8fbff]">
          <CustodyCalendar
            viewMode={viewMode === "mixed" ? "month" : viewMode}
            setViewMode={setViewMode}
            showFilters
            selectedCustodyGroup={selectedGroup}
            selectedCustodyGroupId={selectedGroup?.legacy ? "" : selectedGroup?.id || ""}
          />
        </div>
      </div>
    </div>
  );
}
