import { useMemo, useState } from "react";
import { Bell, Eye, EyeOff, Home, Lock, Mail, Send, Shield, Users } from "lucide-react";

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

const SHORT_DESCRIPTIONS = {
  [VISIBILITY_TYPES.PRIVATE]: "Only you.",
  [VISIBILITY_TYPES.HOUSEHOLD]: "Your household.",
  [VISIBILITY_TYPES.CUSTODY_SHARED]: "Custody audience.",
  [VISIBILITY_TYPES.SELECTED]: "Specific people.",
  [NOTIFY_TARGETS.NO_ONE]: "No alerts.",
  [NOTIFY_TARGETS.CO_PARENT]: "Co-parent only.",
  [NOTIFY_TARGETS.ALL_VISIBLE]: "Everyone visible.",
  [NOTIFY_TARGETS.SELECTED]: "Specific people.",
};

function parseEmails(value) {
  return normalizeEmailList(String(value || "").split(/[,;\n]+/g));
}

function OptionButton({ option, active, onClick, iconMap }) {
  const Icon = iconMap[option.id] || Eye;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 rounded-2xl border px-3 py-3 text-left transition ${
        active
          ? "border-indigo-300 bg-indigo-50 text-indigo-900 shadow-sm"
          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
      }`}
    >
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${active ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-black">{option.shortLabel || option.label}</p>
        <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">
          {SHORT_DESCRIPTIONS[option.id] || option.description}
        </p>
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
    <Card className={`rounded-3xl border-slate-200 bg-slate-50/70 p-3 shadow-none md:p-4 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-indigo-500">Visibility</p>
          <h3 className="mt-1 text-lg font-black text-slate-950">Who can see this?</h3>
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
            Choose access first. Notifications are separate.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-black text-slate-600">
          <Eye className="h-3.5 w-3.5" />
          {previewPayload.visibleTo.length}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
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
        <div className="mt-3 rounded-2xl border border-indigo-100 bg-white p-3">
          <Label>Visible to selected emails</Label>
          <Input
            value={selectedVisibleText}
            onChange={(event) => updateSelectedVisibleText(event.target.value)}
            placeholder="person1@email.com, person2@email.com"
            className="mt-1 bg-white"
          />
        </div>
      )}

      <div className="mt-4 border-t border-slate-200 pt-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-slate-950">Who gets notified?</h3>
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
              Seeing an event does not always mean getting an alert.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-black text-slate-600">
            <Mail className="h-3.5 w-3.5" />
            {previewPayload.notify.recipients.length}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
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
          <div className="mt-3 rounded-2xl border border-blue-100 bg-white p-3">
            <Label>Notify selected emails</Label>
            <Input
              value={selectedNotifyText}
              onChange={(event) => updateSelectedNotifyText(event.target.value)}
              placeholder="person1@email.com, person2@email.com"
              className="mt-1 bg-white"
            />
          </div>
        )}
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-500">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <span>{previewPayload.visibleTo.length} visible</span>
          <span>{previewPayload.notify.recipients.length} notification recipients</span>
        </div>
      </div>
    </Card>
  );
}
