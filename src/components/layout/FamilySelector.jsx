import React from "react";
import { Link } from "react-router-dom";
import { ChevronDown, Plus } from "lucide-react";

import { useFamily } from "@/lib/FamilyContext";
import { cn } from "@/lib/utils";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function FamilySelector() {
  const { profile, allProfiles, myEmail, setActiveProfileId, isLoading } =
    useFamily();

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
        to="/profile"
        className="text-xs font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-xl"
      >
        Crear familia
      </Link>
    );
  }

  if (!allProfiles || allProfiles.length <= 1) {
    return (
      <div className="text-xs font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-xl max-w-[180px] truncate">
        {profile?.family_name || profile?.familyName || "Familia"}
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 transition-colors">
          <span className="max-w-[140px] truncate">
            {profile?.family_name || profile?.familyName || "Familia"}
          </span>
          <ChevronDown className="w-3.5 h-3.5 shrink-0" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="center" className="min-w-[200px]">
        <p className="px-2 py-1.5 text-xs text-muted-foreground font-semibold uppercase tracking-wider">
          Mis familias
        </p>

        {allProfiles.map((family) => {
          const familyName =
            family.family_name || family.familyName || "Familia";
          const isCurrent = family.id === profile?.id;

          const isAdmin =
            family.owner_email === myEmail ||
            family.ownerEmail === myEmail ||
            family.created_by === myEmail;

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

                {isAdmin && (
                  <span className="text-[10px] text-muted-foreground">
                    Admin
                  </span>
                )}
              </div>

              {isCurrent && (
                <span className="ml-auto text-primary text-xs">✓</span>
              )}
            </DropdownMenuItem>
          );
        })}

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link
            to="/profile"
            className="flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="text-sm">Nueva familia</span>
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
