import { useMemo, useState } from "react";
import { Bell, Eye, EyeOff, Home, Lock, Mail, Send, Shield, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  NOTIFY_OPTIONS,
  NOTIFY_TARGETS,
  VISIBILITY_OPTIONS,
  VISIBILITY_TYPES,
  buildAudiencePayload,
  normalizeEmailList,
} from "@/lib/visibilityUtils";

const VISIBILITY_ICONS = {
  [VISIBILITY_TYPES.PRIVATE]: Lock,
  [VISIBILITY_TYPES.HOUSEHOLD]: Home,
  [VISIBILITY_TYPES.CUSTODY_SHARED]: Shield,
  [VISIBILITY_TYPES.SELECTED]: Users,
};

const NOTIFY_ICONS = {
  [NOTIFY_TARGETS.NO_ONE]: EyeOff,
  [NOTIFY_TARGETS.CO_PARENT]: Shield,
  [NOTIFY_TARGETS.ALL_VISIBLE]: Bell,
  [NOTIFY_TARGETS.SELECTED]: Send,
};

function parseEmails(value) {
  return normalizeEmailList(String(value || "").split(/[,
;]/g));
}

function OptionButton({ option, active, onClick, iconMap }) {
  const Icon = iconMap[option.id] || Eye;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-3 text-left transition ${
        active
          ? "border-indigo-300 bg-indigo-50 text-indigo-900 shadow-sm"
          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${active ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-black">{option.label}</p>
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{option.description}</p>
        </div>
      </div>
    </button>
  );
}

export default function VisibilityAudienceSelector({
  value,
  onChange,
  createdByEmail = "",
  familyProfile = null,
  custodyGroup = null,
  coParentEmails = [],
  className = "",
}) {
  const [selectedVisibleText, setSelectedVisibleText] = useState(
    (value?.audience?.selectedVisibleEmails || value?.selectedVisibleEmails || []).join(", ")
  );
  const [selectedNotifyText, setSelectedNotifyText] = useState(
    (value?.notify?.selectedRecipients || value?.selectedNotifyEmails || []).join(", ")
  );

  const visibility = value?.visibility || value?.audience?.type || VISIBILITY_TYPES.HOUSEHOLD;
  const notifyTarget = value?.notify?.target || NOTIFY_TARGETS.NO_ONE;

  const selectedVisibleEmails = useMemo(() => parseEmails(selectedVisibleText), [selectedVisibleText]);
  const selectedNotifyEmails = useMemo(() => parseEmails(selectedNotifyText), [selectedNotifyText]);

  const previewPayload = useMemo(
    () =>
      buildAudiencePayload({
        visibility,
        notifyTarget,
        createdByEmail,
        familyProfile,
        custodyGroup,
        selectedVisibleEmails,
        selectedNotifyEmails,
        coParentEmails,
      }),
    [visibility, notifyTarget, createdByEmail, familyProfile, custodyGroup, selectedVisibleEmails, selectedNotifyEmails, coParentEmails]
  );

  function emit(next = {}) {
    const nextVisibility = next.visibility ?? visibility;
    const nextNotifyTarget = next.notifyTarget ?? notifyTarget;
    const nextSelectedVisibleEmails = next.selectedVisibleEmails ?? selectedVisibleEmails;
    const nextSelectedNotifyEmails = next.selectedNotifyEmails ?? selectedNotifyEmails;

    const payload = buildAudiencePayload({
      visibility: nextVisibility,
      notifyTarget: nextNotifyTarget,
      createdByEmail,
      familyProfile,
      custodyGroup,
      selectedVisibleEmails: nextSelectedVisibleEmails,
      selectedNotifyEmails: nextSelectedNotifyEmails,
      coParentEmails,
    });

    onChange?.(payload);
  }

  function updateSelectedVisibleText(text) {
    setSelectedVisibleText(text);
    emit({ selectedVisibleEmails: parseEmails(text) });
  }

  function updateSelectedNotifyText(text) {
    setSelectedNotifyText(text);
    emit({ selectedNotifyEmails: parseEmails(text) });
  }

  return (
    <Card className={`rounded-[2rem] border-slate-200 bg-white p-4 shadow-sm md:p-5 ${className}`}>
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-500">Visibility & Notifications</p>
          <h3 className="mt-1 text-xl font-black text-slate-950">Who can see this?</h3>
          <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
            Visibility controls access. Notifications are separate and only go to people you choose.
          </p>
        </div>
        <div className="flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-600">
          <Eye className="h-3.5 w-3.5" />
          {previewPayload.visibleTo.length} visible
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {VISIBILITY_OPTIONS.map((option) => (
          <OptionButton
            key={option.id}
            option={option}
            active={visibility === option.id}
            onClick={() => emit({ visibility: option.id })}
            iconMap={VISIBILITY_ICONS}
          />
        ))}
      </div>

      {visibility === VISIBILITY_TYPES.SELECTED && (
        <div className="mt-4 rounded-3xl border border-indigo-100 bg-indigo-50/50 p-4">
          <Label>Selected people who can see this</Label>
          <Input
            value={selectedVisibleText}
            onChange={(event) => updateSelectedVisibleText(event.target.value)}
            placeholder="person1@email.com, person2@email.com"
            className="mt-1 bg-white"
          />
          <p className="mt-1 text-xs font-semibold text-indigo-700">Separate multiple emails with commas.</p>
        </div>
      )}

      <div className="mt-6 border-t border-slate-100 pt-5">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <h3 className="text-xl font-black text-slate-950">Who should be notified?</h3>
            <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
              A person can see an item without receiving a notification.
            </p>
          </div>
          <div className="flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-600">
            <Mail className="h-3.5 w-3.5" />
            {previewPayload.notify.recipients.length} recipients
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {NOTIFY_OPTIONS.map((option) => (
            <OptionButton
              key={option.id}
              option={option}
              active={notifyTarget === option.id}
              onClick={() => emit({ notifyTarget: option.id })}
              iconMap={NOTIFY_ICONS}
            />
          ))}
        </div>

        {notifyTarget === NOTIFY_TARGETS.SELECTED && (
          <div className="mt-4 rounded-3xl border border-blue-100 bg-blue-50/50 p-4">
            <Label>Selected people to notify</Label>
            <Input
              value={selectedNotifyText}
              onChange={(event) => updateSelectedNotifyText(event.target.value)}
              placeholder="person1@email.com, person2@email.com"
              className="mt-1 bg-white"
            />
            <p className="mt-1 text-xs font-semibold text-blue-700">Separate multiple emails with commas.</p>
          </div>
        )}
      </div>

      <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Preview payload</p>
        <div className="mt-3 grid gap-3 text-xs font-semibold text-slate-600 md:grid-cols-2">
          <div>
            <p className="font-black text-slate-950">Visible to</p>
            <p className="mt-1 break-words">{previewPayload.visibleTo.join(", ") || "No one selected"}</p>
          </div>
          <div>
            <p className="font-black text-slate-950">Notify recipients</p>
            <p className="mt-1 break-words">{previewPayload.notify.recipients.join(", ") || "No notifications"}</p>
          </div>
        </div>
      </div>
    </Card>
  );
}
