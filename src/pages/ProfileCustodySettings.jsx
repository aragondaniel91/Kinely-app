import React from "react";
import { ArrowLeft, CalendarHeart } from "lucide-react";
import { useNavigate } from "react-router-dom";

import CustodyGroupsManager from "@/components/calendar/CustodyGroupsManager";
import { Button } from "@/components/ui/button";

export default function ProfileCustodySettings() {
  const navigate = useNavigate();

  return (
    <div className="min-h-full bg-background px-4 pb-28 pt-5 md:px-8 md:pb-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm md:p-7">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl bg-blue-50 text-blue-600">
                <CalendarHeart className="h-7 w-7" />
              </div>

              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-500">
                  Profile / Custody
                </p>
                <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 md:text-5xl">
                  Custody settings
                </h1>
                <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-slate-500 md:text-base">
                  Manage custody groups, parents, viewers, and child custody profiles. Daily custody use stays in the Custody Hub.
                </p>
              </div>
            </div>

            <Button type="button" variant="outline" onClick={() => navigate("/profile")} className="w-fit gap-2 rounded-2xl">
              <ArrowLeft className="h-4 w-4" />
              Back to Profile
            </Button>
          </div>
        </div>

        <CustodyGroupsManager />
      </div>
    </div>
  );
}
