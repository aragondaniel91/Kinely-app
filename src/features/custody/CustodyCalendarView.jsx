import React, { useEffect, useMemo, useState } from "react";
import { Baby } from "lucide-react";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";

import { db } from "@/lib/firebase";
import { FamilyContext, useFamily } from "@/lib/FamilyContext";
import CustodyCalendar from "@/features/custody/calendar/CustodyCalendarPage";
import CustodyDashboardPro from "@/features/custody/CustodyDashboardPro";
import ExchangeHub from "@/features/custody/ExchangeHub";
import PackingHub from "@/features/custody/PackingHub";
import SmartNotificationsHub from "@/features/custody/SmartNotificationsHub";
import BudgetHub from "@/features/custody/BudgetHub";
import { Badge } from "@/components/ui/badge";
import { getColorClasses, normalizeColorId } from "@/lib/appColorUtils";
import CustodyScopeMetadataBackfill from "@/features/custody/CustodyScopeMetadataBackfill";

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

function parentColor(parent, fallback) {
  return normalizeColorId(
    parent?.colorId ||
      parent?.color_id ||
      parent?.color ||
      parent?.custodyColor ||
      parent?.custody_color ||
      fallback,
    fallback
  );
}

function custodyGroupColorClasses(group, fallback = "blue") {
  const parents = groupParents(group);
  const firstParent = parents[0] || {};
  const rawColor =
    group?.colorId ||
    group?.color_id ||
    group?.color ||
    firstParent.colorId ||
    firstParent.color_id ||
    firstParent.color ||
    firstParent.custodyColor ||
    firstParent.custody_color ||
    fallback;

  const colorId = normalizeColorId(rawColor, fallback);
  return getColorClasses(colorId, fallback);
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
  const parents = Array.isArray(group.parents) ? group.parents : [];
  const coParents = Array.isArray(group.coParents) ? group.coParents : [];

  if (!parents.length) return coParents;
  if (!coParents.length) return parents;

  const merged = new Map();
  [...coParents, ...parents].forEach((parent, index) => {
    const key = normalizeEmail(parent?.email) || parent?.role || `parent-${index}`;
    merged.set(key, { ...(merged.get(key) || {}), ...parent });
  });

  return Array.from(merged.values());
}

function groupMemberEmails(group) {
  const explicitMembers = Array.isArray(group?.memberEmails) ? group.memberEmails : [];
  const legacyMembers = Array.isArray(group?.member_emails) ? group.member_emails : [];
  return [...new Set([...explicitMembers, ...legacyMembers].map(normalizeEmail).filter(Boolean))];
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
    custodyDadColor: parentColor(dadParent || parents[0], "blue"),
    custodyMomColor: parentColor(momParent || parents[1], "amber"),
  };
}

function CustodyGroupSelector({ groups, selectedGroupId, onSelect, myEmail }) {
  if (!groups.length) return null;

  return (
    <div className="rounded-[1.55rem] border border-white/80 bg-white/88 p-3 shadow-[0_10px_28px_rgba(15,23,42,0.05)] backdrop-blur md:p-3.5">
      <div className="mb-2.5 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-500/80">Custody space</p>
          <p className="mt-0.5 text-base font-black tracking-tight text-slate-950">Child/family view</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {groups.map((group) => {
          const active = group.id === selectedGroupId;
          const colorClasses = custodyGroupColorClasses(group, "blue");
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
              className={`min-w-[220px] max-w-full flex-1 rounded-[1.15rem] border px-3 py-2.5 text-left transition sm:max-w-[310px] ${
                active
                  ? `${colorClasses.border} ${colorClasses.bg} shadow-sm ring-1 ${colorClasses.ring}`
                  : `border-slate-200 bg-slate-50/70 hover:${colorClasses.border} hover:bg-white hover:shadow-sm`
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border ${active ? `${colorClasses.borderStrong} ${colorClasses.stripe} text-white` : `${colorClasses.border} bg-white ${colorClasses.text}`}`}>
                  <Baby className="h-4 w-4" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-sm font-black text-slate-950">
                      {group.name || "Custody Group"}
                    </p>
                    {active && (
                      <Badge className={`rounded-full px-2 py-0.5 text-[10px] font-black hover:${colorClasses.bg} ${colorClasses.bg} ${colorClasses.text}`}>
                        Active
                      </Badge>
                    )}
                    {group.legacy && (
                      <Badge variant="outline" className="border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] text-amber-700">
                        Legacy
                      </Badge>
                    )}
                    {access.isViewerOnly && (
                      <Badge variant="outline" className="border-slate-200 bg-white px-2 py-0.5 text-[10px] text-slate-500">
                        View only
                      </Badge>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">
                    {childNames}
                  </p>
                  <p className="truncate text-[11px] font-bold text-slate-400">
                    {parentNames}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function CustodyCalendarView({
  viewMode = "month",
  setViewMode,
  mode = "calendar",
  onOpenSchedule,
  onOpenExchange,
  onOpenPacking,
  onOpenNotifications,
  onOpenBudget,
  onOpenChat,
}) {
  const familyContext = useFamily();
  const { myEmail, profile, familyId, dadName, momName, dadColor, momColor, custodyDadColor, custodyMomColor, perms } = familyContext;
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

  useEffect(() => {
    let cancelled = false;

    async function refreshSelectedGroup() {
      if (!selectedGroupId || selectedGroupId === "legacy-family-custody") return;

      try {
        const groupRef = doc(db, "custodyGroups", selectedGroupId);
        const snap = await getDoc(groupRef);
        if (!snap.exists() || cancelled) return;

        const freshGroup = { id: snap.id, ...snap.data() };
        setGroups((current) => {
          const exists = current.some((group) => group.id === freshGroup.id);
          if (!exists) return [...current, freshGroup];
          return current.map((group) => group.id === freshGroup.id ? freshGroup : group);
        });
      } catch (error) {
        console.warn("Could not refresh selected custody group:", error);
      }
    }

    refreshSelectedGroup();

    return () => {
      cancelled = true;
    };
  }, [selectedGroupId]);

  const legacyGroup = useMemo(
    () => ({
      id: "legacy-family-custody",
      name: `${profile?.family_name || profile?.familyName || "Family"} Custody`,
      children: profile?.children || [],
      childIds: Array.isArray(profile?.children) ? profile.children.map(childId).filter(Boolean) : [],
      coParents: [
        {
          name: dadName || "Dad",
          email: myEmail || "",
          role: "dad",
          color: normalizeColorId(custodyDadColor || dadColor || "blue", "blue"),
        },
        {
          name: momName || "Mom",
          email: profile?.parent2_email || profile?.parent2Email || "",
          role: "mom",
          color: normalizeColorId(custodyMomColor || momColor || "amber", "amber"),
        },
      ],
      memberEmails: [myEmail, profile?.parent2_email || profile?.parent2Email].filter(Boolean),
      viewerEmails: [],
      legacy: true,
    }),
    [profile, dadName, momName, myEmail, dadColor, momColor, custodyDadColor, custodyMomColor]
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
      householdFamilyId: selectedGroup?.householdFamilyId || selectedGroup?.actualFamilyId || familyId,
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
      dadColor: custodyParentNames.custodyDadColor,
      momColor: custodyParentNames.custodyMomColor,
      custodyDadColor: custodyParentNames.custodyDadColor,
      custodyMomColor: custodyParentNames.custodyMomColor,
      custodyParentOverride: {
        dadName: custodyParentNames.custodyDadName,
        momName: custodyParentNames.custodyMomName,
        dadEmail: custodyParentNames.custodyDadEmail,
        momEmail: custodyParentNames.custodyMomEmail,
        dadColor: custodyParentNames.custodyDadColor,
        momColor: custodyParentNames.custodyMomColor,
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
      custodyParentNames.custodyDadColor,
      custodyParentNames.custodyMomColor,
      selectedGroup?.name,
      selectedGroup?.householdFamilyId,
      selectedGroup?.actualFamilyId,
    ]
  );

  const groupSelector = loadingGroups ? (
    <div className="rounded-[1.55rem] border border-white/80 bg-white/88 p-3 text-sm font-bold text-slate-500 shadow-[0_10px_28px_rgba(15,23,42,0.05)] backdrop-blur md:p-3.5">
      Loading custody groups...
    </div>
  ) : (
    <CustodyGroupSelector
      groups={availableGroups}
      selectedGroupId={selectedGroup?.id}
      onSelect={setSelectedGroupId}
      myEmail={myEmail}
    />
  );

  const renderScopedTool = () => {
    if (mode === "exchange") return <ExchangeHub />;
    if (mode === "packing") return <PackingHub />;
    if (mode === "notifications") return <SmartNotificationsHub />;
    if (mode === "budget") return <BudgetHub />;
    return null;
  };

  if (mode === "dashboard") {
    return (
      <div className="min-h-full bg-[#F8F7F4] pb-6">
        <div className="mx-auto max-w-7xl px-3 pt-2 md:px-5 lg:px-6">
          {groupSelector}
        </div>

        {canRenderCalendar ? (
          <FamilyContext.Provider value={scopedFamilyContext}>
            <CustodyScopeMetadataBackfill>
              <CustodyDashboardPro
                onOpenSchedule={onOpenSchedule}
                onOpenExchange={onOpenExchange}
                onOpenPacking={onOpenPacking}
                onOpenNotifications={onOpenNotifications}
                onOpenBudget={onOpenBudget}
                onOpenChat={onOpenChat}
              />
            </CustodyScopeMetadataBackfill>
          </FamilyContext.Provider>
        ) : (
          <div className="p-8 text-center text-sm font-bold text-slate-400">
            {loadingGroups ? "Loading custody dashboard..." : "You do not have access to this custody dashboard."}
          </div>
        )}
      </div>
    );
  }

  if (["exchange", "packing", "notifications", "budget"].includes(mode)) {
    return (
      <div className="min-h-full bg-[#F8F7F4] pb-6">
        <div className="mx-auto max-w-7xl px-3 pt-2 md:px-5 lg:px-6">
          {groupSelector}
        </div>

        {canRenderCalendar ? (
          <FamilyContext.Provider value={scopedFamilyContext}>
            <CustodyScopeMetadataBackfill>
              {renderScopedTool()}
            </CustodyScopeMetadataBackfill>
          </FamilyContext.Provider>
        ) : (
          <div className="p-8 text-center text-sm font-bold text-slate-400">
            {loadingGroups ? "Loading custody tool..." : "You do not have access to this custody tool."}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#F8F7F4] px-2 pb-20 pt-2 md:px-4 md:pb-24 md:pt-4 lg:pb-8">
      <div className="mx-auto max-w-7xl space-y-3">
        {groupSelector}

        <div className="rounded-[1.8rem] border border-white/80 bg-white shadow-[0_12px_35px_rgba(15,23,42,0.05)]">
          <div className="custody-original-calendar-wrapper bg-[#F8F7F4]">
            {canRenderCalendar ? (
              <FamilyContext.Provider value={scopedFamilyContext}>
                <CustodyScopeMetadataBackfill>
                  <CustodyCalendar
                    key={`${selectedCustodyGroupId}-${custodyParentNames.custodyDadColor}-${custodyParentNames.custodyMomColor}`}
                    viewMode={viewMode === "mixed" ? "month" : viewMode}
                    setViewMode={setViewMode}
                    showFilters
                    selectedCustodyGroup={selectedGroup}
                    selectedCustodyGroupId={selectedCustodyGroupId}
                    custodyDadName={custodyParentNames.custodyDadName}
                    custodyMomName={custodyParentNames.custodyMomName}
                    custodyDadEmail={custodyParentNames.custodyDadEmail}
                    custodyMomEmail={custodyParentNames.custodyMomEmail}
                    custodyDadColor={custodyParentNames.custodyDadColor}
                    custodyMomColor={custodyParentNames.custodyMomColor}
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
    </div>
  );
}
