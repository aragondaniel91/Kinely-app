import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { format, addDays } from "date-fns";
import {
  CalendarDays,
  CheckSquare,
  UtensilsCrossed,
  ShoppingCart,
  User,
  Heart,
  ChevronRight,
  Sparkles,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";

import { useFamily } from "@/lib/FamilyContext";
import { COLOR_MAP } from "@/components/profile/ParentColorPicker";

const todayStr = () => format(new Date(), "yyyy-MM-dd");

function normalizeDoc(docSnap) {
  return {
    id: docSnap.id,
    ...docSnap.data(),
  };
}

function normalizeDate(value) {
  if (!value) return "";
  if (typeof value === "string") return value.slice(0, 10);

  if (value?.toDate) {
    return format(value.toDate(), "yyyy-MM-dd");
  }

  return String(value).slice(0, 10);
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Buenos días";
  if (hour < 18) return "Buenas tardes";
  return "Buenas noches";
}

export default function Dashboard() {
  const { user, familyId, dadName, momName, dadColor, momColor, perms } =
    useFamily();

  const [custodyDays, setCustodyDays] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [meals, setMeals] = useState([]);
  const [groceries, setGroceries] = useState([]);
  const [loading, setLoading] = useState(true);

  const canReadTasks = perms?.tasks?.read !== false;
  const canReadMeals = perms?.meals?.read !== false;
  const canReadGroceries =
    perms?.groceries?.read !== false && perms?.meals?.read !== false;
  const canReadCalendar = perms?.calendar?.read !== false;
  const dadTheme = COLOR_MAP[dadColor] || COLOR_MAP.blue;
  const momTheme = COLOR_MAP[momColor] || COLOR_MAP.amber;

  useEffect(() => {
    const loadData = async () => {
      if (!user || !familyId) {
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const today = todayStr();

        let custodyData = [];
        let taskData = [];
        let mealData = [];
        let groceryData = [];

        if (canReadCalendar) {
          try {
            const custodyByFamily = query(
              collection(db, "custodyDays"),
              where("familyId", "==", familyId)
            );

            const snap = await getDocs(custodyByFamily);
            custodyData = snap.docs.map(normalizeDoc);
          } catch (error) {
            console.warn("Fallback custody query by family_id/userId:", error);

            try {
              const custodyByFamilyLegacy = query(
                collection(db, "custodyDays"),
                where("family_id", "==", familyId)
              );

              const snap = await getDocs(custodyByFamilyLegacy);
              custodyData = snap.docs.map(normalizeDoc);
            } catch (legacyError) {
              console.warn("Fallback custody query by userId:", legacyError);

              const custodyByUser = query(
                collection(db, "custodyDays"),
                where("userId", "==", user.uid)
              );

              const snap = await getDocs(custodyByUser);
              custodyData = snap.docs.map(normalizeDoc);
            }
          }
        }

        if (canReadTasks) {
          try {
            const taskQuery = query(
              collection(db, "tasks"),
              where("familyId", "==", familyId)
            );

            const snap = await getDocs(taskQuery);
            taskData = snap.docs.map(normalizeDoc);
          } catch (error) {
            console.warn("Fallback tasks query by family_id:", error);

            const taskQuery = query(
              collection(db, "tasks"),
              where("family_id", "==", familyId)
            );

            const snap = await getDocs(taskQuery);
            taskData = snap.docs.map(normalizeDoc);
          }
        }

        if (canReadMeals) {
          try {
            const mealQuery = query(
              collection(db, "meals"),
              where("familyId", "==", familyId)
            );

            const snap = await getDocs(mealQuery);
            mealData = snap.docs.map(normalizeDoc);
          } catch (error) {
            console.warn("Fallback meals query by family_id:", error);

            const mealQuery = query(
              collection(db, "meals"),
              where("family_id", "==", familyId)
            );

            const snap = await getDocs(mealQuery);
            mealData = snap.docs.map(normalizeDoc);
          }
        }

        if (canReadGroceries) {
          try {
            const groceryQuery = query(
              collection(db, "groceries"),
              where("familyId", "==", familyId)
            );

            const snap = await getDocs(groceryQuery);
            groceryData = snap.docs.map(normalizeDoc);
          } catch (error) {
            console.warn("Fallback groceries query by family_id:", error);

            const groceryQuery = query(
              collection(db, "groceries"),
              where("family_id", "==", familyId)
            );

            const snap = await getDocs(groceryQuery);
            groceryData = snap.docs.map(normalizeDoc);
          }
        }

        taskData.sort((a, b) => {
          const aDate = a.created_date || "";
          const bDate = b.created_date || "";
          return bDate.localeCompare(aDate);
        });

        mealData.sort((a, b) => {
          const dateCompare = (a.date || "").localeCompare(b.date || "");
          if (dateCompare !== 0) return dateCompare;

          const order = {
            breakfast: 1,
            lunch: 2,
            snack: 3,
            dinner: 4,
          };

          const aType = a.meal_type || a.mealType || "lunch";
          const bType = b.meal_type || b.mealType || "lunch";

          return (order[aType] || 99) - (order[bType] || 99);
        });

        groceryData.sort((a, b) => {
          const aDate = a.created_date || "";
          const bDate = b.created_date || "";
          return bDate.localeCompare(aDate);
        });

        setCustodyDays(custodyData);
        setTasks(taskData.filter((t) => (t.status || "pending") === "pending"));
        setMeals(mealData.filter((m) => normalizeDate(m.date) === today));
        setGroceries(groceryData.filter((g) => g.checked !== true));
      } catch (error) {
        console.error("Error loading dashboard data:", error);
        setCustodyDays([]);
        setTasks([]);
        setMeals([]);
        setGroceries([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [
    user,
    familyId,
    canReadTasks,
    canReadMeals,
    canReadGroceries,
    canReadCalendar,
  ]);

  const todayCustody = useMemo(() => {
    return custodyDays.find((d) => normalizeDate(d.date) === todayStr());
  }, [custodyDays]);

  const isWithDad =
    todayCustody?.with_whom === "dad" || todayCustody?.withWhom === "dad";
  const isSplit = todayCustody?.is_split || todayCustody?.isSplit;

  const getParentForDay = (day) => {
    if (!day) return null;
    if (day.is_split || day.isSplit) return "split";
    return day.with_whom || day.withWhom;
  };

  const getNextChange = () => {
    if (!todayCustody) return null;

    const currentParent = getParentForDay(todayCustody);
    const today = new Date();

    for (let i = 1; i <= 45; i++) {
      const nextDate = addDays(today, i);
      const nextKey = format(nextDate, "yyyy-MM-dd");

      const nextDay = custodyDays.find(
        (d) => normalizeDate(d.date) === nextKey
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

    const custody = custodyDays.find((d) => normalizeDate(d.date) === dateKey);

    return { date, custody };
  });

  const nextChangeLabel =
    nextChange?.with === "dad"
      ? dadName || "Papá"
      : nextChange?.with === "mom"
      ? momName || "Mamá"
      : "día compartido";

  const todayLabel = todayCustody
    ? isSplit
      ? "👨👩 Split Day"
      : isWithDad
      ? `🏠 With ${dadName || "Dad"}`
      : `💕 With ${momName || "Mom"}`
    : "No custody info";

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top_left,rgba(91,141,239,0.16),transparent_34%),linear-gradient(180deg,#F8F7F4_0%,#FFFFFF_55%,#F8FAFC_100%)] px-4 py-5 md:px-6 md:py-7">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-[2rem] border border-white/80 bg-white/85 p-6 shadow-[0_14px_40px_rgba(15,23,42,0.06)] backdrop-blur md:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-blue-700">
                <Sparkles className="h-3.5 w-3.5" />
                Kinly
              </div>
              <h1 className="text-3xl font-black tracking-tight text-slate-950 md:text-5xl">
                {getGreeting()}, familia
              </h1>
              <p className="mt-2 max-w-2xl text-sm font-semibold leading-relaxed text-slate-500 md:text-base">
                Todo lo que tu familia necesita hoy, en un solo lugar calmado y conectado.
              </p>
            </div>

            <div className="flex items-center gap-3 rounded-3xl bg-slate-50 px-4 py-3">
              <CalendarDays className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                  Hoy
                </p>
                <p className="text-sm font-black text-slate-900">
                  {format(new Date(), "EEE, MMM d")}
                </p>
              </div>
            </div>
          </div>
        </section>

        <Link to="/calendar" className="block">
          <Card
            className={`overflow-hidden rounded-[2rem] border-2 bg-white p-0 shadow-[0_18px_46px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_56px_rgba(15,23,42,0.12)] ${
              isWithDad
                ? dadTheme.border
                : todayCustody
                ? momTheme.border
                : "border-slate-200"
            }`}
          >
            <div
              className={`p-6 md:p-8 ${
                isWithDad
                  ? dadTheme.bg
                  : todayCustody
                  ? momTheme.bg
                  : "bg-slate-50"
              }`}
            >
              <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                    Custodia de hoy
                  </p>
                  <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 md:text-5xl">
                    {todayLabel}
                  </h2>

                  {nextChange && (
                    <p className="mt-3 text-sm font-bold text-slate-600 md:text-base">
                      Próximo cambio: en{" "}
                      <span className="text-slate-950">
                        {nextChange.days} {nextChange.days === 1 ? "día" : "días"}
                      </span>{" "}
                      con <span className="text-slate-950">{nextChangeLabel}</span>
                    </p>
                  )}

                  {todayCustody?.notes && (
                    <p className="mt-3 rounded-2xl bg-white/70 px-4 py-3 text-sm font-semibold text-slate-700">
                      {todayCustody.notes}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex h-20 w-20 items-center justify-center rounded-[1.7rem] border border-white/70 bg-white/80 shadow-sm">
                    {isWithDad ? (
                      <User className={`h-10 w-10 ${dadTheme.text}`} />
                    ) : (
                      <Heart className={`h-10 w-10 ${momTheme.text}`} />
                    )}
                  </div>
                  <ChevronRight className="h-6 w-6 text-slate-500" />
                </div>
              </div>
            </div>
          </Card>
        </Link>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_0.9fr]">
          <Card className="rounded-[2rem] border-white/80 bg-white p-5 shadow-[0_14px_36px_rgba(15,23,42,0.06)] md:p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                  Semana familiar
                </p>
                <h2 className="mt-1 text-2xl font-black text-slate-950">
                  Próximos 7 días
                </h2>
              </div>

              <Link
                to="/calendar"
                className="flex items-center gap-1 text-sm font-black text-primary"
              >
                Ver todo
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid grid-cols-7 gap-2 md:gap-3">
              {nextSevenDays.map(({ date, custody }, index) => {
                const parent =
                  custody?.is_split || custody?.isSplit
                    ? "split"
                    : custody?.with_whom || custody?.withWhom;

                const bg =
                  parent === "dad"
                    ? `${dadTheme.bg} ${dadTheme.border}`
                    : parent === "mom"
                    ? `${momTheme.bg} ${momTheme.border}`
                    : parent === "split"
                    ? "bg-green-100 border-green-200"
                    : "bg-slate-50 border-slate-200";

                return (
                  <Link key={format(date, "yyyy-MM-dd")} to="/calendar">
                    <div
                      className={`flex min-h-[108px] flex-col items-center justify-between rounded-[1.5rem] border p-3 text-center transition hover:-translate-y-0.5 hover:shadow-md ${
                        index === 0 ? "ring-2 ring-primary/40" : ""
                      } ${bg}`}
                    >
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">
                          {format(date, "EEE")}
                        </p>
                        <p className="mt-1 text-3xl font-black text-slate-950">
                          {format(date, "d")}
                        </p>
                      </div>

                      <div className="flex justify-center">
                        {parent === "split" ? (
                          <div className="flex">
                            <span
                              className={`h-3 w-3 rounded-full ${dadTheme.dot}`}
                            />
                            <span
                              className={`-ml-1 h-3 w-3 rounded-full ${momTheme.dot}`}
                            />
                          </div>
                        ) : (
                          <span
                            className={`h-3 w-3 rounded-full ${
                              parent === "dad"
                                ? dadTheme.dot
                                : parent === "mom"
                                ? momTheme.dot
                                : "bg-gray-300"
                            }`}
                          />
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </Card>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-1">
            {loading && (
              <div className="rounded-3xl border border-slate-200 bg-white/80 px-5 py-3 text-sm font-bold text-slate-500">
                Loading dashboard...
              </div>
            )}

            {canReadTasks && (
              <Link to="/tasks">
                <Card className="rounded-[1.7rem] border-white/80 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:shadow-lg">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100">
                      <CheckSquare className="h-6 w-6 text-amber-700" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-500">Pending Tasks</p>
                      <p className="mt-1 text-3xl font-black text-slate-950">
                        {tasks.length}
                      </p>

                      <div className="mt-3 space-y-1.5">
                        {tasks.slice(0, 3).map((task) => (
                          <div key={task.id} className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-amber-400" />
                            <p className="truncate text-sm font-semibold text-slate-700">
                              {task.title}
                            </p>
                          </div>
                        ))}

                        {tasks.length === 0 && (
                          <p className="text-sm font-semibold text-slate-400">
                            No pending tasks
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            )}

            {canReadMeals && (
              <Link to="/meals">
                <Card className="rounded-[1.7rem] border-white/80 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:shadow-lg">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100">
                      <UtensilsCrossed className="h-6 w-6 text-emerald-700" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-500">Today's Meals</p>
                      <p className="mt-1 text-3xl font-black text-slate-950">
                        {meals.length}
                      </p>

                      <div className="mt-3 space-y-1.5">
                        {meals.slice(0, 3).map((meal) => (
                          <div key={meal.id} className="flex items-center gap-2">
                            <Badge variant="secondary" className="rounded-full text-xs font-black">
                              {meal.meal_type || meal.mealType}
                            </Badge>
                            <p className="truncate text-sm font-semibold text-slate-700">
                              {meal.name}
                            </p>
                          </div>
                        ))}

                        {meals.length === 0 && (
                          <p className="text-sm font-semibold text-slate-400">
                            No meals planned for today
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            )}

            {canReadGroceries && (
              <Link to="/groceries" className="md:col-span-2 xl:col-span-1">
                <Card className="rounded-[1.7rem] border-white/80 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:shadow-lg">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100">
                      <ShoppingCart className="h-6 w-6 text-violet-700" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-500">Grocery List</p>
                      <p className="mt-1 text-3xl font-black text-slate-950">
                        {groceries.length} items
                      </p>
                    </div>

                    <ChevronRight className="h-5 w-5 text-slate-400" />
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {groceries.slice(0, 6).map((item) => (
                      <Badge key={item.id} variant="outline" className="rounded-full bg-white font-bold">
                        {item.name}
                      </Badge>
                    ))}

                    {groceries.length > 6 && (
                      <Badge variant="secondary" className="rounded-full font-black">
                        +{groceries.length - 6} more
                      </Badge>
                    )}

                    {groceries.length === 0 && (
                      <Badge variant="secondary" className="rounded-full">
                        No grocery items
                      </Badge>
                    )}
                  </div>
                </Card>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
