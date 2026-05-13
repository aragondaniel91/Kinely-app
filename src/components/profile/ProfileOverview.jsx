import { CalendarHeart, Home, Shield, Users } from "lucide-react";

import { useFamily } from "@/lib/FamilyContext";
import { getColorMeta, normalizeChildren } from "@/lib/personColorUtils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function familyNameOf(profile) {
  return profile?.family_name || profile?.familyName || "My Family";
}

function memberCountOf(profile) {
  const memberEmails = Array.isArray(profile?.memberEmails)
    ? profile.memberEmails
    : Array.isArray(profile?.member_emails)
    ? profile.member_emails
    : [];

  if (memberEmails.length > 0) return memberEmails.length;
  if (Array.isArray(profile?.members)) return profile.members.length + 1;
  return 1;
}

export default function ProfileOverview() {
  const { profile, familyId, isOwner, isAdmin, allProfiles } = useFamily();
  const children = normalizeChildren(profile?.children || []);
  const familyCount = Array.isArray(allProfiles) ? allProfiles.length : 0;
  const memberCount = memberCountOf(profile);

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
      <Card className="rounded-[2rem] border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-500">Active family space</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">{familyNameOf(profile)}</h2>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-500">
              This family space controls private Family Calendar events, members, tasks, meals, groceries, notes, and child care details.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {isOwner && <Badge variant="secondary" className="gap-1"><Shield className="h-3 w-3" /> Owner</Badge>}
            {isAdmin && <Badge variant="outline" className="gap-1"><Shield className="h-3 w-3" /> Admin</Badge>}
            {familyId && <Badge variant="outline" className="text-[10px]">Family ID: {familyId.slice(0, 8)}...</Badge>}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {children.length > 0 ? (
            children.map((child) => {
              const color = getColorMeta(child.color);
              return (
                <span key={child.id || child.name} className={`rounded-full border px-3 py-1.5 text-xs font-bold ${color.bg} ${color.text} ${color.border}`}>
                  👶 {child.name}
                </span>
              );
            })
          ) : (
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-500">
              No children added yet
            </span>
          )}
        </div>
      </Card>

      <Card className="rounded-[2rem] border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Quick stats</p>
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600"><Home className="h-5 w-5" /></div>
            <div>
              <p className="text-2xl font-black text-slate-950">{familyCount}</p>
              <p className="text-xs font-bold text-slate-400">Family spaces</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600"><Users className="h-5 w-5" /></div>
            <div>
              <p className="text-2xl font-black text-slate-950">{memberCount}</p>
              <p className="text-xs font-bold text-slate-400">Family members</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-100 text-blue-600"><CalendarHeart className="h-5 w-5" /></div>
            <div>
              <p className="text-2xl font-black text-slate-950">—</p>
              <p className="text-xs font-bold text-slate-400">Custody groups</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
