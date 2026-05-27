import React, { useEffect, useMemo, useState } from "react";
import { addDoc, collection, deleteDoc, doc, getDocs, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import {
  Backpack,
  CheckCircle2,
  ClipboardList,
  Heart,
  Pencil,
  Pill,
  Plus,
  Shirt,
  Sparkles,
  Star,
  Trash2,
  Trophy,
  XCircle,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import AppDialog from "@/components/app/AppDialog";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/firebase";
import { useFamily } from "@/lib/FamilyContext";
import {
  custodyPackingTemplates,
  getPackingSummary,
  initialCustodyPackingItems,
} from "@/data/custodyPacking";

const iconMap = {
  school: Backpack,
  weekend: Shirt,
  sports: Trophy,
  medicine: Pill,
};

const accentMap = {
  blue: "bg-blue-50 text-blue-700 border-blue-100",
  amber: "bg-amber-50 text-amber-700 border-amber-100",
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
  rose: "bg-rose-50 text-rose-700 border-rose-100",
};

const emptyNewItem = {
  name: "",
  category: "School",
  owner: "Shared",
  status: "review",
  important: false,
};

function itemToForm(item) {
  return {
    name: item?.name || "",
    category: item?.category || "School",
    owner: item?.owner || "Shared",
    status: item?.status || "review",
    important: Boolean(item?.important),
  };
}

function statusMeta(status) {
  if (status === "packed") {
    return {
      label: "Packed",
      icon: CheckCircle2,
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    };
  }

  if (status === "missing") {
    return {
      label: "Missing",
      icon: XCircle,
      className: "border-rose-200 bg-rose-50 text-rose-700",
    };
  }

  return {
    label: "Review",
    icon: ClipboardList,
    className: "border-amber-200 bg-amber-50 text-amber-700",
  };
}

function PackingHero({ readiness, packedCount, totalCount, loading }) {
  return (
    <Card className="overflow-hidden rounded-[2rem] border-white/80 bg-white shadow-[0_18px_52px_rgba(15,23,42,0.08)]">
      <div className="bg-[radial-gradient(circle_at_top_left,rgba(123,201,161,0.24),transparent_34%),linear-gradient(135deg,#ffffff_0%,#ecfdf5_46%,#f8f7f4_100%)] p-6 md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-emerald-700 shadow-sm">
              <Sparkles className="h-3.5 w-3.5" />
              Packing PRO
            </div>
            <h2 className="text-3xl font-black tracking-tight text-slate-950 md:text-5xl">
              Ready for the next transition
            </h2>
            <p className="mt-3 text-sm font-semibold leading-6 text-slate-600 md:text-base">
              Keep clothes, medicine, school items, and comfort objects organized before custody exchanges.
            </p>
          </div>

          <div className="rounded-[1.75rem] border border-white/80 bg-white/86 p-5 shadow-[0_12px_34px_rgba(15,23,42,0.08)] backdrop-blur">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
              Packing readiness
            </p>
            <div className="mt-3 flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-[1.35rem] bg-emerald-50 text-2xl font-black text-emerald-700">
                {loading ? "..." : `${readiness}%`}
              </div>
              <div>
                <p className="text-lg font-black text-slate-950">
                  {loading ? "Loading checklist" : `${packedCount} of ${totalCount} packed`}
                </p>
                <p className="text-sm font-bold text-slate-500">Next exchange checklist</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function TemplateCard({ template }) {
  const Icon = iconMap[template.id] || Backpack;
  const accent = accentMap[template.tone] || accentMap.blue;

  return (
    <button
      type="button"
      className="rounded-[1.6rem] border border-white/80 bg-white p-4 text-left shadow-[0_10px_28px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(15,23,42,0.09)]"
    >
      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${accent}`}>
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-base font-black text-slate-950">{template.label}</h3>
      <p className="mt-1 text-sm font-semibold leading-5 text-slate-500">{template.description}</p>
    </button>
  );
}

function PackingItem({ item, onCycle, onEdit, onDelete }) {
  const meta = statusMeta(item.status);
  const Icon = meta.icon;

  return (
    <div className="flex w-full flex-col gap-3 rounded-[1.4rem] border border-slate-200 bg-white px-4 py-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md md:flex-row md:items-center">
      <button type="button" onClick={() => onCycle(item.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-50 text-slate-600">
          {item.important ? <Star className="h-5 w-5 fill-amber-100 text-amber-600" /> : <Backpack className="h-5 w-5" />}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-black text-slate-950">{item.name}</p>
            {item.important && (
              <Badge variant="secondary" className="rounded-full bg-amber-50 text-amber-700 hover:bg-amber-50">
                Important
              </Badge>
            )}
          </div>
          <p className="mt-0.5 text-xs font-semibold text-slate-400">
            {item.category} · Responsible: {item.owner}
          </p>
        </div>
      </button>

      <div className="flex shrink-0 items-center justify-between gap-2 md:justify-end">
        <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-black ${meta.className}`}>
          <Icon className="h-3.5 w-3.5" />
          {meta.label}
        </span>
        <button
          type="button"
          onClick={() => onEdit(item)}
          className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
          aria-label={`Edit ${item.name}`}
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => onDelete(item)}
          className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
          aria-label={`Delete ${item.name}`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <AppDialog
        open={Boolean(noticeDialog)}
        tone={noticeDialog?.tone}
        title={noticeDialog?.title}
        message={noticeDialog?.message}
        confirmLabel="Got it"
        onConfirm={() => setNoticeDialog(null)}
        onCancel={() => setNoticeDialog(null)}
      />

      <AppDialog
        open={Boolean(confirmDialog)}
        tone={confirmDialog?.tone}
        title={confirmDialog?.title}
        message={confirmDialog?.message}
        confirmLabel={confirmDialog?.confirmLabel || "Confirm"}
        cancelLabel="Cancel"
        onCancel={() => setConfirmDialog(null)}
        onConfirm={() => {
          const action = confirmDialog?.onConfirm;
          setConfirmDialog(null);
          action?.();
        }}
      />
    </div>
  );
}

function PackingItemModal({ open, mode, value, saving, onChange, onClose, onSubmit }) {
  if (!open) return null;

  const isEdit = mode === "edit";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-4 backdrop-blur-sm md:items-center">
      <form onSubmit={onSubmit} className="w-full max-w-xl rounded-[2rem] border border-white/80 bg-white p-5 shadow-2xl md:p-6">
        <div className="mb-5">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-600">Packing item</p>
          <h3 className="mt-1 text-2xl font-black text-slate-950">{isEdit ? "Edit item" : "Add item"}</h3>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            {isEdit ? "Update this checklist item for the selected custody group." : "Create a checklist item for the selected custody group."}
          </p>
        </div>

        <div className="grid gap-4">
          <label className="grid gap-1.5">
            <span className="text-xs font-black uppercase tracking-wide text-slate-400">Name</span>
            <Input
              value={value.name}
              onChange={(event) => onChange({ ...value, name: event.target.value })}
              placeholder="Example: Lunchbox"
              className="rounded-2xl border-slate-200 text-sm font-bold focus-visible:ring-emerald-200"
              required
            />
          </label>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-1.5">
              <span className="text-xs font-black uppercase tracking-wide text-slate-400">Category</span>
              <Select value={value.category} onValueChange={(nextValue) => onChange({ ...value, category: nextValue })}>
                <SelectTrigger className="rounded-2xl border-slate-200 text-sm font-bold focus:ring-emerald-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="School">School</SelectItem>
                  <SelectItem value="Clothes">Clothes</SelectItem>
                  <SelectItem value="Medicine">Medicine</SelectItem>
                  <SelectItem value="Sports">Sports</SelectItem>
                  <SelectItem value="Comfort">Comfort</SelectItem>
                  <SelectItem value="General">General</SelectItem>
                </SelectContent>
              </Select>
            </label>

            <label className="grid gap-1.5">
              <span className="text-xs font-black uppercase tracking-wide text-slate-400">Responsible</span>
              <Select value={value.owner} onValueChange={(nextValue) => onChange({ ...value, owner: nextValue })}>
                <SelectTrigger className="rounded-2xl border-slate-200 text-sm font-bold focus:ring-emerald-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Shared">Shared</SelectItem>
                  <SelectItem value="Dad">Dad</SelectItem>
                  <SelectItem value="Mom">Mom</SelectItem>
                </SelectContent>
              </Select>
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-1.5">
              <span className="text-xs font-black uppercase tracking-wide text-slate-400">Status</span>
              <Select value={value.status} onValueChange={(nextValue) => onChange({ ...value, status: nextValue })}>
                <SelectTrigger className="rounded-2xl border-slate-200 text-sm font-bold focus:ring-emerald-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="review">Review</SelectItem>
                  <SelectItem value="packed">Packed</SelectItem>
                  <SelectItem value="missing">Missing</SelectItem>
                </SelectContent>
              </Select>
            </label>

            <label className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 px-4 py-3">
              <span className="text-sm font-black text-slate-700">Mark as important</span>
              <Switch
                checked={value.important}
                onCheckedChange={(checked) => onChange({ ...value, important: checked })}
              />
            </label>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving} className="rounded-full">
            Cancel
          </Button>
          <Button type="submit" disabled={saving} className="rounded-full bg-emerald-600 hover:bg-emerald-700">
            {saving ? "Saving..." : isEdit ? "Save changes" : "Add item"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function PeaceOfMindCard() {
  return (
    <Card className="rounded-[2rem] border-white/80 bg-white p-5 shadow-[0_14px_38px_rgba(15,23,42,0.07)] md:p-6">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
          <Heart className="h-6 w-6" />
        </div>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
            Calm transition
          </p>
          <h3 className="mt-1 text-2xl font-black text-slate-950">
            Less forgetting. Less friction.
          </h3>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
            Packing is not just a checklist. It helps the child feel prepared, cared for, and comfortable between homes.
          </p>
        </div>
      </div>
    </Card>
  );
}

function normalizePackingDoc(docSnap) {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    name: data.name || "Packing item",
    category: data.category || "General",
    owner: data.owner || "Shared",
    status: data.status || "review",
    important: Boolean(data.important),
    order: data.order ?? 999,
  };
}

export default function PackingHub() {
  const { user, familyId } = useFamily();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [noticeDialog, setNoticeDialog] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);

  const showNotice = ({ tone = "info", title, message }) => {
    setNoticeDialog({ tone, title, message });
  };

  const askConfirm = ({ tone = "danger", title, message, confirmLabel = "Confirm", onConfirm }) => {
    setConfirmDialog({ tone, title, message, confirmLabel, onConfirm });
  };

  const [showItemModal, setShowItemModal] = useState(false);
  const [savingItem, setSavingItem] = useState(false);
  const [itemForm, setItemForm] = useState(emptyNewItem);
  const [editingItem, setEditingItem] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadPackingItems() {
      if (!user || !familyId) {
        setItems([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const q = query(collection(db, "custodyPackingItems"), where("familyId", "==", familyId));
        const snap = await getDocs(q);

        if (snap.empty) {
          const createdItems = await Promise.all(
            initialCustodyPackingItems.map(async (item, index) => {
              const docRef = await addDoc(collection(db, "custodyPackingItems"), {
                ...item,
                familyId,
                createdBy: user.uid,
                order: index,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              });

              return { ...item, id: docRef.id, order: index };
            })
          );

          if (!cancelled) setItems(createdItems);
          return;
        }

        const data = snap.docs
          .map(normalizePackingDoc)
          .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

        if (!cancelled) setItems(data);
      } catch (error) {
        console.error("Error loading packing items:", error);
        if (!cancelled) setItems(initialCustodyPackingItems);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadPackingItems();

    return () => {
      cancelled = true;
    };
  }, [user?.uid, familyId]);

  const summary = useMemo(() => getPackingSummary(items), [items]);

  const closeItemModal = () => {
    setShowItemModal(false);
    setEditingItem(null);
    setItemForm(emptyNewItem);
  };

  const openAddItem = () => {
    setEditingItem(null);
    setItemForm(emptyNewItem);
    setShowItemModal(true);
  };

  const openEditItem = (item) => {
    setEditingItem(item);
    setItemForm(itemToForm(item));
    setShowItemModal(true);
  };

  const cycleStatus = async (id) => {
    const next = {
      review: "packed",
      packed: "missing",
      missing: "review",
    };

    const currentItem = items.find((item) => item.id === id);
    if (!currentItem) return;

    const nextStatus = next[currentItem.status] || "review";

    setItems((current) =>
      current.map((item) =>
        item.id === id ? { ...item, status: nextStatus } : item
      )
    );

    try {
      await updateDoc(doc(db, "custodyPackingItems", id), {
        status: nextStatus,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error updating packing item:", error);
      setItems((current) =>
        current.map((item) =>
          item.id === id ? { ...item, status: currentItem.status } : item
        )
      );
    }
  };

  const savePackingItem = async (event) => {
    event.preventDefault();

    const cleanName = itemForm.name.trim();
    if (!cleanName || !user || !familyId || savingItem) return;

    setSavingItem(true);

    try {
      const payload = {
        name: cleanName,
        category: itemForm.category,
        owner: itemForm.owner,
        status: itemForm.status,
        important: Boolean(itemForm.important),
        updatedAt: serverTimestamp(),
      };

      if (editingItem) {
        await updateDoc(doc(db, "custodyPackingItems", editingItem.id), payload);
        setItems((current) =>
          current.map((item) =>
            item.id === editingItem.id ? { ...item, ...payload } : item
          )
        );
      } else {
        const order = items.length;
        const createPayload = {
          ...payload,
          familyId,
          createdBy: user.uid,
          order,
          createdAt: serverTimestamp(),
        };

        const docRef = await addDoc(collection(db, "custodyPackingItems"), createPayload);
        setItems((current) => [...current, { ...createPayload, id: docRef.id }]);
      }

      closeItemModal();
    } catch (error) {
      console.error("Error saving packing item:", error);
      showNotice({
        tone: "danger",
        title: "Could not save packing item",
        message: error.message,
      });
    } finally {
      setSavingItem(false);
    }
  };

  const deletePackingItem = async (itemToDelete) => {
    if (!skipConfirm) {
      askConfirm({
        tone: "danger",
        title: "Delete packing item?",
        message: `Delete "${itemToDelete.name}" from the packing list? This action cannot be undone.`,
        confirmLabel: "Delete item",
        onConfirm: () => handleDeletePackingItem({ skipConfirm: true }),
      });
      return;
    }

    const previousItems = items;
    setItems((current) => current.filter((item) => item.id !== itemToDelete.id));

    try {
      await deleteDoc(doc(db, "custodyPackingItems", itemToDelete.id));
    } catch (error) {
      console.error("Error deleting packing item:", error);
      setItems(previousItems);
      showNotice({
        tone: "danger",
        title: "Could not delete packing item",
        message: error.message,
      });
    }
  };

  return (
    <div className="px-3 pb-28 pt-4 md:px-6 md:pb-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <PackingHero loading={loading} readiness={summary.readiness} packedCount={summary.packedCount} totalCount={summary.totalCount} />

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="rounded-[1.6rem] border-white/80 bg-white p-5 shadow-[0_12px_32px_rgba(15,23,42,0.06)]">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Packed</p>
            <p className="mt-1 text-3xl font-black text-emerald-700">{summary.packedCount}</p>
          </Card>
          <Card className="rounded-[1.6rem] border-white/80 bg-white p-5 shadow-[0_12px_32px_rgba(15,23,42,0.06)]">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Missing</p>
            <p className="mt-1 text-3xl font-black text-rose-700">{summary.missingCount}</p>
          </Card>
          <Card className="rounded-[1.6rem] border-white/80 bg-white p-5 shadow-[0_12px_32px_rgba(15,23,42,0.06)]">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Review</p>
            <p className="mt-1 text-3xl font-black text-amber-700">{summary.reviewCount}</p>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_0.82fr]">
          <Card className="rounded-[2rem] border-white/80 bg-white p-5 shadow-[0_14px_38px_rgba(15,23,42,0.07)] md:p-6">
            <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                  Exchange packing list
                </p>
                <h3 className="mt-1 text-2xl font-black text-slate-950">
                  What needs to travel
                </h3>
                <p className="mt-2 text-sm font-semibold text-slate-500">
                  Tap an item to cycle between review, packed, and missing.
                </p>
              </div>

              <Button type="button" onClick={openAddItem} className="rounded-full gap-2">
                <Plus className="h-4 w-4" />
                Add item
              </Button>
            </div>

            <div className="space-y-3">
              {items.map((item) => (
                <PackingItem key={item.id} item={item} onCycle={cycleStatus} onEdit={openEditItem} onDelete={deletePackingItem} />
              ))}
            </div>
          </Card>

          <div className="space-y-6">
            <Card className="rounded-[2rem] border-white/80 bg-white p-5 shadow-[0_14px_38px_rgba(15,23,42,0.07)] md:p-6">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                    Smart templates
                  </p>
                  <h3 className="mt-1 text-2xl font-black text-slate-950">
                    Reusable lists
                  </h3>
                </div>
                <Badge className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700 hover:bg-emerald-50">
                  Firestore
                </Badge>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                {custodyPackingTemplates.map((template) => (
                  <TemplateCard key={template.id} template={template} />
                ))}
              </div>
            </Card>

            <PeaceOfMindCard />
          </div>
        </div>
      </div>

      <PackingItemModal
        open={showItemModal}
        mode={editingItem ? "edit" : "add"}
        value={itemForm}
        saving={savingItem}
        onChange={setItemForm}
        onClose={closeItemModal}
        onSubmit={savePackingItem}
      />
    </div>
  );
}
