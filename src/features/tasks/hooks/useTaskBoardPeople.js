import { useMemo } from "react";

import { taskPeople } from "@/features/tasks/data/taskPeople";

/**
 * Centralizes the people shown in the Family Rhythm Board.
 *
 * Current MVP:
 * - Uses static taskPeople config.
 *
 * Future:
 * - Build from family members, children, caregivers, permissions, and profile data.
 * - Example sources:
 *   - children linked to familyId
 *   - familyMembers linked to familyId
 *   - caregiver roles
 *   - selected/shared modules
 */
export function useTaskBoardPeople() {
  const people = useMemo(() => taskPeople, []);

  return {
    people,
    defaultPersonId: people[0]?.id || "family",
  };
}
