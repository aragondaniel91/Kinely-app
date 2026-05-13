import { useMemo, useState } from "react";
import { Eye, Mail } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  NOTIFY_OPTIONS,
  NOTIFY_TARGETS,
  VISIBILITY_OPTIONS,
  VISIBILITY_TYPES,
  buildAudiencePayload,
  normalizeEmailList,
} from "@/lib/visibilityUtils";

function parseEmails(value) {
  return normalizeEmailList(String(value || "").split(/[,;\n]+/g));
}

function optionById(options, id) {
  return options.find((option) => option.id === id);
}

export default function VisibilityAudienceSelector({
  value,
  onChange,
  createdByEmail = "",
  familyProfile = null,
  custodyGroup = null,
  coParentEmails = [],
  className = "",
  mode = "family",
}) {
  const isCustodyMode = mode === "custody";

  const visibilityOptions = useMemo(
    () =>
      isCustodyMode
        ? VISIBILITY_OPTIONS
        : VISIBILITY_OPTIONS.filter((option) => option.id !== VISIBILITY_TYPES.CUSTODY_SHARED),
    [isCustodyMode]
  );

  const notifyOptions = useMemo(
    () =>
      isCustodyMode
        ? NOTIFY_OPTIONS
        : NOTIFY_OPTIONS.filter((option) => option.id !== NOTIFY_TARGETS.CO_PARENT),
    [isCustodyMode]
  );

  const initialVisibility = value?.visibility || value?.audience?.type || VISIBILITY_TYPES.HOUSEHOLD;
  const initialNotifyTarget = value?.notify?.target || NOTIFY_TARGETS.NO_ONE;

  const visibility = visibilityOptions.some((option) => option.id === initialVisibility)
    ? initialVisibility
    : VISIBILITY_TYPES.HOUSEHOLD;

  const notifyTarget = notifyOptions.some((option) => option.id === initialNotifyTarget)
    ? initialNotifyTarget
    : NOTIFY_TARGETS.NO_ONE;

  const [selectedVisibleText, setSelectedVisibleText] = useState(
    (value?.audience?.selectedVisibleEmails || value?.selectedVisibleEmails || []).join(", ")
  );
  const [selectedNotifyText, setSelectedNotifyText] = useState(
    (value?.notify?.selectedRecipients || value?.selectedNotifyEmails || []).join(", ")
  );

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

  const visibilityMeta = optionById(visibilityOptions, visibility);
  const notifyMeta = optionById(notifyOptions, notifyTarget);

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
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-indigo-500">
            Visibility & notifications
          </p>
          <h3 className="mt-1 text-lg font-black text-slate-950">Privacy</h3>
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
            Family events stay inside the household unless you select specific people.
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1 text-[11px] font-black text-slate-600">
          <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1">
            <Eye className="h-3.5 w-3.5" /> {previewPayload.visibleTo.length}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1">
            <Mail className="h-3.5 w-3.5" /> {previewPayload.notify.recipients.length}
          </span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label>Visibility</Label>
          <Select value={visibility} onValueChange={(next) => emit({ visibility: next })}>
            <SelectTrigger className="mt-1 h-11 bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-[240]">
              {visibilityOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.shortLabel || option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
            {visibilityMeta?.description || "Choose who can see this event."}
          </p>
        </div>

        <div>
          <Label>Notification</Label>
          <Select value={notifyTarget} onValueChange={(next) => emit({ notifyTarget: next })}>
            <SelectTrigger className="mt-1 h-11 bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-[240]">
              {notifyOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
            {notifyMeta?.description || "Choose who receives an alert."}
          </p>
        </div>
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

      <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-500">
        {previewPayload.visibleTo.length} visible · {previewPayload.notify.recipients.length} notification recipients
      </div>
    </Card>
  );
}
