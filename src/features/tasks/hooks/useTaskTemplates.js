import { useCallback, useEffect, useMemo, useState } from "react";
import {
  collection,
  getDocs,
  orderBy,
  query,
  where,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import { TASK_COLLECTIONS } from "@/features/tasks/model/taskTypes";
import { starterTaskTemplates } from "@/features/tasks/data/starterTaskTemplates";

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
      const templatesQuery = query(
        collection(db, TASK_COLLECTIONS.templates),
        where("familyId", "==", familyId),
        orderBy("updatedAt", "desc")
      );

      const snap = await getDocs(templatesQuery);
      setFamilyTemplates(snap.docs.map(normalizeTemplate));
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
    const activeFamilyTemplates = familyTemplates.filter(
      (template) => template.active !== false
    );

    return [
      ...activeFamilyTemplates,
      ...starterTaskTemplates,
    ];
  }, [familyTemplates]);

  return {
    templates,
    familyTemplates,
    loadingTemplates,
    templateError,
    loadTemplates,
  };
}
