import React, { useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import {
  CalendarDays,
  Clock,
  MapPin,
  FileText,
  Tag,
  UserRound,
  Check,
  ListChecks,
} from "lucide-react";

import { db } from "@/lib/firebase";
import { useFamily } from "@/lib/FamilyContext";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { buildAudiencePayload, NOTIFY_TARGETS, VISIBILITY_TYPES } from "@/lib/visibilityUtils";
import VisibilityAudienceSelector from "@/components/shared/VisibilityAudienceSelector";
import {
  EVENT_COLOR_MODES,
  buildFamilyEventPayload,
  getEventAssignedPerson,
  resolveEventColorId,
} from "@/core/events/eventCore";
import { PERSON_TYPES } from "@/core/people/peopleCore";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import AppDialog from "@/components/app/AppDialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const categories = [
  { value: "school", label: "School", emoji: "🎒" },
  { value: "sports", label: "Sports", emoji: "⚾" },
  { value: "doctor", label: "Doctor", emoji: "🩺" },
  { value: "pickup", label: "Pickup", emoji: "🚗" },
  { value: "birthday", label: "Birthday", emoji: "🎂" },
  { value: "family", label: "Family", emoji: "👨‍👩‍👧‍👦" },
  { value: "note", label: "Note", emoji: "📝" },
  { value: "other", label: "Other", emoji: "📌" },
];

const hourOptions = Array.from({ length: 12 }, (_, index) => String(index + 1));
const minuteOptions = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"];
const meridiemOptions = ["AM", "PM"];
const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const FAMILY_ASSIGNMENT_ID = "family";

let googleMapsPlacesPromise = null;

function loadGoogleMapsPlaces() {
  if (!googleMapsApiKey || typeof window === "undefined") return Promise.resolve(false);
  if (window.google?.maps?.places) return Promise.resolve(true);

  if (!googleMapsPlacesPromise) {
    googleMapsPlacesPromise = new Promise((resolve) => {
      const existingScript = document.querySelector("script[data-family-wall-google-maps]");
      if (existingScript) {
        existingScript.addEventListener("load", () => resolve(Boolean(window.google?.maps?.places)), { once: true });
        existingScript.addEventListener("error", () => resolve(false), { once: true });
        return;
      }

      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.dataset.familyWallGoogleMaps = "true";
      script.onload = () => resolve(Boolean(window.google?.maps?.places));
      script.onerror = () => resolve(false);
      document.head.appendChild(script);
    });
  }

  return googleMapsPlacesPromise;
}

function familyEventDocumentId(event = {}) {
  return event.firestoreId || event.firestore_id || event.docId || event.doc_id || event.documentId || event.document_id || event.id || "";
}

function initialAssignedPersonId(editEvent, people = []) {
  const corePersonId = editEvent?.assignedPersonIds?.[0] || editEvent?.assigned_person_ids?.[0] || editEvent?.assignedPersonId || editEvent?.assigned_person_id;
  if (corePersonId && people.some((person) => person.id === corePersonId)) return corePersonId;

  const snapshotId = editEvent?.assignedPersonSnapshot?.id || editEvent?.assigned_person_snapshot?.id;
  if (snapshotId && people.some((person) => person.id === snapshotId)) return snapshotId;

  return FAMILY_ASSIGNMENT_ID;
}

function timeToParts(value, fallback = "09:00") {
  const safeValue = value || fallback;
  const [rawHour = "9", rawMinute = "00"] = safeValue.split(":");
  const hour24 = Number(rawHour);
  const minute = rawMinute.padStart(2, "0").slice(0, 2);
  const meridiem = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;

  return {
    hour: String(hour12),
    minute,
    meridiem,
  };
}

function partsToTime(parts) {
  let hour = Number(parts.hour || "9");
  const minute = String(parts.minute || "00").padStart(2, "0");
  const meridiem = parts.meridiem || "AM";

  if (meridiem === "PM" && hour !== 12) hour += 12;
  if (meridiem === "AM" && hour === 12) hour = 0;

  return `${String(hour).padStart(2, "0")}:${minute}`;
}

function addOneHour(parts) {
  const current = partsToTime(parts);
  const [hour, minute] = current.split(":").map(Number);
  const nextHour = (hour + 1) % 24;
  return timeToParts(`${String(nextHour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`);
}

function defaultAudience(editEvent, user, profile) {
  if (editEvent?.visibility || editEvent?.audience || editEvent?.notify) {
    return {
      visibility: editEvent.visibility || editEvent.audience?.type || VISIBILITY_TYPES.HOUSEHOLD,
      visibleTo: editEvent.visibleTo || editEvent.visible_to || editEvent.audience?.visibleTo || [],
      audience: editEvent.audience || {
        type: editEvent.visibility || VISIBILITY_TYPES.HOUSEHOLD,
        visibleTo: editEvent.visibleTo || editEvent.visible_to || [],
        selectedVisibleEmails: editEvent.audience?.selectedVisibleEmails || [],
      },
      notify: editEvent.notify || {
        enabled: false,
        target: NOTIFY_TARGETS.NO_ONE,
        recipients: [],
        selectedRecipients: [],
      },
    };
  }

  return buildAudiencePayload({
    visibility: VISIBILITY_TYPES.HOUSEHOLD,
    notifyTarget: NOTIFY_TARGETS.NO_ONE,
    createdByEmail: user?.email || "",
    familyProfile: profile || {},
  });
}

function TabletTimePicker({ label, value, onChange }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
      <Label className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-500">
        <Clock className="h-3.5 w-3.5" />
        {label}
      </Label>

      <div className="grid grid-cols-[1fr_1fr_1.05fr] gap-2">
        <Select value={value.hour} onValueChange={(hour) => onChange({ ...value, hour })}>
          <SelectTrigger className="h-12 rounded-xl bg-white text-base font-black">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="z-[230] max-h-72">
            {hourOptions.map((hour) => (
              <SelectItem key={hour} value={hour}>{hour}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={value.minute} onValueChange={(minute) => onChange({ ...value, minute })}>
          <SelectTrigger className="h-12 rounded-xl bg-white text-base font-black">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="z-[230] max-h-72">
            {minuteOptions.map((minute) => (
              <SelectItem key={minute} value={minute}>{minute}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {meridiemOptions.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onChange({ ...value, meridiem: option })}
              className={cn(
                "text-sm font-black transition",
                value.meridiem === option ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-50"
              )}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function AddressAutocompleteInput({ value, onChange }) {
  const inputRef = useRef(null);
  const [mapsReady, setMapsReady] = useState(false);

  useEffect(() => {
    let autocomplete;
    let listener;
    let mounted = true;

    loadGoogleMapsPlaces().then((ready) => {
      if (!mounted || !ready || !inputRef.current) return;

      setMapsReady(true);
      autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
        fields: ["formatted_address", "name"],
        types: ["geocode", "establishment"],
      });

      listener = autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        const address = place?.formatted_address || place?.name || inputRef.current?.value || "";
        onChange(address);
      });
    });

    return () => {
      mounted = false;
      if (listener?.remove) listener.remove();
      if (window.google?.maps?.event && autocomplete) {
        window.google.maps.event.clearInstanceListeners(autocomplete);
      }
    };
  }, [onChange]);

  return (
    <div>
      <div className="relative mt-1">
        <MapPin className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Start typing an address..."
          className="h-11 pl-9 pr-20 text-base"
          autoComplete="off"
        />
        <span className="pointer-events-none absolute right-3 top-3 text-[10px] font-black uppercase tracking-wide text-slate-400">
          Maps
        </span>
      </div>
      <p className="mt-1 text-xs font-semibold text-slate-400">
        {mapsReady
          ? "Choose an address suggestion from Google Maps. No map will be shown."
          : googleMapsApiKey
            ? "Loading Google Maps address suggestions..."
            : "Manual address entry is active. Add VITE_GOOGLE_MAPS_API_KEY to enable suggestions."}
      </p>
    </div>
  );
}

function personEmoji(person) {
  if (person.type === PERSON_TYPES.CHILD) return "👶";
  if (person.relationship === "mother") return "👩";
  if (person.relationship === "father") return "👨";
  if (person.relationship === "babysitter" || person.relationship === "caregiver") return "🧑‍🍼";
  return "👤";
}

function getLinkedListTypeFromCalendarCategory(category = "", title = "") {
  const safeCategory = String(category || "").toLowerCase();
  const safeTitle = String(title || "").toLowerCase();

  if (
    safeCategory.includes("school") ||
    safeTitle.includes("school") ||
    safeTitle.includes("project") ||
    safeTitle.includes("homework")
  ) {
    return "school";
  }

  if (
    safeCategory.includes("birthday") ||
    safeCategory.includes("family") ||
    safeTitle.includes("party") ||
    safeTitle.includes("birthday")
  ) {
    return "event";
  }

  if (
    safeTitle.includes("meal") ||
    safeTitle.includes("dinner") ||
    safeTitle.includes("lunch") ||
    safeTitle.includes("taco")
  ) {
    return "meal";
  }

  if (
    safeTitle.includes("car") ||
    safeTitle.includes("jeep") ||
    safeTitle.includes("oil") ||
    safeTitle.includes("maintenance")
  ) {
    return "car";
  }

  return "event";
}

export default function AddFamilyEventDialog({ date, onClose, onSuccess, editEvent = null }) {
  const { user, familyId, profile, familyPeople } = useFamily();
  const navigate = useNavigate();
  const { toast } = useToast();
  const people = familyPeople || [];

  const initialStartParts = useMemo(() => timeToParts(editEvent?.startTime, "09:00"), [editEvent?.startTime]);
  const initialEndParts = useMemo(() => timeToParts(editEvent?.endTime, "10:00"), [editEvent?.endTime]);

  const [noticeDialog, setNoticeDialog] = useState(null);

  const showNotice = ({ tone = "info", title, message }) => {
    setNoticeDialog({ tone, title, message });
  };

  const [title, setTitle] = useState(editEvent?.title || "");
  const [description, setDescription] = useState(editEvent?.description || editEvent?.notes || "");
  const [eventDate, setEventDate] = useState(editEvent?.date || format(date || new Date(), "yyyy-MM-dd"));
  const [isAllDay, setIsAllDay] = useState(Boolean(editEvent?.isAllDay) || (!editEvent?.startTime && !editEvent?.endTime));
  const [startParts, setStartParts] = useState(initialStartParts);
  const [endParts, setEndParts] = useState(initialEndParts);
  const [category, setCategory] = useState(editEvent?.category || "family");
  const [assignedPersonId, setAssignedPersonId] = useState(() => initialAssignedPersonId(editEvent, people));
  const [location, setLocation] = useState(editEvent?.location || "");
  const [audiencePayload, setAudiencePayload] = useState(() => defaultAudience(editEvent, user, profile));
  const [createLinkedListWithEvent, setCreateLinkedListWithEvent] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (assignedPersonId !== FAMILY_ASSIGNMENT_ID && !people.some((person) => person.id === assignedPersonId)) {
      setAssignedPersonId(FAMILY_ASSIGNMENT_ID);
    }
  }, [assignedPersonId, people]);

  const documentId = familyEventDocumentId(editEvent || {});
  const isEditing = Boolean(documentId);
  const startTime = partsToTime(startParts);
  const endTime = partsToTime(endParts);

  const toggleAllDay = () => {
    setIsAllDay((current) => {
      const next = !current;
      if (!next && (!startParts || !endParts)) {
        const start = timeToParts("09:00");
        setStartParts(start);
        setEndParts(addOneHour(start));
      }
      return next;
    });
  };

  const handleStartChange = (nextStart) => {
    setStartParts(nextStart);
    const nextStartTime = partsToTime(nextStart);
    const currentEndTime = partsToTime(endParts);
    if (currentEndTime <= nextStartTime) setEndParts(addOneHour(nextStart));
  };

  const handleSave = async () => {
    if (!title.trim()) return;

    if (!familyId) {
      showNotice({
        tone: "warning",
        title: "No active family found",
        message: "Please select or create a family before adding an event.",
      });
      return;
    }

    if (!isAllDay && endTime <= startTime) {
      showNotice({
        tone: "warning",
        title: "Invalid time range",
        message: "End time must be after start time.",
      });
      return;
    }

    setSaving(true);

    try {
      const assignedPersonIds = assignedPersonId === FAMILY_ASSIGNMENT_ID ? [] : [assignedPersonId];
      const corePayload = buildFamilyEventPayload(
        {
          title: title.trim(),
          description: description.trim(),
          notes: description.trim(),
          date: eventDate,
          isAllDay,
          startTime: isAllDay ? "" : startTime,
          endTime: isAllDay ? "" : endTime,
          category,
          location: location.trim(),
          assignedPersonIds,
          colorMode: assignedPersonIds.length ? EVENT_COLOR_MODES.PERSON : EVENT_COLOR_MODES.FAMILY,
          visibility: audiencePayload?.visibilityCore || undefined,
          notifications: audiencePayload?.notificationsCore || undefined,
        },
        {
          familyId,
          people,
          createdByUid: user?.uid || null,
          createdByEmail: user?.email || null,
        }
      );

      const assignedPerson = getEventAssignedPerson(corePayload, people);
      const resolvedColorId = resolveEventColorId(corePayload, people, "family");

      const payload = {
        ...corePayload,
        id: documentId || corePayload.id,
        firestoreId: documentId || corePayload.id,
        colorId: resolvedColorId,
        familyName: profile?.family_name || profile?.familyName || "",
        ...audiencePayload,
        assignedPersonSnapshot: assignedPerson
          ? {
              id: assignedPerson.id,
              displayName: assignedPerson.displayName,
              type: assignedPerson.type,
              role: assignedPerson.role,
              relationship: assignedPerson.relationship,
              colorId: assignedPerson.colorId,
            }
          : null,
        updatedAt: serverTimestamp(),
      };

      if (isEditing) {
        await updateDoc(doc(db, "familyEvents", documentId), payload);
      } else {
        const eventRef = await addDoc(collection(db, "familyEvents"), {
          ...payload,
          createdBy: user?.uid || null,
          createdByEmail: user?.email || null,
          created_date: new Date().toISOString(),
          createdAt: serverTimestamp(),
        });

        await updateDoc(doc(db, "familyEvents", eventRef.id), {
          id: eventRef.id,
          firestoreId: eventRef.id,
          documentId: eventRef.id,
          legacyId: payload.id && payload.id !== eventRef.id ? payload.id : payload.legacyId || payload.legacy_id || "",
          updatedAt: serverTimestamp(),
        });

        if (createLinkedListWithEvent) {
          const listRef = await addDoc(collection(db, "familyLists"), {
            title: title.trim(),
            type: getLinkedListTypeFromCalendarCategory(category, title),
            description: "Linked to calendar event.",
            status: "active",

            familyId,

            linkedEventId: eventRef.id,
            linkedEventTitle: title.trim(),
            linkedEventDate: eventDate,
            source: "calendar",

            createdBy: user?.uid || null,
            createdByEmail: user?.email || null,
            created_date: new Date().toISOString(),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });

          toast({
            title: "Event and linked list created",
            description: `"${title.trim()}" is ready in Family Lists.`,
          });

          onSuccess?.();
          navigate(`/lists?listId=${listRef.id}`);
          return;
        }
      }

      onSuccess?.();
    } catch (error) {
      console.error("Error saving family event:", error);
      showNotice({
        tone: "danger",
        title: "Could not save event",
        message: error.message,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog open onOpenChange={onClose}>
      <DialogContent className="z-[200] max-h-[92vh] max-w-lg overflow-y-auto rounded-3xl">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2 text-xl">
            <CalendarDays className="h-5 w-5" />
            {isEditing ? "Edit Family Event" : "Add Family Event"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label>Title</Label>
            <div className="relative mt-1">
              <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Baseball practice, school activity..."
                className="h-11 pl-9 text-base"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && title.trim()) handleSave();
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label>Date</Label>
              <Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className="mt-1 h-11 text-base" />
            </div>

            <div>
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="mt-1 h-11"><SelectValue /></SelectTrigger>
                <SelectContent className="z-[220]">
                  {categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.emoji} {cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <button
            type="button"
            onClick={toggleAllDay}
            className={cn(
              "flex w-full items-center justify-between gap-3 rounded-2xl border p-3 text-left transition",
              isAllDay ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            )}
          >
            <span>
              <span className="block text-sm font-black">All-day event</span>
              <span className="block text-xs font-semibold text-muted-foreground">Use this when the event does not need a specific time.</span>
            </span>
            <span className={cn("relative h-8 w-14 shrink-0 rounded-full transition", isAllDay ? "bg-blue-600" : "bg-slate-300")}>
              <span className={cn("absolute top-1 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow transition", isAllDay ? "left-7 text-blue-600" : "left-1 text-slate-400")}>{isAllDay && <Check className="h-3.5 w-3.5" />}</span>
            </span>
          </button>

          {!isAllDay && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <TabletTimePicker label="Start time" value={startParts} onChange={handleStartChange} />
              <TabletTimePicker label="End time" value={endParts} onChange={setEndParts} />
            </div>
          )}

          <div>
            <Label>Assign To</Label>
            <Select value={assignedPersonId} onValueChange={setAssignedPersonId}>
              <SelectTrigger className="mt-1 h-11">
                <UserRound className="mr-2 h-4 w-4 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[220]">
                <SelectItem value={FAMILY_ASSIGNMENT_ID}>👨‍👩‍👧‍👦 Family / General</SelectItem>
                {people.map((person) => (
                  <SelectItem key={person.id} value={person.id}>
                    {personEmoji(person)} {person.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <VisibilityAudienceSelector
            value={audiencePayload}
            onChange={setAudiencePayload}
            createdByEmail={user?.email || ""}
            currentUser={user}
            familyProfile={profile || {}}
          />

          <div>
            <Label>Location</Label>
            <AddressAutocompleteInput value={location} onChange={setLocation} />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between gap-3">
              <Label>Description / Notes</Label>
              <span className="text-xs font-semibold text-slate-400">{description.length}/500</span>
            </div>
            <div className="relative mt-1">
              <Tag className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, 500))}
                placeholder="Example: Pick up at 3:00 PM after baseball practice. Bring uniform and water bottle."
                className="min-h-[108px] resize-none rounded-xl bg-background pl-9 text-base leading-6"
              />
            </div>
            <p className="mt-1 text-xs font-semibold text-slate-400">These notes will show in the event details panel.</p>
          </div>
        </div>

        {!isEditing && (
          <button
            type="button"
            onClick={() => setCreateLinkedListWithEvent((current) => !current)}
            className={cn(
              "mb-2 flex w-full items-center justify-between gap-3 rounded-2xl border p-3 text-left transition",
              createLinkedListWithEvent
                ? "border-violet-200 bg-violet-50 text-violet-700"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            )}
          >
            <span className="flex items-center gap-3">
              <span className={cn(
                "flex h-9 w-9 items-center justify-center rounded-2xl",
                createLinkedListWithEvent ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-400"
              )}>
                <ListChecks className="h-4 w-4" />
              </span>

              <span>
                <span className="block text-sm font-black">
                  Create linked list after saving
                </span>
                <span className="block text-xs font-semibold text-muted-foreground">
                  Great for supplies, packing, school projects, meals, and event prep.
                </span>
              </span>
            </span>

            <span
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2",
                createLinkedListWithEvent
                  ? "border-violet-600 bg-violet-600 text-white"
                  : "border-slate-300 bg-white"
              )}
            >
              {createLinkedListWithEvent && <Check className="h-4 w-4" />}
            </span>
          </button>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!title.trim() || saving}>
            {saving
              ? "Saving..."
              : isEditing
                ? "Save Changes"
                : createLinkedListWithEvent
                  ? "Add Event + List"
                  : "Add Event"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

      <AppDialog
        open={Boolean(noticeDialog)}
        tone={noticeDialog?.tone}
        title={noticeDialog?.title}
        message={noticeDialog?.message}
        confirmLabel="Got it"
        onConfirm={() => setNoticeDialog(null)}
        onCancel={() => setNoticeDialog(null)}
      />
    </>
  );
}
