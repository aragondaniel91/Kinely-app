import React, { useState } from "react";
import { Trash2 } from "lucide-react";

import CustodyCalendarView from "@/components/calendar/CustodyCalendarView";
import { Button } from "@/components/ui/button";
import { resetCustodyDays } from "@/lib/resetCustodyData";
import { useFamily } from "@/lib/FamilyContext";

export default function Custody() {
  const [activeCalendar, setActiveCalendar] = useState("custody");
  const [viewMode, setViewMode] = useState("month");
  const [isResetting, setIsResetting] = useState(false);
  const { user, familyId, isAdmin, isOwner } = useFamily();

  const canResetCustody = Boolean(user && familyId && (isAdmin || isOwner));

  const handleResetCustody = async () => {
    if (!canResetCustody || isResetting) return;

    const confirmed = window.confirm(
      "This will permanently delete the existing custody days for the selected family and start the custody calendar from zero. Continue?"
    );

    if (!confirmed) return;

    setIsResetting(true);

    try {
      const result = await resetCustodyDays({
        familyId,
        userId: user.uid,
      });

      window.alert(`Custody reset completed. Deleted ${result.deleted} day(s).`);
      window.location.reload();
    } catch (error) {
      console.error("Error resetting custody data:", error);
      window.alert(`Could not reset custody data: ${error.message}`);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-full bg-background pb-28 md:pb-6">
      <div className="flex justify-end px-4 pt-4 md:px-8">
        {canResetCustody && (
          <Button
            type="button"
            variant="outline"
            disabled={isResetting}
            onClick={handleResetCustody}
            className="gap-2 border-red-200 bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800"
          >
            <Trash2 className="h-4 w-4" />
            {isResetting ? "Resetting..." : "Reset custody data"}
          </Button>
        )}
      </div>

      <CustodyCalendarView
        activeCalendar={activeCalendar}
        setActiveCalendar={setActiveCalendar}
        viewMode={viewMode}
        setViewMode={setViewMode}
      />
    </div>
  );
}
