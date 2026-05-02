import React, { useEffect, useMemo, useState } from "react";
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

import { useFamily } from "@/lib/FamilyContext";

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

export default function Dashboard() {
  const { user, familyId, dadName, momName, perms } = useFamily();

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
              : todayCustody
              ? "border-pink-400 bg-pink-50"
              : "border-border bg-white"
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

              <p className="text-xl font-bold">{todayLabel}</p>

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
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold">Próximos 7 días</h2>

          <Link
            to="/calendar"
            className="text-primary text-sm flex items-center gap-1"
          >
            Ver todo
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-7 gap-3">
          {nextSevenDays.map(({ date, custody }, index) => {
            const parent =
              custody?.is_split || custody?.isSplit
                ? "split"
                : custody?.with_whom || custody?.withWhom;

            const bg =
              parent === "dad"
                ? "bg-blue-100 border-blue-200"
                : parent === "mom"
                ? "bg-amber-100 border-amber-200"
                : parent === "split"
                ? "bg-green-100 border-green-200"
                : "bg-white border-border";

            return (
              <Link key={format(date, "yyyy-MM-dd")} to="/calendar">
                <div
                  className={`rounded-3xl border p-4 text-center min-h-[96px] hover:shadow-md transition ${
                    index === 0 ? "ring-2 ring-primary" : ""
                  } ${bg}`}
                >
                  <p className="text-xs text-muted-foreground uppercase">
                    {format(date, "EEE")}
                  </p>

                  <p className="text-3xl font-bold mt-2">{format(date, "d")}</p>

                  <div className="mt-2 flex justify-center">
                    {parent === "split" ? (
                      <div className="flex">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400 -ml-1" />
                      </div>
                    ) : (
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          parent === "dad"
                            ? "bg-blue-500"
                            : parent === "mom"
                            ? "bg-amber-400"
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
      </div>

      {loading && (
        <div className="mb-4 text-sm text-muted-foreground">
          Loading dashboard...
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {canReadTasks && (
          <Link to="/tasks">
            <Card className="p-4 hover:shadow-md transition">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                  <CheckSquare className="w-5 h-5 text-amber-600" />
                </div>

                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Pending Tasks</p>
                  <p className="text-2xl font-bold">{tasks.length}</p>

                  <div className="space-y-1.5 mt-3">
                    {tasks.slice(0, 3).map((task) => (
                      <div key={task.id} className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                        <p className="text-sm truncate">{task.title}</p>
                      </div>
                    ))}

                    {tasks.length === 0 && (
                      <p className="text-sm text-muted-foreground">
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
            <Card className="p-4 hover:shadow-md transition">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <UtensilsCrossed className="w-5 h-5 text-emerald-600" />
                </div>

                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Today's Meals</p>
                  <p className="text-2xl font-bold">{meals.length}</p>

                  <div className="space-y-1.5 mt-3">
                    {meals.slice(0, 3).map((meal) => (
                      <div key={meal.id} className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {meal.meal_type || meal.mealType}
                        </Badge>
                        <p className="text-sm truncate">{meal.name}</p>
                      </div>
                    ))}

                    {meals.length === 0 && (
                      <p className="text-sm text-muted-foreground">
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
          <Link to="/groceries" className="md:col-span-2">
            <Card className="p-4 hover:shadow-md transition">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                  <ShoppingCart className="w-5 h-5 text-violet-600" />
                </div>

                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Grocery List</p>
                  <p className="text-2xl font-bold">{groceries.length} items</p>
                </div>

                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>

              <div className="flex flex-wrap gap-2 mt-4">
                {groceries.slice(0, 6).map((item) => (
                  <Badge key={item.id} variant="outline">
                    {item.name}
                  </Badge>
                ))}

                {groceries.length > 6 && (
                  <Badge variant="secondary">
                    +{groceries.length - 6} more
                  </Badge>
                )}

                {groceries.length === 0 && (
                  <Badge variant="secondary">No grocery items</Badge>
                )}
              </div>
            </Card>
          </Link>
        )}
      </div>
    </div>
  );
}
