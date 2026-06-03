import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Baby, CalendarHeart, Check, ChevronDown, Eye, HeartPulse, Home, Plus } from "lucide-react";
import { collection, getDocs, query, where } from "firebase/firestore";

import { useFamily } from "@/lib/FamilyContext";
import { db } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import { mapSettledFirestoreSnapshots } from "@/core/firestore/firestoreDocUtils";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function groupChildNames(group) {
  if (Array.isArray(group?.childNames) && group.childNames.length) return group.childNames;
  if (Array.isArray(group?.children) && group.children.length) {
    return group.children
      .map((child) => (typeof child === "string" ? child : child?.name || child?.childName || child?.displayName))
      .filter(Boolean);
  }
  if (group?.childName) return [group.childName];
  return [];
}

function groupMemberEmails(group) {
  const explicit = Array.isArray(group?.memberEmails) ? group.memberEmails : [];
  const legacy = Array.isArray(group?.member_emails) ? group.member_emails : [];
  return [...new Set([...explicit, ...legacy].map(normalizeEmail).filter(Boolean))];
}

function groupViewerEmails(group) {
  const explicit = Array.isArray(group?.viewerEmails) ? group.viewerEmails : [];
  const legacy = Array.isArray(group?.viewer_emails) ? group.viewer_emails : [];
  return [...new Set([...explicit, ...legacy].map(normalizeEmail).filter(Boolean))];
}

function familyIsAdmin(family, email) {
  const cleanEmail = normalizeEmail(email);
  const adminEmails = [
    ...(Array.isArray(family?.adminEmails) ? family.adminEmails : []),
    ...(Array.isArray(family?.admin_emails) ? family.admin_emails : []),
  ].map(normalizeEmail);
  const memberRecord = (Array.isArray(family?.members) ? family.members : []).find((member) => {
    return normalizeEmail(member.email) === cleanEmail;
  });
  const memberAppRole = String(memberRecord?.appRole || memberRecord?.app_role || "").toLowerCase();

  return (
    normalizeEmail(family?.owner_email) === cleanEmail ||
    normalizeEmail(family?.ownerEmail) === cleanEmail ||
    normalizeEmail(family?.createdByEmail) === cleanEmail ||
    normalizeEmail(family?.created_by_email) === cleanEmail ||
    normalizeEmail(family?.created_by) === cleanEmail ||
    adminEmails.includes(cleanEmail) ||
    memberRecord?.isAdmin === true ||
    memberRecord?.is_admin === true ||
    memberRecord?.admin === true ||
    memberAppRole === "owner" ||
    memberAppRole === "admin"
  );
}

export default function FamilySelector() {
  const { profile, allProfiles, myEmail, familyId, setActiveProfileId, isLoading } = useFamily();
  const navigate = useNavigate();
  const [custodyGroups, setCustodyGroups] = useState([]);

  useEffect(() => {
    let cancelled = false;

    async function loadCustodyGroups() {
      const email = normalizeEmail(myEmail);
      if (!email) {
        setCustodyGroups([]);
        return;
      }

      try {
        const ref = collection(db, "custodyGroups");
        const querySpecs = [
          query(ref, where("memberEmails", "array-contains", email)),
          query(ref, where("member_emails", "array-contains", email)),
          query(ref, where("viewerEmails", "array-contains", email)),
          query(ref, where("viewer_emails", "array-contains", email)),
          query(ref, where("adminEmails", "array-contains", email)),
          query(ref, where("admin_emails", "array-contains", email)),
          query(ref, where("ownerEmail", "==", email)),
          query(ref, where("owner_email", "==", email)),
        ];

        const results = await Promise.allSettled(querySpecs.map((custodyQuery) => getDocs(custodyQuery)));

        if (results.every((result) => result.status === "rejected")) {
          throw results[0].reason;
        }

        if (!cancelled) {
          const groups = mapSettledFirestoreSnapshots(results, { type: "custodyGroup" });
          setCustodyGroups(groups.filter((group) => {
            const linkedFamilies = [
              group.familyId,
              group.family_id,
              group.householdFamilyId,
              group.household_family_id,
              ...(Array.isArray(group.linkedFamilyIds) ? group.linkedFamilyIds : []),
            ].filter(Boolean);

            return !familyId || linkedFamilies.length === 0 || linkedFamilies.includes(familyId);
          }));
        }
      } catch (error) {
        console.warn("Could not load custody groups for selector:", error);
        if (!cancelled) setCustodyGroups([]);
      }
    }

    loadCustodyGroups();

    return () => {
      cancelled = true;
    };
  }, [myEmail, familyId]);

  if (isLoading) {
    return (
      <div className="text-xs font-semibold text-muted-foreground">
        Loading family...
      </div>
    );
  }

  if (!profile) {
    return (
      <Link
        to="/profile?tab=invitations"
        className="rounded-xl bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary"
      >
        Invitations
      </Link>
    );
  }

  const activeFamilyName = profile?.family_name || profile?.familyName || "Family";
  const hasCustodyGroups = custodyGroups.length > 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-xl bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary transition-colors hover:bg-primary/20"
        >
          <span className="max-w-[150px] truncate">{activeFamilyName}</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="center" className="min-w-[280px] rounded-2xl border-slate-200 bg-white p-2 shadow-xl">
        <p className="px-2 py-1.5 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
          Family Spaces
        </p>

        {(allProfiles || []).map((family) => {
          const familyName = family.family_name || family.familyName || "Family";
          const isCurrent = family.id === profile?.id;
          const isAdmin = familyIsAdmin(family, myEmail);

          return (
            <DropdownMenuItem
              key={family.id}
              onClick={() => setActiveProfileId(family.id)}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-xl px-2.5 py-2",
                isCurrent && "bg-primary/10 text-primary font-semibold"
              )}
            >
              <Home className="h-4 w-4 text-indigo-600" />

              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm">{familyName}</span>
                <span className="text-[10px] text-muted-foreground">
                  {isAdmin ? "Family admin" : "Family member"}
                </span>
              </div>

              {isCurrent && <Check className="ml-auto h-4 w-4 text-primary" />}
            </DropdownMenuItem>
          );
        })}

        <DropdownMenuSeparator />

        <p className="px-2 py-1.5 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
          Custody Groups
        </p>

        {hasCustodyGroups ? (
          custodyGroups.map((group) => {
            const members = groupMemberEmails(group);
            const viewers = groupViewerEmails(group);
            const isMember = members.includes(normalizeEmail(myEmail));
            const isViewer = viewers.includes(normalizeEmail(myEmail));
            const children = groupChildNames(group);

            return (
              <DropdownMenuItem
                key={group.id}
                onClick={() => navigate("/custody")}
                className="flex cursor-pointer items-center gap-2 rounded-xl px-2.5 py-2"
              >
                <Baby className="h-4 w-4 text-blue-600" />

                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm">{group.name || "Custody Group"}</span>
                  <span className="truncate text-[10px] text-muted-foreground">
                    {children.length ? `${children.join(", ")} - ` : ""}
                    {isMember ? "Can edit custody" : isViewer ? "View only" : "Shared custody"}
                  </span>
                </div>

                {!isMember && isViewer && <Eye className="ml-auto h-3.5 w-3.5 text-slate-400" />}
              </DropdownMenuItem>
            );
          })
        ) : (
          <div className="rounded-xl bg-slate-50 px-2.5 py-2 text-xs font-semibold leading-5 text-slate-500">
            No custody groups linked to this account yet.
          </div>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link to="/profile?tab=children" className="flex cursor-pointer items-center gap-2 rounded-xl px-2.5 py-2">
            <HeartPulse className="h-3.5 w-3.5 text-indigo-600" />
            <span className="text-sm">Child care profiles</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link to="/profile?tab=families" className="flex cursor-pointer items-center gap-2 rounded-xl px-2.5 py-2">
            <Plus className="h-3.5 w-3.5" />
            <span className="text-sm">Manage family spaces</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link to="/profile?tab=custody" className="flex cursor-pointer items-center gap-2 rounded-xl px-2.5 py-2">
            <CalendarHeart className="h-3.5 w-3.5 text-blue-600" />
            <span className="text-sm">Manage custody groups</span>
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
