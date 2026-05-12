import { Outlet, Link, useLocation } from "react-router-dom";
import {
  Baby,
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
import { useFamily } from "@/lib/FamilyContext";

const navItems = [
  { icon: Home, label: "Inicio", path: "/" },
  { icon: Calendar, label: "Calendario", path: "/calendar" },
  { icon: HeartHandshake, label: "Custodia", path: "/custody" },
  { icon: Baby, label: "Niños", path: "/children" },
  { icon: CheckSquare, label: "Tareas", path: "/tasks" },
  { icon: UtensilsCrossed, label: "Comidas", path: "/meals" },
  { icon: ShoppingCart, label: "Compras", path: "/groceries" },
  { icon: User, label: "Perfil", path: "/profile" },
];

function AppShellLoader() {
  return (
    <div className="min-h-screen bg-background">
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card">
        <div className="mx-auto flex max-w-4xl justify-around px-1 py-2">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="flex min-w-[68px] flex-col items-center gap-1 px-3 py-1">
              <div className="h-6 w-6 animate-pulse rounded-full bg-muted" />
              <div className="h-2 w-10 animate-pulse rounded bg-muted" />
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
    <div className="min-h-screen flex flex-col bg-background">
      {!hideFamilyHeader && (
        <header className="sticky top-0 z-40 bg-card border-b border-border flex items-center justify-center py-2 px-4">
          <FamilySelector />
        </header>
      )}

      <main className="flex-1 overflow-auto pb-20">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-lg z-50">
        <div className="flex justify-around items-center max-w-4xl mx-auto px-1 py-1 overflow-x-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all min-w-[68px]",
                  isActive
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className={cn("w-6 h-6", isActive && "stroke-[2.5]")} />
                <span className="text-[11px] font-semibold font-heading">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
