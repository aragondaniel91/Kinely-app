import { useEffect } from "react";
import { doc, setDoc } from "firebase/firestore";

import { db } from "@/lib/firebase";
import { useFamily } from "@/lib/FamilyContext";
import { getFamilyScopedDocSnaps } from "@/lib/firestoreFamilyQueries";

function arraysEqual(a = [], b = []) {
  if (a.length !== b.length) return false;
  return a.every((item, index) => item === b[index]);
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || "").trim()).filter(Boolean);
}

function needsMetadataUpdate(data, metadata) {
  if (data.actualFamilyId !== metadata.actualFamilyId) return true;
  if (data.householdFamilyId !== metadata.householdFamilyId) return true;
  if (data.custodyGroupId !== metadata.custodyGroupId) return true;
  if (data.custodyGroupName !== metadata.custodyGroupName) return true;
  if (!arraysEqual(normalizeStringArray(data.custodyChildIds), metadata.custodyChildIds)) return true;
  if (!arraysEqual(normalizeStringArray(data.childIds), metadata.custodyChildIds)) return true;
  return false;
}

export default function CustodyScopeMetadataBackfill({ children }) {
  const {
    user,
    familyId,
    actualFamilyId,
    householdFamilyId,
    custodyGroupId,
    selectedCustodyGroup,
    custodyChildIds,
    custodyModuleActive,
  } = useFamily();

  useEffect(() => {
    let cancelled = false;

    async function backfillCustodyMetadata() {
      if (!user || !custodyModuleActive || !custodyGroupId || !familyId) return;

      const cleanChildIds = normalizeStringArray(custodyChildIds);
      const metadata = {
        actualFamilyId: actualFamilyId || householdFamilyId || null,
        householdFamilyId: householdFamilyId || actualFamilyId || null,
        custodyGroupId,
        custodyGroupName: selectedCustodyGroup?.name || "",
        custodyChildIds: cleanChildIds,
        childIds: cleanChildIds,
      };

      try {
        const docs = await getFamilyScopedDocSnaps("custodyDays", familyId);

        if (cancelled) return;

        await Promise.all(
          docs.map(async (docSnap) => {
            const data = docSnap.data();
            if (!needsMetadataUpdate(data, metadata)) return;

            await setDoc(doc(db, "custodyDays", docSnap.id), metadata, { merge: true });
          })
        );
      } catch (error) {
        console.warn("Could not backfill custody metadata:", error);
      }
    }

    backfillCustodyMetadata();

    return () => {
      cancelled = true;
    };
  }, [
    user?.uid,
    familyId,
    actualFamilyId,
    householdFamilyId,
    custodyGroupId,
    selectedCustodyGroup?.name,
    custodyModuleActive,
    JSON.stringify(custodyChildIds || []),
  ]);

  return children;
}
