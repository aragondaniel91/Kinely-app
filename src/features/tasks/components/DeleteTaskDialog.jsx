import React from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function DeleteTaskDialog({
  task,
  open,
  onOpenChange,
  onConfirm,
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="rounded-[2rem] border-slate-200 bg-white p-6 shadow-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-2xl font-black tracking-tight text-slate-950">
            Delete task?
          </AlertDialogTitle>

          <AlertDialogDescription className="text-sm font-semibold leading-6 text-slate-500">
            This will remove “{task?.title || "this task"}” from the family task board.
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="gap-2 sm:gap-2">
          <AlertDialogCancel className="rounded-2xl font-black">
            Cancel
          </AlertDialogCancel>

          <AlertDialogAction
            onClick={(event) => {
              event.preventDefault();
              onConfirm?.(task);
            }}
            className="rounded-2xl bg-red-600 font-black text-white hover:bg-red-700"
          >
            Delete task
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
