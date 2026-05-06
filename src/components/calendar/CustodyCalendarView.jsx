import React, { useEffect, useMemo, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import {
  Baby,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Heart,
  HeartHandshake,
  Home,
  Layers,
  Plus,
  Save,
  Shield,
  User,
  UsersRound,
  X,
} from "lucide-react";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import { useFamily } from "@/lib/FamilyContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

function normalizeCustodyDay(docSnap) {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    ...data,
    date: String(data.date || "").slice(0, 10),
    withWhom: data.withWhom || data.with_whom || "",
    isSplit: Boolean(data.isSplit || data.is_split),
    notes: data.notes || "",
  };
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

function parentForDay(day) {
  if (!day) return "";
  if (day.isSplit || day.is_split) return "split";
  return day.withWhom || day.with_whom || "";
}

function parentStyle(parent) {
  if (parent === "dad") return "border-blue-200 bg-blue-50 text-blue-700";
  if (parent === "mom") return "border-amber-200 bg-amber-50 text-amber-700";
  if (parent === "split") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  return "border-slate-200 bg-white text-slate-400";
}

function parentIcon(parent) {
  if (parent === "dad") return <User className="h-4 w-4" />;
  if (parent === "mom") return <Heart className="h-4 w-4" />;
  if (parent === "split") return <UsersRound className="h-4 w-4" />;
  return <Plus className="h-4 w-4" />;
}

function parentLabel(parent, dadName, momName) {
  if (parent === "dad") return dadName || "Dad";
  if (parent === "mom") return momName || "Mom";
  if (parent === "split") return "Split";
  return "Add";
}

function CustodyMonthGrid({ anchorDate, custodyDays, dadName, momName, onSelectDay }) {
  const gridStart = startOfWeek(startOfMonth(anchorDate), { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(anchorDate), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const dayMap = new Map(custodyDays.map((day) => [day.date, day]));

  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-3">
      <div className="grid grid-cols-7 gap-2 pb-2">
        {labels.map((label) => (
          <div key={label} className="text-center text-xs font-extrabold uppercase tracking-wide text-slate-500">{label}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const custody = dayMap.get(key);
          const parent = parentForDay(custody);
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectDay(day, custody)}
              className={`min-h-[118px] rounded-2xl border p-2 text-left transition hover:shadow-md ${parentStyle(parent)} ${isToday(day) ? "ring-2 ring-blue-400" : ""} ${!isSameMonth(day, anchorDate) ? "opacity-45" : ""}`}
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/70 text-sm font-black text-slate-800">{format(day, "d")}</span>
                {parentIcon(parent)}
              </div>
              <p className="truncate text-sm font-black">{parentLabel(parent, dadName, momName)}</p>
              {custody?.notes && <p className="mt-1 line-clamp-2 text-xs font-semibold opacity-70">{custody.notes}</p>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CustodyDayEditor({ selected, dadName, momName, onClose, onSave, saving }) {
  const [withWhom, setWithWhom] = useState(parentForDay(selected?.custody) || "dad");
  const [notes, setNotes] = useState(selected?.custody?.notes || "");

  useEffect(() => {
    setWithWhom(parentForDay(selected?.custody) || "dad");
    setNotes(selected?.custody?.notes || "");
  }, [selected]);

  if (!selected) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/20 p-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-blue-600">Custody day</p>
            <h3 className="text-2xl font-black text-slate-950">{format(selected.date, "EEEE, MMM d")}</h3>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[
            { value: "dad", label: dadName || "Dad", icon: User },
            { value: "mom", label: momName || "Mom", icon: Heart },
            { value: "split", label: "Split", icon: UsersRound },
          ].map((option) => {
            const Icon = option.icon;
            const active = withWhom === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setWithWhom(option.value)}
                className={`rounded-2xl border p-3 text-center text-sm font-black transition ${active ? "border-blue-500 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
              >
                <Icon className="mx-auto mb-1 h-5 w-5" />
                {option.label}
              </button>
            );
          })}
        </div>

        <div className="mt-4">
          <Label>Notes</Label>
          <Input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Pickup, exchange time, special note..." className="mt-1" />
        </div>

        <Button type="button" onClick={() => onSave({ withWhom, notes })} disabled={saving} className="mt-5 w-full gap-2 bg-blue-600 hover:bg-blue-700">
          <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save custody day"}
        </Button>
      </div>
    </div>
  );
}

export default function CustodyCalendarView({ activeCalendar = "custody", setActiveCalendar }) {
  const { user, myEmail, profile, familyId, dadName, momName } = useFamily();
  const [anchorDate, setAnchorDate] = useState(new Date());
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [custodyDays, setCustodyDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(null);
  const [savingDay, setSavingDay] = useState(false);

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
          setSelectedGroupId((current) => current || data[0]?.id || "legacy-family-custody");
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

  const legacyGroup = useMemo(() => ({
    id: "legacy-family-custody",
    name: `${profile?.family_name || profile?.familyName || "Family"} Custody`,
    children: profile?.children || [],
    coParents: [
      { name: dadName || "Dad", email: myEmail || "" },
      { name: momName || "Mom", email: profile?.parent2_email || profile?.parent2Email || "" },
    ],
    legacy: true,
  }), [profile, dadName, momName, myEmail]);

  const availableGroups = useMemo(() => {
    if (groups.length > 0) return groups;
    return [legacyGroup];
  }, [groups, legacyGroup]);

  const selectedGroup = useMemo(() => availableGroups.find((group) => group.id === selectedGroupId) || availableGroups[0] || null, [availableGroups, selectedGroupId]);
  const selectedChildren = selectedGroup ? groupChildren(selectedGroup) : [];
  const selectedParents = selectedGroup ? groupParents(selectedGroup) : [];
  const familyName = profile?.family_name || profile?.familyName || "Current Family";

  const loadCustodyDays = async () => {
    if (!familyId && !selectedGroup?.id) return;

    try {
      let data = [];

      if (selectedGroup?.id && !selectedGroup.legacy) {
        const groupQuery = query(collection(db, "custodyDays"), where("custodyGroupId", "==", selectedGroup.id));
        const groupSnap = await getDocs(groupQuery);
        data = groupSnap.docs.map(normalizeCustodyDay);
      }

      if (data.length === 0 && familyId) {
        const familyQuery = query(collection(db, "custodyDays"), where("familyId", "==", familyId));
        const familySnap = await getDocs(familyQuery);
        data = familySnap.docs.map(normalizeCustodyDay);
      }

      setCustodyDays(data);
    } catch (error) {
      console.error("Error loading custody days:", error);
      setCustodyDays([]);
    }
  };

  useEffect(() => {
    loadCustodyDays();
  }, [familyId, selectedGroup?.id]);

  const handleSaveDay = async ({ withWhom, notes }) => {
    if (!selectedDay?.date) return;
    setSavingDay(true);

    try {
      const dateKey = format(selectedDay.date, "yyyy-MM-dd");
      const isSplit = withWhom === "split";
      const payload = {
        date: dateKey,
        withWhom: isSplit ? "split" : withWhom,
        with_whom: isSplit ? "split" : withWhom,
        isSplit,
        is_split: isSplit,
        notes: notes.trim(),
        familyId,
        family_id: familyId,
        custodyGroupId: selectedGroup?.legacy ? "" : selectedGroup?.id || "",
        childNames: selectedChildren,
        updatedAt: serverTimestamp(),
      };

      if (selectedDay.custody?.id) {
        await updateDoc(doc(db, "custodyDays", selectedDay.custody.id), payload);
      } else {
        await addDoc(collection(db, "custodyDays"), {
          ...payload,
          createdBy: user?.uid || null,
          createdByEmail: myEmail || "",
          createdAt: serverTimestamp(),
        });
      }

      setSelectedDay(null);
      await loadCustodyDays();
    } catch (error) {
      console.error("Error saving custody day:", error);
      alert(`Error saving custody day: ${error.message}`);
    } finally {
      setSavingDay(false);
    }
  };

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
              <p className="mt-2 max-w-2xl text-sm font-semibold text-slate-500">Uses the existing custodyDays calendar and supports custodyGroupId for the new co-parent model.</p>
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
          ) : (
            <div className="space-y-5">
              <CustodyGroupSelector groups={availableGroups} selectedGroupId={selectedGroup?.id} onSelect={setSelectedGroupId} />

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
                <div className="rounded-[2rem] border border-blue-100 bg-blue-50 p-5">
                  <p className="text-xs font-black uppercase tracking-wider text-blue-600">Selected custody group</p>
                  <h2 className="mt-2 text-2xl font-black text-slate-950">{selectedGroup?.name || "Custody Group"}</h2>
                  {selectedGroup?.legacy && <Badge variant="outline" className="mt-2 border-amber-200 bg-amber-50 text-amber-700">Legacy family custody</Badge>}
                  <div className="mt-4 space-y-3">
                    <div className="rounded-2xl bg-white p-3 ring-1 ring-blue-100"><p className="text-xs font-black uppercase tracking-wider text-slate-400">Children</p><p className="mt-1 font-bold text-slate-800">{selectedChildren.join(", ") || "Not selected"}</p></div>
                    <div className="rounded-2xl bg-white p-3 ring-1 ring-blue-100"><p className="text-xs font-black uppercase tracking-wider text-slate-400">Co-parents</p><div className="mt-2 space-y-1">{selectedParents.map((parent, index) => <p key={`${parent.email}-${index}`} className="text-sm font-bold text-slate-700">{parent.name || parent.email} <span className="font-semibold text-slate-400">{parent.email}</span></p>)}{selectedParents.length === 0 && <p className="text-sm font-bold text-slate-400">No co-parents listed.</p>}</div></div>
                    <div className="rounded-2xl bg-white p-3 ring-1 ring-blue-100"><p className="text-xs font-black uppercase tracking-wider text-slate-400">Loaded days</p><p className="mt-1 font-bold text-slate-800">{custodyDays.length} custody days</p></div>
                  </div>
                </div>

                <CustodyMonthGrid anchorDate={anchorDate} custodyDays={custodyDays} dadName={dadName} momName={momName} onSelectDay={(date, custody) => setSelectedDay({ date, custody })} />
              </div>
            </div>
          )}
        </div>
      </div>

      <CustodyDayEditor selected={selectedDay} dadName={dadName} momName={momName} onClose={() => setSelectedDay(null)} onSave={handleSaveDay} saving={savingDay} />
    </div>
  );
}
