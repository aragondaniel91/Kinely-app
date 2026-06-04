import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import { readFile } from "node:fs/promises";

const PROJECT_ID = "demo-kinely";
const FAMILY_ID = "family_rules_smoke";
const CUSTODY_GROUP_ID = "custody_rules_smoke";

const ownerUid = "owner_uid";
const ownerEmail = "owner@example.com";
const caregiverUid = "caregiver_uid";
const caregiverEmail = "caregiver@example.com";
const taskEditorUid = "task_editor_uid";
const taskEditorEmail = "task.editor@example.com";
const strangerUid = "stranger_uid";
const strangerEmail = "stranger@example.com";

const testEnv = await initializeTestEnvironment({
  projectId: PROJECT_ID,
  firestore: {
    rules: await readFile("firestore.rules", "utf8"),
  },
});

const contextFor = (uid, email) =>
  testEnv.authenticatedContext(uid, {
    email,
    email_verified: true,
  });

try {
  await testEnv.clearFirestore();

  const ownerDb = contextFor(ownerUid, ownerEmail).firestore();
  const caregiverDb = contextFor(caregiverUid, caregiverEmail).firestore();
  const taskEditorDb = contextFor(taskEditorUid, taskEditorEmail).firestore();
  const strangerDb = contextFor(strangerUid, strangerEmail).firestore();

  await assertSucceeds(
    ownerDb.doc(`families/${FAMILY_ID}`).set({
      familyId: FAMILY_ID,
      ownerId: ownerUid,
      ownerEmail,
      adminIds: [ownerUid],
      adminEmails: [ownerEmail],
      memberIds: [ownerUid],
      memberEmails: [ownerEmail],
      viewerIds: [caregiverUid],
      viewerEmails: [caregiverEmail],
      calendarReaderIds: [caregiverUid],
      calendarReaderEmails: [caregiverEmail],
      tasksReaderIds: [caregiverUid],
      tasksReaderEmails: [caregiverEmail],
      tasksWriterIds: [taskEditorUid],
      tasksWriterEmails: [taskEditorEmail],
      listsReaderIds: [caregiverUid],
      listsReaderEmails: [caregiverEmail],
      createdAt: "2026-06-03T00:00:00.000Z",
      updatedAt: "2026-06-03T00:00:00.000Z",
    })
  );

  await assertSucceeds(
    ownerDb.doc("familyEvents/event_owner").set({
      familyId: FAMILY_ID,
      title: "School pickup",
      date: "2026-06-03",
      createdByUid: ownerUid,
    })
  );
  await assertSucceeds(caregiverDb.doc("familyEvents/event_owner").get());
  await assertFails(
    caregiverDb.doc("familyEvents/event_caregiver").set({
      familyId: FAMILY_ID,
      title: "Caregiver should not write calendar",
      date: "2026-06-03",
      createdByUid: caregiverUid,
    })
  );

  await assertSucceeds(
    ownerDb.doc("tasks/task_owner").set({
      familyId: FAMILY_ID,
      title: "Owner-created task",
      status: "pending",
      createdByUid: ownerUid,
    })
  );
  await assertSucceeds(caregiverDb.doc("tasks/task_owner").get());
  await assertFails(
    caregiverDb.doc("tasks/task_owner").update({
      status: "done",
      updatedAt: "2026-06-03T01:00:00.000Z",
    })
  );
  await assertSucceeds(
    taskEditorDb.doc("familyActivity/task_activity_editor").set({
      familyId: FAMILY_ID,
      module: "tasks",
      type: "task_completed",
      title: "Task completed",
      createdBy: taskEditorUid,
      actorId: taskEditorUid,
    })
  );
  await assertFails(
    taskEditorDb.doc("familyActivity/calendar_activity_editor").set({
      familyId: FAMILY_ID,
      module: "calendar",
      type: "event_created",
      title: "Calendar activity should require calendar write",
      createdBy: taskEditorUid,
      actorId: taskEditorUid,
    })
  );

  await assertSucceeds(
    ownerDb.doc("familyLists/list_owner").set({
      familyId: FAMILY_ID,
      title: "Groceries",
      status: "active",
      createdByUid: ownerUid,
    })
  );
  await assertSucceeds(caregiverDb.doc("familyLists/list_owner").get());
  await assertFails(
    caregiverDb.doc("familyLists/list_caregiver").set({
      familyId: FAMILY_ID,
      title: "Caregiver should not write lists",
      status: "active",
      createdByUid: caregiverUid,
    })
  );

  await assertSucceeds(
    ownerDb.doc(`custodyGroups/${CUSTODY_GROUP_ID}`).set({
      familyId: CUSTODY_GROUP_ID,
      custodyGroupId: CUSTODY_GROUP_ID,
      ownerId: ownerUid,
      ownerEmail,
      adminIds: [ownerUid],
      adminEmails: [ownerEmail],
      memberIds: [ownerUid],
      memberEmails: [ownerEmail],
      viewerIds: [caregiverUid],
      viewerEmails: [caregiverEmail],
      custodyReaderIds: [caregiverUid],
      custodyReaderEmails: [caregiverEmail],
      budgetReaderIds: [],
      budgetReaderEmails: [],
      budgetWriterIds: [],
      budgetWriterEmails: [],
      createdAt: "2026-06-03T00:00:00.000Z",
      updatedAt: "2026-06-03T00:00:00.000Z",
    })
  );

  await assertSucceeds(
    ownerDb.doc("custodyExpenses/expense_owner").set({
      familyId: CUSTODY_GROUP_ID,
      custodyGroupId: CUSTODY_GROUP_ID,
      title: "Medical copay",
      amount: 25,
      createdByUid: ownerUid,
    })
  );
  await assertFails(caregiverDb.doc("custodyExpenses/expense_owner").get());
  await assertFails(strangerDb.doc(`families/${FAMILY_ID}`).get());

  console.log("Firestore rules smoke test passed.");
} finally {
  await testEnv.cleanup();
}
