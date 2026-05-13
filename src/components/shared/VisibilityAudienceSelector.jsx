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

function optionById(options, id) {
  return options.find((option) => option.id === id);
}

function cleanName(value, fallback = "Family member") {
  const name = String(value || "").trim();
  return name || fallback;
}

function nameFromEmail(email = "") {
  const localPart = String(email || "").split("@")[0] || "Family member";
  return localPart
    .replace(/[._-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ") || "Family member";
}

function resolvePersonName(person = {}, email = "") {
  return cleanName(
    person.name ||
      person.displayName ||
      person.fullName ||
      person.memberName ||
      person.label ||
      person.firstName ||
      person.first_name ||
      person.username,
    nameFromEmail(email)
  );
}

function addPerson(map, person = {}) {
  const email = normalizeEmail(person.email || person.emailAddress || person.memberEmail);
  if (!email) return;

  const nextPerson = {
    email,
    name: resolvePersonName(person, email),
    role: cleanName(person.role || person.memberRole || person.relationship || "Member", "Member"),
  };

  const existing = map.get(email);
  if (!existing) {
    map.set(email, nextPerson);
    return;
  }

  const existingLooksGeneric = ["owner", "parent 1", "parent 2", "member", nameFromEmail(email).toLowerCase()].includes(
    String(existing.name || "").toLowerCase()
  );
  const nextLooksBetter = nextPerson.name && nextPerson.name !== nameFromEmail(email);

  if (existingLooksGeneric && nextLooksBetter) {
    map.set(email, { ...existing, ...nextPerson, role: existing.role || nextPerson.role });
  }
}

function findMemberByEmail(members = [], email = "") {
  const normalized = normalizeEmail(email);
  return members.find((member) => normalizeEmail(member?.email || member?.emailAddress || member?.memberEmail) === normalized);
}

function getSelectableFamilyPeople(profile = {}, createdByEmail = "", currentUser = null) {
  const people = new Map();
  const members = Array.isArray(profile.members) ? profile.members : [];
  const ownerEmail = profile.ownerEmail || profile.owner_email || profile.createdByEmail || profile.created_by || currentUser?.email || createdByEmail;
  const ownerMember = findMemberByEmail(members, ownerEmail);

  addPerson(people, {
    email: ownerEmail,
    name:
      ownerMember?.name ||
      ownerMember?.displayName ||
      profile.ownerName ||
      profile.owner_name ||
      profile.createdByName ||
      profile.created_by_name ||
      profile.userName ||
      profile.user_name ||
      currentUser?.displayName ||
      currentUser?.name ||
      nameFromEmail(ownerEmail),
    role: "Owner",
  });

  addPerson(people, {
    email: profile.parent1Email || profile.parent1_email || ownerEmail,
    name: profile.parent1Name || profile.parent1_name || profile.dadName || profile.dad_name || currentUser?.displayName || nameFromEmail(ownerEmail),
    role: profile.parent1Role || profile.parent1_role || "Parent",
  });

  addPerson(people, {
    email: profile.parent2Email || profile.parent2_email,
    name: profile.parent2Name || profile.parent2_name || profile.momName || profile.mom_name,
    role: profile.parent2Role || profile.parent2_role || "Parent",
  });

  members.forEach((member) => addPerson(people, member));

  const memberEmails = Array.isArray(profile.memberEmails)
    ? profile.memberEmails
    : Array.isArray(profile.member_emails)
    ? profile.member_emails
    : [];

  memberEmails.forEach((email) => {
    const member = findMemberByEmail(members, email);
    addPerson(people, member || { email, name: nameFromEmail(email), role: "Member" });
  });

  addPerson(people, {
    email: currentUser?.email || createdByEmail,
    name: currentUser?.displayName || currentUser?.name || profile.currentUserName || profile.displayName || nameFromEmail(currentUser?.email || createdByEmail),
    role: "You",
  });

  return Array.from(people.values()).sort((a, b) => a.name.localeCompare(b.name));
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
    () => getSelectableFamilyPeople(familyProfile || {}, createdByEmail, currentUser),
    [familyProfile, createdByEmail, currentUser]
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
