import { Outlet, Link, useLocation } from "react-router-dom";
import {
  Calendar,
  CheckSquare,
  HeartHandshake,
  UtensilsCrossed,
  ShoppingCart,
  Home,
  User,
} from "lucide-react";

import { cn } from "@/lib/utils";
import FamilySelector from "@/components/layout/FamilySelector";
import KinlyLogo from "@/components/brand/KinlyLogo";
import { useFamily } from "@/lib/FamilyContext";

const navItems = [
  { icon: Home, label: "Inicio", path: "/" },
  { icon: Calendar, label: "Calendario", path: "/calendar" },
  { icon: HeartHandshake, label: "Custodia", path: "/custody" },
  { icon: CheckSquare, label: "Tareas", path: "/tasks" },
  { icon: UtensilsCrossed, label: "Comidas", path: "/meals" },
  { icon: ShoppingCart, label: "Compras", path: "/groceries" },
  { icon: User, label: "Perfil", path: "/profile" },
];

function AppShellLoader() {
  return (
    <div className="kinly-gradient-bg min-h-screen">
      <div className="fixed left-4 top-4">
        <KinlyLogo />
      </div>
      <div className="fixed inset-x-0 bottom-0 z-50 px-4 pb-2">
        <div className="mx-auto flex max-w-2xl justify-around rounded-[1.55rem] border border-white/70 bg-white/66 px-2 py-1.5 shadow-[0_14px_36px_rgba(15,23,42,0.10)] backdrop-blur-2xl">
          {Array.from({ length: 7 }).map((_, index) => (
            <div key={index} className="flex min-w-[50px] flex-col items-center gap-1 px-1.5 py-1">
              <div className="h-5 w-5 animate-pulse rounded-full bg-slate-200" />
              <div className="h-1.5 w-8 animate-pulse rounded bg-slate-200" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AppShell() {
  const location = useLocation();
  const { isLoading, profile, familyId } = useFamily();
  const hideFamilyHeader = location.pathname === "/calendar" || location.pathname === "/custody";

  if (isLoading || !profile || !familyId) {
    return <AppShellLoader />;
  }

  return (
    <div className="kinly-gradient-bg flex min-h-screen flex-col">
      {!hideFamilyHeader && (
        <header className="sticky top-0 z-40 bg-transparent px-3 py-3 md:px-6">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 rounded-[1.6rem] border border-white/80 bg-white/76 px-3 py-2.5 shadow-[0_10px_30px_rgba(15,23,42,0.06)] backdrop-blur-2xl md:px-4">
            <Link to="/" className="shrink-0">
              <KinlyLogo />
            </Link>
            <FamilySelector />
          </div>
        </header>
      )}

      <main className="flex-1 overflow-auto pb-20 md:pb-22">
        <Outlet />
      </main>

      <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-50 px-4 pb-2 md:pb-3">
        <div className="pointer-events-auto mx-auto max-w-2xl rounded-[1.55rem] border border-white/70 bg-white/66 p-1 shadow-[0_14px_38px_rgba(15,23,42,0.13)] backdrop-blur-2xl transition hover:bg-white/78">
          <div className="flex items-center justify-around gap-0.5 overflow-x-auto">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex min-w-[50px] flex-col items-center gap-0.5 rounded-[1.15rem] px-1.5 py-1.5 text-[9.5px] font-black transition-all duration-200 md:min-w-[58px] md:px-2 md:text-[10px]",
                    isActive
                      ? "bg-blue-50/95 text-blue-700 shadow-[0_7px_16px_rgba(91,141,239,0.14)] ring-1 ring-blue-100"
                      : "text-slate-400 hover:bg-white/80 hover:text-slate-700"
                  )}
                >
                  <Icon className={cn("h-4.5 w-4.5 md:h-5 md:w-5", isActive && "stroke-[2.6]")} />
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
