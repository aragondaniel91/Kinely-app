import { Outlet, Link, useLocation } from "react-router-dom";
import {
  Calendar,
  CheckSquare,
  HeartHandshake,
  UtensilsCrossed,
  ListChecks,
  Home,
  User,
} from "lucide-react";

import { cn } from "@/lib/utils";
import FamilySelector from "@/components/layout/FamilySelector";
import KinlyLogo from "@/components/brand/KinlyLogo";
import { useFamily } from "@/lib/FamilyContext";
import { canReadModule } from "@/lib/modulePermissions";

const navItems = [
  { icon: Home, label: "Home", path: "/", module: "home", requiresFamily: true },
  { icon: Calendar, label: "Calendar", path: "/calendar", module: "calendar", requiresFamily: true },
  { icon: HeartHandshake, label: "Custody", path: "/custody", module: "custody" },
  { icon: CheckSquare, label: "Tasks", path: "/tasks", module: "tasks", requiresFamily: true },
  { icon: UtensilsCrossed, label: "Meals", path: "/meals", module: "meals", requiresFamily: true },
  { icon: ListChecks, label: "Lists", path: "/lists", module: "lists", requiresFamily: true },
  { icon: User, label: "Profile", path: "/profile" },
];

function AppShellLoader() {
  return (
    <div className="kinly-gradient-bg min-h-screen">
      <div className="fixed left-4 top-4">
        <KinlyLogo />
      </div>
      <div className="fixed inset-x-0 bottom-0 z-50 px-3 pb-3">
        <div className="mx-auto flex max-w-3xl justify-around rounded-[1.8rem] border border-white/80 bg-white/78 px-2 py-2 shadow-[0_18px_44px_rgba(15,23,42,0.12)] backdrop-blur-2xl">
          {Array.from({ length: 7 }).map((_, index) => (
            <div key={index} className="flex min-w-[62px] flex-col items-center gap-1 px-2 py-1">
              <div className="h-6 w-6 animate-pulse rounded-full bg-slate-200" />
              <div className="h-2 w-10 animate-pulse rounded bg-slate-200" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AppShell() {
  const location = useLocation();
  const { isLoading, profile, familyId, perms, hasCustodyAccess, custodyGroupsLoading, isAdmin, isOwner } = useFamily();

  if (isLoading) {
    return <AppShellLoader />;
  }

  const hasFamilySpace = Boolean(profile && familyId);
  const visibleNavItems = navItems.filter((item) => {
    if (item.requiresFamily && !hasFamilySpace) return false;
    if (item.module === "custody") {
      return hasFamilySpace && (isAdmin || isOwner || canReadModule(perms, "custody") || (!custodyGroupsLoading && hasCustodyAccess));
    }
    if (item.module && !canReadModule(perms, item.module)) return false;
    return true;
  });

  return (
    <div className="kinly-gradient-bg flex min-h-dvh flex-col overflow-x-hidden">
      <header className="sticky top-0 z-40 bg-transparent px-3 py-2.5 md:px-6 md:py-3">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 rounded-[1.55rem] border border-white/80 bg-white/76 px-3 py-2 shadow-[0_10px_30px_rgba(15,23,42,0.06)] backdrop-blur-2xl md:px-4">
          <Link to="/" className="shrink-0">
            <KinlyLogo />
          </Link>
          <FamilySelector />
        </div>
      </header>

      <main className="flex-1 min-h-0 overflow-x-hidden pb-[calc(7.25rem+env(safe-area-inset-bottom,0px))]">
        <Outlet />
      </main>

      <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-50 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
        <div className="pointer-events-auto mx-auto max-w-3xl rounded-[1.85rem] border border-white/80 bg-white/78 p-1.5 shadow-[0_20px_52px_rgba(15,23,42,0.15)] backdrop-blur-2xl transition hover:bg-white/86">
          <div className="grid grid-flow-col auto-cols-fr items-center gap-1 overflow-x-auto overscroll-x-contain sm:flex sm:justify-around">
            {visibleNavItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex min-w-[52px] flex-col items-center gap-1 rounded-[1.35rem] px-2 py-2 text-[10px] font-black transition-all duration-200 sm:min-w-[60px] md:min-w-[68px] md:px-3 md:text-[11px]",
                    isActive
                      ? "bg-blue-50/95 text-blue-700 shadow-[0_8px_20px_rgba(91,141,239,0.16)] ring-1 ring-blue-100"
                      : "text-slate-400 hover:bg-white/80 hover:text-slate-700"
                  )}
                >
                  <Icon className={cn("h-5 w-5", isActive && "stroke-[2.6]")} />
                  <span className="font-heading leading-none">
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}
