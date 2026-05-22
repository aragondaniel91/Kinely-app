import React from "react";
import { CalendarHeart } from "lucide-react";

import CustodyGroupsManager from "@/features/custody/CustodyGroupsManager";
import CustodyInviteHelper from "@/components/profile/CustodyInviteHelper";
import { Card } from "@/components/ui/card";

export default function ProfileCustodySection() {
  return (
    <div className="space-y-5">
      <Card className="rounded-[2rem] border-blue-100 bg-gradient-to-br from-blue-50 via-white to-slate-50 p-5 shadow-sm md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl bg-blue-600 text-white shadow-sm">
            <CalendarHeart className="h-7 w-7" />
          </div>

          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-500">
              Profile / Custody
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 md:text-3xl">
              Custody groups
            </h2>
            <p className="mt-2 max-w-4xl text-sm font-semibold leading-6 text-slate-500">
              Household children live in the family profile. Custody groups are only needed when a child has a separate custody relationship with another parent outside this household.
            </p>
          </div>
        </div>
      </Card>

      <CustodyInviteHelper />
      <CustodyGroupsManager />
    </div>
  );
}
