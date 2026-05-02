import React, { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";

import {
  Plus,
  Trash2,
  Check,
  ShoppingCart,
  Apple,
  Milk,
  Beef,
  Croissant,
  Snowflake,
  Package,
  GlassWater,
  Cookie,
  Warehouse,
  CircleDot,
} from "lucide-react";

import { db } from "@/lib/firebase";
import { useFamily } from "@/lib/FamilyContext";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { cn } from "@/lib/utils";

const categoryConfig = {
  produce: {
    icon: Apple,
    label: "Produce",
    color: "bg-green-100 text-green-700",
  },
  dairy: {
    icon: Milk,
    label: "Dairy",
    color: "bg-blue-100 text-blue-700",
  },
  meat: {
    icon: Beef,
    label: "Meat",
    color: "bg-red-100 text-red-700",
  },
  bakery: {
    icon: Croissant,
    label: "Bakery",
    color: "bg-amber-100 text-amber-700",
  },
  frozen: {
    icon: Snowflake,
    label: "Frozen",
    color: "bg-cyan-100 text-cyan-700",
  },
  pantry: {
    icon: Package,
    label: "Pantry",
    color: "bg-orange-100 text-orange-700",
  },
  beverages: {
    icon: GlassWater,
    label: "Beverages",
    color: "bg-sky-100 text-sky-700",
  },
  snacks: {
    icon: Cookie,
    label: "Snacks",
    color: "bg-pink-100 text-pink-700",
  },
  household: {
    icon: Warehouse,
    label: "Household",
    color: "bg-gray-100 text-gray-700",
  },
  other: {
    icon: CircleDot,
    label: "Other",
    color: "bg-slate-100 text-slate-700",
  },
};

function normalizeItem(docSnap) {
  const data = docSnap.data();

  return {
    id: docSnap.id,
    ...data,
    name: data.name || "",
    category: data.category || "other",
    quantity: data.quantity || "",
    checked: data.checked === true,
    created_date: data.created_date || "",
  };
}

export default function Groceries() {
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState("");
  const [newCategory, setNewCategory] = useState("other");
  const [newQuantity, setNewQuantity] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const { familyId, user, perms } = useFamily();

  const canRead =
    perms?.groceries?.read !== false && perms?.meals?.read !== false;

  const canWrite =
    perms?.groceries?.write !== false && perms?.meals?.write !== false;

  const loadItems = async () => {
    if (!familyId || !canRead) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      let snap;

      try {
        const q = query(
          collection(db, "groceries"),
          where("familyId", "==", familyId)
        );

        snap = await getDocs(q);
      } catch (error) {
        console.warn("Fallback to family_id query:", error);

        const q = query(
          collection(db, "groceries"),
          where("family_id", "==", familyId)
        );

        snap = await getDocs(q);
      }

      const data = snap.docs.map(normalizeItem);

      data.sort((a, b) => {
        const aDate = a.created_date || "";
        const bDate = b.created_date || "";
        return bDate.localeCompare(aDate);
      });

      setItems(data);
    } catch (error) {
      console.error("Error loading groceries:", error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [familyId, canRead]);

  const handleAdd = async () => {
    if (!newItem.trim() || !familyId || !canWrite) return;

    setSaving(true);

    try {
      await addDoc(collection(db, "groceries"), {
        name: newItem.trim(),
        category: newCategory,
        quantity: newQuantity.trim(),
        checked: false,

        familyId,
        family_id: familyId,

        createdBy: user?.uid || null,
        createdByEmail: user?.email || null,

        created_date: new Date().toISOString(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setNewItem("");
      setNewQuantity("");
      setNewCategory("other");

      await loadItems();
    } catch (error) {
      console.error("Error adding grocery item:", error);
      alert(`There was an error adding the grocery item: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const toggleItem = async (item) => {
    if (!canWrite) return;

    try {
      await updateDoc(doc(db, "groceries", item.id), {
        checked: !item.checked,
        updatedAt: serverTimestamp(),
      });

      await loadItems();
    } catch (error) {
      console.error("Error updating grocery item:", error);
      alert(`There was an error updating the grocery item: ${error.message}`);
    }
  };

  const deleteItem = async (id) => {
    if (!canWrite) return;

    const confirmDelete = window.confirm("Delete this item?");
    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, "groceries", id));
      await loadItems();
    } catch (error) {
      console.error("Error deleting grocery item:", error);
      alert(`There was an error deleting the grocery item: ${error.message}`);
    }
  };

  const clearChecked = async () => {
    if (!canWrite) return;

    const checkedItems = items.filter((i) => i.checked);

    if (checkedItems.length === 0) return;

    const confirmClear = window.confirm("Clear all checked items?");
    if (!confirmClear) return;

    try {
      await Promise.all(
        checkedItems.map((item) => deleteDoc(doc(db, "groceries", item.id)))
      );

      await loadItems();
    } catch (error) {
      console.error("Error clearing checked grocery items:", error);
      alert(`There was an error clearing checked items: ${error.message}`);
    }
  };

  const unchecked = useMemo(() => {
    return items.filter((i) => !i.checked);
  }, [items]);

  const checked = useMemo(() => {
    return items.filter((i) => i.checked);
  }, [items]);

  const grouped = useMemo(() => {
    return unchecked.reduce((acc, item) => {
      const cat = item.category || "other";

      if (!acc[cat]) acc[cat] = [];

      acc[cat].push(item);

      return acc;
    }, {});
  }, [unchecked]);

  if (!canRead) {
    return (
      <div className="p-6 max-w-xl mx-auto text-center">
        <h1 className="text-2xl font-bold font-heading mb-2">Grocery List</h1>
        <p className="text-muted-foreground">
          You do not have access to groceries for this family.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold font-heading">Grocery List</h1>

        <Badge variant="secondary" className="text-sm">
          {loading ? "Loading..." : `${unchecked.length} items left`}
        </Badge>
      </div>

      {canWrite && (
        <Card className="p-3 mb-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              placeholder="Add item..."
              className="flex-1"
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />

            <Input
              value={newQuantity}
              onChange={(e) => setNewQuantity(e.target.value)}
              placeholder="Qty"
              className="sm:w-24"
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />

            <Select value={newCategory} onValueChange={setNewCategory}>
              <SelectTrigger className="sm:w-36">
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                {Object.entries(categoryConfig).map(([key, val]) => (
                  <SelectItem key={key} value={key}>
                    {val.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              onClick={handleAdd}
              disabled={!newItem.trim() || saving}
              className="sm:w-11"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {Object.entries(grouped).map(([cat, catItems]) => {
            const config = categoryConfig[cat] || categoryConfig.other;
            const CatIcon = config.icon;

            return (
              <div key={cat} className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className={cn(
                      "w-6 h-6 rounded-md flex items-center justify-center",
                      config.color
                    )}
                  >
                    <CatIcon className="w-3.5 h-3.5" />
                  </div>

                  <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    {config.label}
                  </p>
                </div>

                <div className="space-y-1.5">
                  {catItems.map((item) => (
                    <Card key={item.id} className="p-3 flex items-center gap-3">
                      <button
                        onClick={() => toggleItem(item)}
                        disabled={!canWrite}
                        className={cn(
                          "w-6 h-6 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center shrink-0 transition-colors",
                          canWrite
                            ? "hover:border-primary"
                            : "opacity-40 cursor-not-allowed"
                        )}
                      />

                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{item.name}</p>

                        {item.quantity && (
                          <p className="text-xs text-muted-foreground">
                            {item.quantity}
                          </p>
                        )}
                      </div>

                      {canWrite && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => deleteItem(item.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}

          {unchecked.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-heading font-semibold">List is empty!</p>
              <p className="text-sm">
                {canWrite ? "Add items above" : "No grocery items yet"}
              </p>
            </div>
          )}

          {checked.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  In Cart ({checked.length})
                </p>

                {canWrite && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-destructive"
                    onClick={clearChecked}
                  >
                    Clear All
                  </Button>
                )}
              </div>

              <div className="space-y-1.5">
                {checked.map((item) => (
                  <Card
                    key={item.id}
                    className="p-3 flex items-center gap-3 opacity-50"
                  >
                    <button
                      onClick={() => toggleItem(item)}
                      disabled={!canWrite}
                      className="w-6 h-6 rounded-full border-2 border-primary bg-primary/10 flex items-center justify-center shrink-0"
                    >
                      <Check className="w-3.5 h-3.5 text-primary" />
                    </button>

                    <div className="flex-1 min-w-0">
                      <p className="line-through text-sm text-muted-foreground">
                        {item.name}
                      </p>

                      {item.quantity && (
                        <p className="text-xs text-muted-foreground line-through">
                          {item.quantity}
                        </p>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
