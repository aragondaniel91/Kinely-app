import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Baby, ChevronDown, Eye, HeartPulse, Plus } from "lucide-react";
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

export default function FamilySelector() {
  const { profile, allProfiles, myEmail, setActiveProfileId, isLoading } = useFamily();
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
        const memberQuery = query(ref, where("memberEmails", "array-contains", email));
        const legacyMemberQuery = query(ref, where("member_emails", "array-contains", email));
        const viewerQuery = query(ref, where("viewerEmails", "array-contains", email));
        const legacyViewerQuery = query(ref, where("viewer_emails", "array-contains", email));

        const results = await Promise.allSettled([
          getDocs(memberQuery),
          getDocs(legacyMemberQuery),
          getDocs(viewerQuery),
          getDocs(legacyViewerQuery),
        ]);

        if (results.every((result) => result.status === "rejected")) {
          throw results[0].reason;
        }

        if (!cancelled) setCustodyGroups(mapSettledFirestoreSnapshots(results, { type: "custodyGroup" }));
      } catch (error) {
        console.warn("Could not load custody groups for selector:", error);
        if (!cancelled) setCustodyGroups([]);
      }
    }

    loadCustodyGroups();

    return () => {
      cancelled = true;
    };
  }, [myEmail]);

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
        className="text-xs font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-xl"
      >
        Invitations
      </Link>
    );
  }

  const activeFamilyName = profile?.family_name || profile?.familyName || "Familia";
  const hasMultipleFamilies = Array.isArray(allProfiles) && allProfiles.length > 1;
  const hasCustodyGroups = custodyGroups.length > 0;

  if (!hasMultipleFamilies && !hasCustodyGroups) {
    return (
      <div className="text-xs font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-xl max-w-[180px] truncate">
        {activeFamilyName}
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 transition-colors">
          <span className="max-w-[150px] truncate">{activeFamilyName}</span>
          <ChevronDown className="w-3.5 h-3.5 shrink-0" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="center" className="min-w-[260px]">
        <p className="px-2 py-1.5 text-[10px] text-muted-foreground font-black uppercase tracking-wider">
          Family Spaces
        </p>

        {(allProfiles || []).map((family) => {
          const familyName = family.family_name || family.familyName || "Familia";
          const isCurrent = family.id === profile?.id;

          const isAdmin =
            normalizeEmail(family.owner_email) === normalizeEmail(myEmail) ||
            normalizeEmail(family.ownerEmail) === normalizeEmail(myEmail) ||
            normalizeEmail(family.created_by) === normalizeEmail(myEmail);

          return (
            <DropdownMenuItem
              key={family.id}
              onClick={() => setActiveProfileId(family.id)}
              className={cn(
                "flex items-center gap-2 cursor-pointer",
                isCurrent && "bg-primary/10 text-primary font-semibold"
              )}
            >
              <span className="text-base">🏠</span>

              <div className="flex flex-col min-w-0">
                <span className="truncate text-sm">{familyName}</span>
                <span className="text-[10px] text-muted-foreground">
                  {isAdmin ? "Family admin" : "Family member"}
                </span>
              </div>

              {isCurrent && <span className="ml-auto text-primary text-xs">✓</span>}
            </DropdownMenuItem>
          );
        })}

        {hasCustodyGroups && (
          <>
            <DropdownMenuSeparator />

            <p className="px-2 py-1.5 text-[10px] text-muted-foreground font-black uppercase tracking-wider">
              Custody Groups
            </p>

            {custodyGroups.map((group) => {
              const members = groupMemberEmails(group);
              const viewers = groupViewerEmails(group);
              const isMember = members.includes(normalizeEmail(myEmail));
              const isViewer = viewers.includes(normalizeEmail(myEmail));
              const children = groupChildNames(group);

              return (
                <DropdownMenuItem
                  key={group.id}
                  onClick={() => navigate("/custody")}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Baby className="h-4 w-4 text-blue-600" />

                  <div className="flex flex-col min-w-0">
                    <span className="truncate text-sm">{group.name || "Custody Group"}</span>
                    <span className="truncate text-[10px] text-muted-foreground">
                      {children.length ? `${children.join(", ")} · ` : ""}
                      {isMember ? "Can edit custody" : isViewer ? "View only" : "Shared custody"}
                    </span>
                  </div>

                  {!isMember && isViewer && <Eye className="ml-auto h-3.5 w-3.5 text-slate-400" />}
                </DropdownMenuItem>
              );
            })}
          </>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link to="/children" className="flex items-center gap-2 cursor-pointer">
            <HeartPulse className="w-3.5 h-3.5 text-indigo-600" />
            <span className="text-sm">Child care profiles</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link to="/profile" className="flex items-center gap-2 cursor-pointer">
            <Plus className="w-3.5 h-3.5" />
            <span className="text-sm">Manage family spaces</span>
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
