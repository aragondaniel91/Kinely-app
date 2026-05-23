import { useCallback, useEffect, useMemo, useState } from "react";
import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import { TASK_COLLECTIONS } from "@/features/tasks/model/taskTypes";
import { starterTaskTemplates } from "@/features/tasks/data/starterTaskTemplates";

function getMillis(value) {
  if (!value) return 0;
  if (value?.toMillis) return value.toMillis();
  if (value?.toDate) return value.toDate().getTime();
  if (value instanceof Date) return value.getTime();
  return 0;
}

function normalizeTemplate(docSnap) {
  const data = docSnap.data();

  return {
    id: docSnap.id,
    source: "family",
    ...data,
    active: data.active !== false,
    tasks: Array.isArray(data.tasks) ? data.tasks : [],
  };
}

export function useTaskTemplates({
  familyId,
  canRead = true,
  hiddenStarterTemplateIds = [],
} = {}) {
  const [familyTemplates, setFamilyTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [templateError, setTemplateError] = useState("");

  const loadTemplates = useCallback(async () => {
    if (!familyId || !canRead) {
      setFamilyTemplates([]);
      return;
    }

    setLoadingTemplates(true);
    setTemplateError("");

    try {
      const templatesQuery = query(
        collection(db, TASK_COLLECTIONS.templates),
        where("familyId", "==", familyId)
      );

      const snap = await getDocs(templatesQuery);

      const nextTemplates = snap.docs
        .map(normalizeTemplate)
        .filter((template) => template.active !== false)
        .sort((a, b) => getMillis(b.updatedAt) - getMillis(a.updatedAt));

      setFamilyTemplates(nextTemplates);
    } catch (error) {
      console.error("Error loading task templates:", error);
      setTemplateError(error?.message || "Error loading task templates.");
      setFamilyTemplates([]);
    } finally {
      setLoadingTemplates(false);
    }
  }, [familyId, canRead]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const templates = useMemo(() => {
    const hidden = new Set(hiddenStarterTemplateIds || []);

    const visibleStarterTemplates = starterTaskTemplates.filter(
      (template) => !hidden.has(template.id)
    );

    return [
      ...familyTemplates,
      ...visibleStarterTemplates,
    ];
  }, [familyTemplates, hiddenStarterTemplateIds]);

  return {
    templates,
    familyTemplates,
    loadingTemplates,
    templateError,
    loadTemplates,
  };
}
