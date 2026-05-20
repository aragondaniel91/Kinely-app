import { RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function CustodyBulkUndoBanner({
  lastBulkUndo,
  isSaving,
  undoLastBulkCreation,
}) {
  if (!lastBulkUndo) return null;

  return (
    <div className="border-b border-blue-100 bg-blue-50/80 px-3 py-2 lg:px-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-black text-blue-900">Bulk schedule created</p>
          <p className="text-xs font-semibold text-blue-700">
            {lastBulkUndo.createdCount} day update(s) across {lastBulkUndo.blockCount} block(s). You can undo this latest bulk action.
          </p>
        </div>
        <Button type="button" size="sm" variant="outline" disabled={isSaving} onClick={undoLastBulkCreation} className="w-fit gap-1.5 border-blue-200 bg-white text-blue-700 hover:bg-blue-100">
          <RotateCcw className="h-3.5 w-3.5" />
          Undo bulk
        </Button>
      </div>
    </div>
  );
}
