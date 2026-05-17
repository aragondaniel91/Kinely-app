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
    <div className="min-h-screen bg-[#F8F7F4]">
      <div className="fixed left-4 top-4">
        <KinlyLogo />
      </div>
      <div className="fixed inset-x-0 bottom-0 z-50 px-3 pb-3">
        <div className="mx-auto flex max-w-4xl justify-around rounded-[1.75rem] border border-white/70 bg-white/85 px-2 py-2 shadow-[0_18px_44px_rgba(15,23,42,0.12)] backdrop-blur-xl">
          {Array.from({ length: 7 }).map((_, index) => (
            <div key={index} className="flex min-w-[68px] flex-col items-center gap-1 px-3 py-1">
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
  const { isLoading, profile, familyId } = useFamily();
  const hideFamilyHeader = location.pathname === "/calendar" || location.pathname === "/custody";

  if (isLoading || !profile || !familyId) {
    return <AppShellLoader />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#F8F7F4]">
      {!hideFamilyHeader && (
        <header className="sticky top-0 z-40 border-b border-white/70 bg-white/85 px-4 py-2.5 shadow-[0_8px_24px_rgba(15,23,42,0.04)] backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
            <Link to="/" className="shrink-0">
              <KinlyLogo />
            </Link>
            <FamilySelector />
          </div>
        </header>
      )}

      <main className="flex-1 overflow-auto pb-24">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-50 px-3 pb-3">
        <div className="mx-auto max-w-4xl rounded-[1.75rem] border border-white/70 bg-white/90 p-1.5 shadow-[0_18px_44px_rgba(15,23,42,0.14)] backdrop-blur-xl">
          <div className="flex items-center justify-around gap-1 overflow-x-auto">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex min-w-[68px] flex-col items-center gap-1 rounded-[1.25rem] px-3 py-2 text-[11px] font-black transition-all duration-200",
                    isActive
                      ? "bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-100"
                      : "text-slate-400 hover:bg-slate-50 hover:text-slate-700"
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
