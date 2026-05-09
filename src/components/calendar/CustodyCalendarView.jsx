import React, { useEffect, useMemo, useState } from "react";
import { Baby } from "lucide-react";
import { collection, getDocs, query, where } from "firebase/firestore";

import { db } from "@/lib/firebase";
import { FamilyContext, useFamily } from "@/lib/FamilyContext";
import CustodyCalendar from "@/pages/CustodyCalendar";
import { Badge } from "@/components/ui/badge";
import CustodyScopeMetadataBackfill from "@/components/calendar/CustodyScopeMetadataBackfill";

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function childLabel(child) {
  if (!child) return "";
  if (typeof child === "string") return child;
  return child.name || child.fullName || child.displayName || child.childName || child.firstName || child.email || "Child";
}

function childId(child) {
  if (!child) return "";
  if (typeof child === "string") return child;
  return child.id || child.uid || child.childId || child.child_id || child.name || child.fullName || "";
}

function parentLabel(parent) {
  if (!parent) return "";
  if (typeof parent === "string") return parent;
  return parent.name || parent.fullName || parent.displayName || parent.email || "Parent";
}

function groupChildrenRaw(group) {
  if (!group) return [];

  if (Array.isArray(group.children) && group.children.length) return group.children;
  if (Array.isArray(group.childNames) && group.childNames.length) return group.childNames;
  if (Array.isArray(group.childIds) && group.childIds.length) return group.childIds;
  if (group.childName) return [group.childName];
  if (group.childId) return [group.childId];

  return [];
}

function groupChildren(group) {
  return groupChildrenRaw(group).map(childLabel).filter(Boolean);
}

function groupChildIds(group) {
  return groupChildrenRaw(group).map(childId).filter(Boolean);
}

function groupParents(group) {
  if (!group) return [];
  if (Array.isArray(group.coParents)) return group.coParents;
  if (Array.isArray(group.parents)) return group.parents;
  return [];
}

function groupMemberEmails(group) {
  const explicitMembers = Array.isArray(group?.memberEmails) ? group.memberEmails : [];
  const legacyMembers = Array.isArray(group?.member_emails) ? group.member_emails : [];
  const parentEmails = groupParents(group).map((parent) => parent.email).filter(Boolean);
  return [...new Set([...explicitMembers, ...legacyMembers, ...parentEmails].map(normalizeEmail).filter(Boolean))];
}

function groupViewerEmails(group) {
  const viewerEmails = Array.isArray(group?.viewerEmails) ? group.viewerEmails : [];
  const legacyViewerEmails = Array.isArray(group?.viewer_emails) ? group.viewer_emails : [];
  return [...new Set([...viewerEmails, ...legacyViewerEmails].map(normalizeEmail).filter(Boolean))];
}

function resolveCustodyAccess(group, myEmail) {
  if (!group || group.legacy) return { canRead: true, canWrite: true, isViewerOnly: false };

  const email = normalizeEmail(myEmail);
  const members = groupMemberEmails(group);
  const viewers = groupViewerEmails(group);
  const isMember = members.includes(email);
  const isViewer = viewers.includes(email);

  return {
    canRead: isMember || isViewer,
    canWrite: isMember,
    isViewerOnly: !isMember && isViewer,
  };
}

function resolveCustodyParentNames(group, fallbackDadName, fallbackMomName) {
  const parents = groupParents(group);
  const dadParent = parents.find((parent) => parent.role === "dad");
  const momParent = parents.find((parent) => parent.role === "mom");

  return {
    custodyDadName: parentLabel(dadParent) || parentLabel(parents[0]) || fallbackDadName || "Dad",
    custodyMomName: parentLabel(momParent) || parentLabel(parents[1]) || fallbackMomName || "Mom",
    custodyDadEmail: dadParent?.email || parents[0]?.email || "",
    custodyMomEmail: momParent?.email || parents[1]?.email || "",
  };
}

function CustodyGroupSelector({ groups, selectedGroupId, onSelect, myEmail }) {
  if (!groups.length) return null;

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {groups.map((group) => {
        const active = group.id === selectedGroupId;
        const children = groupChildren(group);
        const parents = groupParents(group);
        const access = resolveCustodyAccess(group, myEmail);
        const { custodyDadName, custodyMomName } = resolveCustodyParentNames(group, "Dad", "Mom");
        const parentNames = parents.length > 0
          ? parents.map(parentLabel).filter(Boolean).join(" & ")
          : `${custodyDadName} & ${custodyMomName}`;
        const childNames = children.join(", ") || "Child not selected";

        return (
          <button
            key={group.id}
            type="button"
            onClick={() => onSelect(group.id)}
            className={`min-w-[280px] rounded-2xl border px-4 py-3 text-left transition ${
              active
                ? "border-blue-300 bg-blue-50 shadow-sm"
                : "border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50/40"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
                <Baby className="h-4 w-4" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-black text-slate-950">
                    {group.name || "Custody Group"}
                  </p>
                  {group.legacy && (
                    <Badge variant="outline" className="border-amber-200 bg-amber-50 text-[10px] text-amber-700">
                      Legacy
                    </Badge>
                  )}
                  {access.isViewerOnly && (
                    <Badge variant="outline" className="border-slate-200 bg-white text-[10px] text-slate-500">
                      View only
                    </Badge>
                  )}
                </div>
                <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">
                  {childNames} · {parentNames}
                </p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export default function CustodyCalendarView({
  viewMode = "month",
  setViewMode,
}) {
  const familyContext = useFamily();
  const { myEmail, profile, familyId, dadName, momName, perms } = familyContext;
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [loadingGroups, setLoadingGroups] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadGroups() {
      if (!myEmail) {
        setGroups([]);
        setLoadingGroups(false);
        return;
      }

      setLoadingGroups(true);

      try {
        const collectionRef = collection(db, "custodyGroups");
        const memberQuery = query(collectionRef, where("memberEmails", "array-contains", myEmail));
        const viewerQuery = query(collectionRef, where("viewerEmails", "array-contains", myEmail));

        const [memberSnap, viewerSnap] = await Promise.allSettled([
          getDocs(memberQuery),
          getDocs(viewerQuery),
        ]);

        const groupMap = new Map();

        if (memberSnap.status === "fulfilled") {
          memberSnap.value.docs.forEach((docSnap) => {
            groupMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() });
          });
        }

        if (viewerSnap.status === "fulfilled") {
          viewerSnap.value.docs.forEach((docSnap) => {
            groupMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() });
          });
        }

        const data = Array.from(groupMap.values());

        if (!cancelled) {
          setGroups(data);
          setSelectedGroupId((current) => current || data[0]?.id || "legacy-family-custody");
        }
      } catch (error) {
        console.error("Error loading custody groups:", error);
        if (!cancelled) setGroups([]);
      } finally {
        if (!cancelled) setLoadingGroups(false);
      }
    }

    loadGroups();

    return () => {
      cancelled = true;
    };
  }, [myEmail, familyId]);

  const legacyGroup = useMemo(
    () => ({
      id: "legacy-family-custody",
      name: `${profile?.family_name || profile?.familyName || "Family"} Custody`,
      children: profile?.children || [],
      childIds: Array.isArray(profile?.children) ? profile.children.map(childId).filter(Boolean) : [],
      coParents: [
        { name: dadName || "Dad", email: myEmail || "", role: "dad" },
        { name: momName || "Mom", email: profile?.parent2_email || profile?.parent2Email || "", role: "mom" },
      ],
      memberEmails: [myEmail, profile?.parent2_email || profile?.parent2Email].filter(Boolean),
      viewerEmails: [],
      legacy: true,
    }),
    [profile, dadName, momName, myEmail]
  );

  const availableGroups = useMemo(() => {
    if (groups.length > 0) return groups;
    if (loadingGroups) return [];
    return [legacyGroup];
  }, [groups, legacyGroup, loadingGroups]);

  const selectedGroup = useMemo(
    () => availableGroups.find((group) => group.id === selectedGroupId) || availableGroups[0] || null,
    [availableGroups, selectedGroupId]
  );

  const selectedChildren = groupChildren(selectedGroup);
  const selectedChildIds = groupChildIds(selectedGroup);
  const selectedParents = groupParents(selectedGroup);
  const custodyAccess = resolveCustodyAccess(selectedGroup, myEmail);
  const custodyParentNames = resolveCustodyParentNames(selectedGroup, dadName, momName);
  const selectedCustodyGroupId = selectedGroup?.legacy ? "" : selectedGroup?.id || "";
  const scopedFamilyId = selectedCustodyGroupId || familyId;
  const canRenderCalendar = !loadingGroups && selectedGroup && scopedFamilyId && custodyAccess.canRead;

  const custodyPerms = useMemo(() => ({
    ...perms,
    calendar: {
      ...(perms?.calendar || {}),
      read: custodyAccess.canRead,
      write: Boolean(perms?.calendar?.write !== false && custodyAccess.canWrite),
    },
  }), [perms, custodyAccess.canRead, custodyAccess.canWrite]);

  const scopedFamilyContext = useMemo(
    () => ({
      ...familyContext,
      familyId: scopedFamilyId,
      actualFamilyId: familyId,
      householdFamilyId: familyId,
      custodyScopeId: selectedCustodyGroupId,
      custodyGroupId: selectedCustodyGroupId,
      selectedCustodyGroup: selectedGroup,
      selectedCustodyGroupId,
      custodyModuleActive: true,
      custodyAccess,
      perms: custodyPerms,
      custodyChildren: selectedChildren,
      custodyChildIds: selectedChildIds,
      custodyCoParents: selectedParents,
      dadName: custodyParentNames.custodyDadName,
      momName: custodyParentNames.custodyMomName,
      custodyParentOverride: {
        dadName: custodyParentNames.custodyDadName,
        momName: custodyParentNames.custodyMomName,
        dadEmail: custodyParentNames.custodyDadEmail,
        momEmail: custodyParentNames.custodyMomEmail,
        custodyGroupId: selectedCustodyGroupId,
        custodyGroupName: selectedGroup?.name || "",
      },
    }),
    [
      familyContext,
      scopedFamilyId,
      familyId,
      selectedCustodyGroupId,
      selectedGroup,
      custodyAccess,
      custodyPerms,
      selectedChildren,
      selectedChildIds,
      selectedParents,
      custodyParentNames.custodyDadName,
      custodyParentNames.custodyMomName,
      custodyParentNames.custodyDadEmail,
      custodyParentNames.custodyMomEmail,
      selectedGroup?.name,
    ]
  );

  return (
    <div className="min-h-full bg-[#f8fbff] p-2 md:p-4">
      <div className="mx-auto max-w-none rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-white px-4 py-3 md:px-8">
          {loadingGroups ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-500">
              Loading custody groups...
            </div>
          ) : (
            <CustodyGroupSelector
              groups={availableGroups}
              selectedGroupId={selectedGroup?.id}
              onSelect={setSelectedGroupId}
              myEmail={myEmail}
            />
          )}
        </div>

        <div className="custody-original-calendar-wrapper bg-[#f8fbff]">
          {canRenderCalendar ? (
            <FamilyContext.Provider value={scopedFamilyContext}>
              <CustodyScopeMetadataBackfill>
                <CustodyCalendar
                  viewMode={viewMode === "mixed" ? "month" : viewMode}
                  setViewMode={setViewMode}
                  showFilters
                  selectedCustodyGroup={selectedGroup}
                  selectedCustodyGroupId={selectedCustodyGroupId}
                  custodyDadName={custodyParentNames.custodyDadName}
                  custodyMomName={custodyParentNames.custodyMomName}
                  custodyDadEmail={custodyParentNames.custodyDadEmail}
                  custodyMomEmail={custodyParentNames.custodyMomEmail}
                  custodyChildren={selectedChildren}
                  custodyChildIds={selectedChildIds}
                  custodyCoParents={selectedParents}
                />
              </CustodyScopeMetadataBackfill>
            </FamilyContext.Provider>
          ) : (
            <div className="p-8 text-center text-sm font-bold text-slate-400">
              {loadingGroups ? "Loading custody calendar..." : "You do not have access to this custody calendar."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
