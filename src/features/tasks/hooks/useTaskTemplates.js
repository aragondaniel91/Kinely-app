import { useCallback, useEffect, useMemo, useState } from "react";

import { getFamilyScopedDocSnaps } from "@/lib/firestoreFamilyQueries";
import { TASK_COLLECTIONS } from "@/features/tasks/model/taskTypes";

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

export function useTaskTemplates({ familyId, canRead = true } = {}) {
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
      const templateDocs = await getFamilyScopedDocSnaps(TASK_COLLECTIONS.templates, familyId);

      const nextTemplates = templateDocs
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
    return familyTemplates;
  }, [familyTemplates]);

  return {
    templates,
    familyTemplates,
    loadingTemplates,
    templateError,
    loadTemplates,
  };
}
