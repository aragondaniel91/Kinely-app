export function mapFirestoreDoc(docSnap, options = {}) {
  const data = docSnap?.data?.() || {};
  const firestoreId = docSnap?.id || data.firestoreId || data.firestore_id || data.id || "";
  const legacyId = data.id && data.id !== firestoreId ? data.id : data.eventId || data.event_id || data.legacyId || data.legacy_id || "";

  return {
    ...data,
    id: firestoreId,
    firestoreId,
    firestore_id: firestoreId,
    ...(legacyId
      ? {
          legacyId,
          legacy_id: legacyId,
        }
      : {}),
    ...(options.type
      ? {
          documentType: options.type,
          document_type: options.type,
        }
    : {}),
  };
}

export function uniqueFirestoreDocsFromSnapshots(snapshots = []) {
  const seen = new Set();
  const docs = [];

  snapshots.forEach((snapshot) => {
    snapshot?.docs?.forEach((docSnap) => {
      if (!docSnap?.id || seen.has(docSnap.id)) return;
      seen.add(docSnap.id);
      docs.push(docSnap);
    });
  });

  return docs;
}

export function mapFirestoreSnapshots(snapshots = [], options = {}) {
  return uniqueFirestoreDocsFromSnapshots(snapshots).map((docSnap) => mapFirestoreDoc(docSnap, options));
}

export function mapSettledFirestoreSnapshots(results = [], options = {}) {
  const snapshots = results
    .filter((result) => result.status === "fulfilled")
    .map((result) => result.value);

  return mapFirestoreSnapshots(snapshots, options);
}

export function getFirestoreDocumentId(item = {}) {
  return item.firestoreId || item.firestore_id || item.docId || item.doc_id || item.documentId || item.document_id || item.id || "";
}

export function withFirestoreId(data = {}, firestoreId = "") {
  const legacyId = data.id && data.id !== firestoreId ? data.id : data.legacyId || data.legacy_id || "";

  return {
    ...data,
    id: firestoreId || data.id || "",
    firestoreId: firestoreId || data.firestoreId || data.firestore_id || data.id || "",
    firestore_id: firestoreId || data.firestore_id || data.firestoreId || data.id || "",
    ...(legacyId
      ? {
          legacyId,
          legacy_id: legacyId,
        }
      : {}),
  };
}
