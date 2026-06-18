import { useMemo, useState } from "react";
import { Check, Eye, Mail } from "lucide-react";

import { Card } from "@/components/ui/card";
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
  normalizeEmail,
  normalizeEmailList,
} from "@/lib/visibilityUtils";
import { getSelectableFamilyMembers } from "@/lib/familyPeopleUtils";

function optionById(options, id) {
  return options.find((option) => option.id === id);
}

function CompactPersonPicker({ title, people, selectedEmails, onToggle, emptyText }) {
  if (!people.length) {
    return (
      <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold leading-5 text-amber-800">
        {emptyText}
      </p>
    );
  }

  return (
    <div className="mt-2">
      <p className="mb-1.5 text-[11px] font-black uppercase tracking-wide text-slate-400">{title}</p>
      <div className="flex flex-wrap gap-1.5">
        {people.map((person) => {
          const active = selectedEmails.includes(person.email);
          return (
            <button
              key={person.email}
              type="button"
              onClick={() => onToggle(person.email)}
              className={`inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-black transition ${
                active
                  ? "border-indigo-300 bg-indigo-600 text-white shadow-sm"
                  : "border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-800"
              }`}
              title={`${person.name} · ${person.role}`}
            >
              {active && <Check className="h-3.5 w-3.5 shrink-0" />}
              <span className="truncate">{person.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function VisibilityAudienceSelector({
  value,
  onChange,
  createdByEmail = "",
  currentUser = null,
  familyProfile = null,
  custodyGroup = null,
  coParentEmails = [],
  className = "",
  mode = "family",
}) {
  const isCustodyMode = mode === "custody";

  const peopleOptions = useMemo(
    () => getSelectableFamilyMembers(familyProfile || {}, currentUser, createdByEmail),
    [familyProfile, currentUser, createdByEmail]
  );

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

  const [selectedVisibleEmails, setSelectedVisibleEmails] = useState(() =>
    normalizeEmailList(value?.audience?.selectedVisibleEmails || value?.selectedVisibleEmails || [])
  );
  const [selectedNotifyEmails, setSelectedNotifyEmails] = useState(() =>
    normalizeEmailList(value?.notify?.selectedRecipients || value?.selectedNotifyEmails || [])
  );

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

  function peopleForEmails(emails = []) {
    const emailSet = new Set(normalizeEmailList(emails));
    return peopleOptions.filter((person) => emailSet.has(person.email));
  }

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

    payload.audience = {
      ...payload.audience,
      selectedPeople: peopleForEmails(nextSelectedVisibleEmails),
    };
    payload.notify = {
      ...payload.notify,
      selectedPeople: peopleForEmails(nextSelectedNotifyEmails),
    };

    onChange?.(payload);
  }

  function toggleVisiblePerson(email) {
    const normalized = normalizeEmail(email);
    const next = selectedVisibleEmails.includes(normalized)
      ? selectedVisibleEmails.filter((item) => item !== normalized)
      : [...selectedVisibleEmails, normalized];

    setSelectedVisibleEmails(next);
    emit({ selectedVisibleEmails: next });
  }

  function toggleNotifyPerson(email) {
    const normalized = normalizeEmail(email);
    const next = selectedNotifyEmails.includes(normalized)
      ? selectedNotifyEmails.filter((item) => item !== normalized)
      : [...selectedNotifyEmails, normalized];

    setSelectedNotifyEmails(next);
    emit({ selectedNotifyEmails: next });
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
          <Label htmlFor="event-visibility">Visibility</Label>
          <Select value={visibility} onValueChange={(next) => emit({ visibility: next })}>
            <SelectTrigger id="event-visibility" className="mt-1 h-11 bg-white">
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

          {visibility === VISIBILITY_TYPES.SELECTED && (
            <CompactPersonPicker
              title="Visible to"
              people={peopleOptions}
              selectedEmails={selectedVisibleEmails}
              onToggle={toggleVisiblePerson}
              emptyText="No family members are available yet."
            />
          )}
        </div>

        <div>
          <Label htmlFor="event-notification-target">Notification</Label>
          <Select value={notifyTarget} onValueChange={(next) => emit({ notifyTarget: next })}>
            <SelectTrigger id="event-notification-target" className="mt-1 h-11 bg-white">
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

          {notifyTarget === NOTIFY_TARGETS.SELECTED && (
            <CompactPersonPicker
              title="Notify"
              people={peopleOptions}
              selectedEmails={selectedNotifyEmails}
              onToggle={toggleNotifyPerson}
              emptyText="No family members are available yet."
            />
          )}
        </div>
      </div>

      <div className="mt-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-500">
        {previewPayload.visibleTo.length} visible · {previewPayload.notify.recipients.length} notification recipients
      </div>
    </Card>
  );
}
