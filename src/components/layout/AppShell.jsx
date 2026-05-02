import { Outlet, Link, useLocation } from "react-router-dom";
import {
  Calendar,
  CheckSquare,
  UtensilsCrossed,
  ShoppingCart,
  Home,
  User,
} from "lucide-react";

import { cn } from "@/lib/utils";
import FamilySelector from "@/components/layout/FamilySelector";

const navItems = [
  { icon: Home, label: "Inicio", path: "/" },
  { icon: Calendar, label: "Calendario", path: "/calendar" },
  { icon: CheckSquare, label: "Tareas", path: "/tasks" },
  { icon: UtensilsCrossed, label: "Comidas", path: "/meals" },
  { icon: ShoppingCart, label: "Compras", path: "/groceries" },
  { icon: User, label: "Perfil", path: "/profile" },
];

export default function AppShell() {
  const location = useLocation();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-40 bg-card border-b border-border flex items-center justify-center py-2 px-4">
        <FamilySelector />
      </header>

      <main className="flex-1 overflow-auto pb-20">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-lg z-50">
        <div className="flex justify-around items-center max-w-3xl mx-auto px-2 py-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl transition-all min-w-[72px]",
                  isActive
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className={cn("w-6 h-6", isActive && "stroke-[2.5]")} />
                <span className="text-xs font-semibold font-heading">
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
