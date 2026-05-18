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
  const { isLoading, profile, familyId } = useFamily();

  if (isLoading || !profile || !familyId) {
    return <AppShellLoader />;
  }

  return (
    <div className="kinly-gradient-bg flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 bg-transparent px-3 py-2.5 md:px-6 md:py-3">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 rounded-[1.55rem] border border-white/80 bg-white/76 px-3 py-2 shadow-[0_10px_30px_rgba(15,23,42,0.06)] backdrop-blur-2xl md:px-4">
          <Link to="/" className="shrink-0">
            <KinlyLogo />
          </Link>
          <FamilySelector />
        </div>
      </header>

      <main className="flex-1 overflow-auto pb-24 md:pb-24">
        <Outlet />
      </main>

      <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-50 px-3 pb-3">
        <div className="pointer-events-auto mx-auto max-w-3xl rounded-[1.85rem] border border-white/80 bg-white/78 p-1.5 shadow-[0_20px_52px_rgba(15,23,42,0.15)] backdrop-blur-2xl transition hover:bg-white/86">
          <div className="flex items-center justify-around gap-1 overflow-x-auto">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex min-w-[60px] flex-col items-center gap-1 rounded-[1.35rem] px-2.5 py-2 text-[10.5px] font-black transition-all duration-200 md:min-w-[68px] md:px-3 md:text-[11px]",
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
