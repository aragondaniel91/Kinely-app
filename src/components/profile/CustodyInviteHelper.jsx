import React from "react";
import { ArrowDown, MailCheck, ShieldCheck, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const INVITE_STEPS = [
  {
    icon: UserPlus,
    title: "Add the co-parent or viewer",
    text: "Use co-parent access for the other parent. Use viewer access for grandparents, caregivers, partners, or trusted helpers.",
  },
  {
    icon: ShieldCheck,
    title: "Choose custody and budget access",
    text: "Custody schedule and budget are separate permissions, so sensitive reimbursement details stay private.",
  },
  {
    icon: MailCheck,
    title: "Kinely sends the invite",
    text: "When you save the custody group, Kinely queues an email invitation and an in-app notification automatically.",
  },
];

export default function CustodyInviteHelper() {
  return (
    <Card className="overflow-hidden rounded-[2rem] border-blue-100 bg-white shadow-sm">
      <div className="grid gap-0 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-slate-900 p-5 text-white md:p-6">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-100">
            Secure invitations
          </p>
          <h3 className="mt-3 text-2xl font-black tracking-tight">
            Invite custody people from the group settings
          </h3>
          <p className="mt-3 text-sm font-semibold leading-6 text-blue-50/90">
            Custody access should always be tied to a real custody group, not a loose email draft. This keeps co-parenting, household, caregiver, and budget access separated.
          </p>
          <Button asChild className="mt-5 gap-2 rounded-2xl bg-white text-blue-700 hover:bg-blue-50">
            <a href="#custody-groups-manager">
              Manage custody groups
              <ArrowDown className="h-4 w-4" />
            </a>
          </Button>
        </div>

        <div className="grid gap-3 p-4 md:p-5">
          {INVITE_STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <div key={step.title} className="flex gap-3 rounded-3xl border border-slate-200 bg-slate-50/80 p-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-black text-slate-950">{step.title}</p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{step.text}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
