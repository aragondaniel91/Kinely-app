import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { format, addDays } from "date-fns";
import {
  CheckSquare,
  UtensilsCrossed,
  ShoppingCart,
  User,
  Heart,
  ChevronRight,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useAuth } from "@/lib/AuthContext";

const todayStr = () => format(new Date(), "yyyy-MM-dd");

export default function Dashboard() {
  const { user } = useAuth();

  const [custodyDays, setCustodyDays] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [meals, setMeals] = useState([]);
  const [groceries, setGroceries] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;

      // 🔥 FIRESTORE (FIX)
      const q = query(
        collection(db, "custodyDays"),
        where("userId", "==", user.uid)
      );

      const snap = await getDocs(q);

      const custodyData = snap.docs.map((doc) => doc.data());
      setCustodyDays(custodyData);

      // (esto lo dejamos en local por ahora)
      const allTasks = JSON.parse(localStorage.getItem("tasks") || "[]");
      const allMeals = JSON.parse(localStorage.getItem("meals") || "[]");
      const allGroceries = JSON.parse(localStorage.getItem("groceries") || "[]");

      setTasks(allTasks.filter((t) => t.status === "pending"));
      setMeals(allMeals.filter((m) => m.date === todayStr()));
      setGroceries(allGroceries.filter((g) => !g.checked));
    };

    loadData();
  }, [user]);

  const todayCustody = custodyDays.find(
    (d) => d.date?.slice(0, 10) === todayStr()
  );

  const isWithDad = todayCustody?.with_whom === "dad";
  const isSplit = todayCustody?.is_split;

  const getParentForDay = (day) => {
    if (!day) return null;
    if (day.is_split) return "split";
    return day.with_whom;
  };

  const getNextChange = () => {
    if (!todayCustody) return null;

    const currentParent = getParentForDay(todayCustody);
    const today = new Date();

    for (let i = 1; i <= 45; i++) {
      const nextDate = addDays(today, i);
      const nextKey = format(nextDate, "yyyy-MM-dd");

      const nextDay = custodyDays.find(
        (d) => d.date?.slice(0, 10) === nextKey
      );

      const nextParent = getParentForDay(nextDay);

      if (!nextParent || nextParent === currentParent) continue;

      return {
        days: i,
        with: nextParent,
        date: nextDate,
      };
    }

    return null;
  };

  const nextChange = getNextChange();

  const nextSevenDays = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(new Date(), i);
    const dateKey = format(date, "yyyy-MM-dd");

    const custody = custodyDays.find(
      (d) => d.date?.slice(0, 10) === dateKey
    );

    return { date, custody };
  });

  const nextChangeLabel =
    nextChange?.with === "dad"
      ? "Papá"
      : nextChange?.with === "mom"
      ? "Mamá"
      : "día compartido";

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold font-heading">Family Wall</h1>
        <p className="text-muted-foreground mt-1">
          {format(new Date(), "EEEE, MMMM d")}
        </p>
      </div>

      <Link to="/calendar">
        <Card
          className={`p-5 mb-6 border-2 hover:shadow-md transition-shadow ${
            isWithDad
              ? "border-primary bg-primary/5"
              : "border-pink-400 bg-pink-50"
          }`}
        >
          <div className="flex items-center gap-4">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                isWithDad ? "bg-primary/15" : "bg-pink-100"
              }`}
            >
              {isWithDad ? (
                <User className="w-7 h-7 text-primary" />
              ) : (
                <Heart className="w-7 h-7 text-pink-500" />
              )}
            </div>

            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Today</p>

              <p className="text-xl font-bold">
                {todayCustody
                  ? isSplit
                    ? "👨👩 Split Day"
                    : isWithDad
                    ? "🏠 With Dad"
                    : "💕 With Mom"
                  : "No custody info"}
              </p>

              {nextChange && (
                <p className="text-sm text-muted-foreground mt-1">
                  Próximo cambio: en{" "}
                  <span className="font-semibold">
                    {nextChange.days} {nextChange.days === 1 ? "día" : "días"}
                  </span>{" "}
                  con <span className="font-semibold">{nextChangeLabel}</span>
                </p>
              )}

              {todayCustody?.notes && (
                <p className="text-sm text-muted-foreground mt-1">
                  {todayCustody.notes}
                </p>
              )}
            </div>

            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </div>
        </Card>
      </Link>

      <div className="mb-6">
        <h2 className="text-xl font-bold mb-3">Próximos 7 días</h2>

        <div className="grid grid-cols-7 gap-3">
          {nextSevenDays.map(({ date, custody }, index) => {
            const parent = custody?.is_split ? "split" : custody?.with_whom;

            return (
              <div
                key={format(date, "yyyy-MM-dd")}
                className="rounded-3xl border p-4 text-center min-h-[96px]"
              >
                <p className="text-xs">{format(date, "EEE")}</p>
                <p className="text-3xl font-bold mt-2">
                  {format(date, "d")}
                </p>

                <div className="mt-2">
                  {parent === "dad"
                    ? "👨"
                    : parent === "mom"
                    ? "👩"
                    : parent === "split"
                    ? "👨👩"
                    : "—"}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
