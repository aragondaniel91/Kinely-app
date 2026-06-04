import React, { useMemo, useState } from "react";
import { Copy, Mail, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const INVITE_TYPES = [
  {
    id: "coparent",
    label: "Co-parent / custody member",
    badge: "Can edit custody",
    description:
      "Use this for the other parent. They can view and edit the custody group schedule.",
  },
  {
    id: "viewer",
    label: "Viewer",
    badge: "View only",
    description:
      "Use this for a spouse, grandparent, babysitter, or caregiver who should only see the custody schedule.",
  },
];

function buildInviteMessage({ inviteType, recipientName, custodyGroupName }) {
  const targetName = recipientName?.trim() || "there";
  const groupName = custodyGroupName?.trim() || "our custody calendar";

  if (inviteType === "viewer") {
    return `Hi ${targetName},\n\nI’m sharing view-only access to ${groupName} in Kinely so you can see the custody schedule and related custody updates.\n\nPlease create or log in to your Kinely account using this same email address, then the shared custody group should appear under Custody.\n\nThanks.`;
  }

  return `Hi ${targetName},\n\nI’m inviting you as a co-parent/member for ${groupName} in Kinely. This gives you access to view and update the shared custody schedule.\n\nPlease create or log in to your Kinely account using this same email address, then the custody group should appear under Custody.\n\nThanks.`;
}

export default function CustodyInviteHelper() {
  const [inviteType, setInviteType] = useState("coparent");
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [custodyGroupName, setCustodyGroupName] = useState("");
  const [copied, setCopied] = useState(false);

  const selectedType = INVITE_TYPES.find((type) => type.id === inviteType) || INVITE_TYPES[0];

  const message = useMemo(
    () => buildInviteMessage({ inviteType, recipientName, custodyGroupName }),
    [inviteType, recipientName, custodyGroupName]
  );

  const mailtoHref = useMemo(() => {
    const subject = encodeURIComponent("Kinely custody invitation");
    const body = encodeURIComponent(message);
    const to = encodeURIComponent(recipientEmail.trim());
    return `mailto:${to}?subject=${subject}&body=${body}`;
  }, [recipientEmail, message]);

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (error) {
      console.warn("Could not copy invite message:", error);
    }
  }

  return (
    <Card className="rounded-[2rem] border-indigo-100 bg-white p-4 shadow-sm md:p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-500">
            Invite / Share
          </p>
          <h3 className="mt-1 text-xl font-black text-slate-950">
            Prepare a custody invitation
          </h3>
          <p className="mt-1 max-w-3xl text-sm font-semibold leading-6 text-slate-500">
            For now, add the person’s email inside the custody group, then send them this invite message. Later this can become a real Firebase invitation link.
          </p>
        </div>

        <span className="w-fit rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-700">
          MVP helper
        </span>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr]">
        <div className="space-y-3 rounded-3xl border border-slate-200 bg-slate-50 p-4">
          <div>
            <Label>Invite type</Label>
            <div className="mt-2 grid gap-2">
              {INVITE_TYPES.map((type) => {
                const active = inviteType === type.id;
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setInviteType(type.id)}
                    className={`rounded-2xl border px-3 py-3 text-left transition ${
                      active
                        ? "border-indigo-300 bg-indigo-50 text-indigo-900"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-black">{type.label}</p>
                      <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-black text-slate-500">
                        {type.badge}
                      </span>
                    </div>
                    <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                      {type.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label>Recipient name</Label>
              <Input
                value={recipientName}
                onChange={(event) => setRecipientName(event.target.value)}
                placeholder="Agustin"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Recipient email</Label>
              <Input
                value={recipientEmail}
                onChange={(event) => setRecipientEmail(event.target.value)}
                placeholder="person@email.com"
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label>Custody group name</Label>
            <Input
              value={custodyGroupName}
              onChange={(event) => setCustodyGroupName(event.target.value)}
              placeholder="Mady Custody"
              className="mt-1"
            />
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                Message preview
              </p>
              <p className="mt-1 text-sm font-black text-slate-950">
                {selectedType.badge}
              </p>
            </div>
            <Send className="h-5 w-5 text-indigo-500" />
          </div>

          <pre className="mt-3 min-h-[190px] whitespace-pre-wrap rounded-2xl border border-slate-200 bg-white p-3 text-sm font-semibold leading-6 text-slate-600">
            {message}
          </pre>

          <div className="mt-3 flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" onClick={copyMessage} className="gap-2 rounded-2xl">
              <Copy className="h-4 w-4" />
              {copied ? "Copied" : "Copy message"}
            </Button>
            <Button type="button" asChild className="gap-2 rounded-2xl">
              <a href={mailtoHref}>
                <Mail className="h-4 w-4" />
                Open email
              </a>
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
