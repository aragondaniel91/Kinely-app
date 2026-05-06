import React, { useEffect, useMemo, useState } from "react";
import { addMonths, format, subMonths } from "date-fns";
import { Baby, CalendarDays, ChevronLeft, ChevronRight, HeartHandshake, Home, Layers, Plus, Shield, UsersRound } from "lucide-react";
import { collection, getDocs, query, where } from "firebase/firestore";

import { db } from "@/lib/firebase";
import { useFamily } from "@/lib/FamilyContext";
import { Button } from "@/components/ui/button";
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
            className={`flex h-10 items-center gap-2 border-r border-slate-200 px-3 text-sm font-extrabold last:border-r-0 ${active ? "bg-blue-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
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
            className={`min-w-[250px] rounded-3xl border p-4 text-left transition ${active ? "border-blue-300 bg-blue-50 shadow-sm" : "border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50/40"}`}
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white">
                <Baby className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black text-slate-950">{group.name || "Custody Group"}</p>
                <p className="mt-1 truncate text-xs font-semibold text-slate-500">{children.join(", ") || "Child not selected"}</p>
                <p className="mt-1 truncate text-xs font-semibold text-slate-400">{parents.map((parent) => parent.name || parent.email).filter(Boolean).join(" & ") || "Co-parent pending"}</p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export default function CustodyCalendarView({ activeCalendar = "custody", setActiveCalendar }) {
  const { myEmail, profile, familyId } = useFamily();
  const [anchorDate, setAnchorDate] = useState(new Date());
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadGroups() {
      if (!myEmail) {
        setGroups([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const custodyQuery = query(collection(db, "custodyGroups"), where("memberEmails", "array-contains", myEmail));
        const snap = await getDocs(custodyQuery);
        const data = snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));

        if (!cancelled) {
          setGroups(data);
          setSelectedGroupId((current) => current || data[0]?.id || "");
        }
      } catch (error) {
        console.error("Error loading custody groups:", error);
        if (!cancelled) setGroups([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadGroups();

    return () => {
      cancelled = true;
    };
  }, [myEmail, familyId]);

  const selectedGroup = useMemo(() => groups.find((group) => group.id === selectedGroupId) || groups[0] || null, [groups, selectedGroupId]);
  const selectedChildren = selectedGroup ? groupChildren(selectedGroup) : [];
  const selectedParents = selectedGroup ? groupParents(selectedGroup) : [];
  const familyName = profile?.family_name || profile?.familyName || "Current Family";

  return (
    <div className="min-h-full bg-[#f8fbff] p-2 md:p-4">
      <div className="mx-auto flex min-h-[calc(100vh-1rem)] max-w-none flex-col rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-white px-4 py-4 md:px-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><Home className="h-5 w-5" /></div>
                <div><p className="text-lg font-black text-slate-950">Family Wall</p><p className="text-xs font-semibold text-slate-400">{familyName}</p></div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-4xl font-black tracking-tight text-slate-950 md:text-5xl">Custody Calendar</h1>
                <Badge variant="outline" className="gap-1 border-blue-200 bg-blue-50 text-blue-700"><Shield className="h-3 w-3" /> Shared custody space</Badge>
              </div>
              <p className="mt-2 max-w-2xl text-sm font-semibold text-slate-500">This view is separate from private family events. Only authorized co-parents in the selected custody group can see it.</p>
            </div>

            <div className="flex flex-col items-end gap-3">
              <button type="button" className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700"><UsersRound className="h-5 w-5" /></button>
              <CalendarSwitch activeCalendar={activeCalendar} setActiveCalendar={setActiveCalendar} />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => setAnchorDate(subMonths(anchorDate, 1))}><ChevronLeft className="h-4 w-4" /></Button>
              <Button variant="outline" onClick={() => setAnchorDate(new Date())}>Today</Button>
              <Button variant="outline" size="icon" onClick={() => setAnchorDate(addMonths(anchorDate, 1))}><ChevronRight className="h-4 w-4" /></Button>
            </div>
            <p className="text-2xl font-black text-slate-900">{format(anchorDate, "MMMM yyyy")}</p>
          </div>
        </div>

        <div className="flex-1 p-4 md:p-6">
          {loading ? (
            <div className="flex min-h-[420px] items-center justify-center"><div className="h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" /></div>
          ) : groups.length === 0 ? (
            <div className="mx-auto flex min-h-[420px] max-w-3xl items-center justify-center rounded-[2rem] border border-dashed border-blue-200 bg-blue-50/40 p-8 text-center">
              <div>
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-blue-600 text-white"><HeartHandshake className="h-8 w-8" /></div>
                <h2 className="text-3xl font-black text-slate-950">No custody groups yet</h2>
                <p className="mt-3 text-base font-semibold text-slate-500">Create a custody group in Profile first. Example: Joaquin Custody shared between Daniel and Amanda.</p>
                <Button type="button" onClick={() => setActiveCalendar?.("family")} className="mt-6 bg-blue-600 hover:bg-blue-700">Back to Family Calendar</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <CustodyGroupSelector groups={groups} selectedGroupId={selectedGroup?.id} onSelect={setSelectedGroupId} />
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
                <div className="rounded-[2rem] border border-blue-100 bg-blue-50 p-5">
                  <p className="text-xs font-black uppercase tracking-wider text-blue-600">Selected custody group</p>
                  <h2 className="mt-2 text-2xl font-black text-slate-950">{selectedGroup?.name || "Custody Group"}</h2>
                  <div className="mt-4 space-y-3">
                    <div className="rounded-2xl bg-white p-3 ring-1 ring-blue-100"><p className="text-xs font-black uppercase tracking-wider text-slate-400">Children</p><p className="mt-1 font-bold text-slate-800">{selectedChildren.join(", ") || "Not selected"}</p></div>
                    <div className="rounded-2xl bg-white p-3 ring-1 ring-blue-100"><p className="text-xs font-black uppercase tracking-wider text-slate-400">Co-parents</p><div className="mt-2 space-y-1">{selectedParents.map((parent, index) => <p key={`${parent.email}-${index}`} className="text-sm font-bold text-slate-700">{parent.name || parent.email} <span className="font-semibold text-slate-400">{parent.email}</span></p>)}{selectedParents.length === 0 && <p className="text-sm font-bold text-slate-400">No co-parents listed.</p>}</div></div>
                  </div>
                </div>

                <div className="flex min-h-[420px] items-center justify-center rounded-[2rem] border border-slate-200 bg-white p-8 text-center">
                  <div className="max-w-xl">
                    <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-50 text-blue-600"><CalendarDays className="h-8 w-8" /></div>
                    <h2 className="text-3xl font-black text-slate-950">Custody events coming next</h2>
                    <p className="mt-3 text-base font-semibold text-slate-500">The custody group is connected. Next we will create custodyEvents and show the custody schedule here without mixing it with private family events.</p>
                    <Button type="button" disabled className="mt-6 gap-2 bg-blue-600"><Plus className="h-4 w-4" /> Add custody event soon</Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
