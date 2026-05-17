import React, { useEffect, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  CreditCard,
  LayoutDashboard,
  MessageCircle,
  Shirt,
  Sun,
  Trash2,
  Truck,
} from "lucide-react";

import CustodyCalendarView from "@/components/calendar/CustodyCalendarView";
import ExchangeHub from "@/components/custody/ExchangeHub";
import PackingHub from "@/components/custody/PackingHub";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { resetCustodyDays } from "@/lib/resetCustodyData";
import { useFamily } from "@/lib/FamilyContext";

const custodyModules = [/* unchanged */];

function formatTime(date) {
  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function WeatherTimeBadge() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-yellow-50 text-yellow-500">
        <Sun className="h-6 w-6" />
      </div>
      <div className="leading-tight">
        <p className="text-base font-black text-slate-950">{formatTime(now)}</p>
        <p className="text-xs font-bold text-slate-500">68° · Sunny</p>
      </div>
    </div>
  );
}

/* rest of file unchanged until module rendering */

export default function Custody() {
  const [activeCalendar, setActiveCalendar] = useState("custody");
  const [viewMode, setViewMode] = useState("month");
  const [activeModule, setActiveModule] = useState("hub");
  const [isResetting, setIsResetting] = useState(false);
  const { user, familyId, isAdmin, isOwner } = useFamily();

  const canResetCustody = Boolean(user && familyId && (isAdmin || isOwner));
  const selectedModule = custodyModules.find((module) => module.id === activeModule);

  const handleResetCustody = async () => {};

  return null;
}
