import React from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, CheckCircle2, Info, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";

const toneConfig = {
  info: {
    icon: Info,
    iconBox: "bg-blue-50 text-blue-700",
    confirm: "bg-slate-950 text-white hover:bg-slate-800",
  },
  warning: {
    icon: AlertTriangle,
    iconBox: "bg-amber-50 text-amber-700",
    confirm: "bg-amber-600 text-white hover:bg-amber-700",
  },
  danger: {
    icon: Trash2,
    iconBox: "bg-rose-50 text-rose-700",
    confirm: "bg-rose-600 text-white hover:bg-rose-700",
  },
  success: {
    icon: CheckCircle2,
    iconBox: "bg-emerald-50 text-emerald-700",
    confirm: "bg-emerald-600 text-white hover:bg-emerald-700",
  },
};

export default function AppDialog({
  open,
  tone = "info",
  eyebrow = "Kinely notice",
  title,
  message,
  confirmLabel = "Got it",
  cancelLabel,
  loading = false,
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  const config = toneConfig[tone] || toneConfig.info;
  const Icon = config.icon;

  const closeDialog = () => {
    if (loading) return;
    if (onCancel) onCancel();
    else if (onConfirm) onConfirm();
  };

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-end justify-center bg-slate-950/45 p-3 md:items-center md:p-6">
      <div className="w-full max-w-md rounded-[2rem] border border-white/80 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.18)]">
        <div className="flex items-start gap-4">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${config.iconBox}`}>
            <Icon className="h-6 w-6" />
          </div>

          <div className="min-w-0 flex-1">
            {eyebrow && (
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                {eyebrow}
              </p>
            )}
            <h3 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
              {title}
            </h3>
            {message && (
              <p className="mt-2 whitespace-pre-line text-sm font-semibold leading-6 text-slate-600">
                {message}
              </p>
            )}
          </div>

          {!loading && (
            <button
              type="button"
              onClick={closeDialog}
              className="rounded-full p-2 text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
              aria-label="Close dialog"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          {cancelLabel && (
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={onCancel}
              className="h-10 rounded-full px-5 font-black"
            >
              {cancelLabel}
            </Button>
          )}

          <Button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className={`h-10 rounded-full px-5 font-black ${config.confirm}`}
          >
            {loading ? "Working..." : confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
