import assert from "node:assert/strict";

import {
  canAssignCalendarEventsToMember,
  canAssignTasksToMember,
  shouldShowMemberInCalendar,
  shouldShowMemberInTasks,
  shouldShowMemberOnHome,
} from "../src/features/tasks/utils/memberModuleVisibility.js";

const readWriteOnlyAdult = {
  id: "caregiver_rw",
  type: "adult",
  role: "viewer",
  modules: {
    calendar: { read: true, write: true, visible: false, assignable: false },
    tasks: { read: true, write: true, visible: false, assignable: false },
  },
};

assert.equal(shouldShowMemberInCalendar(readWriteOnlyAdult), false);
assert.equal(canAssignCalendarEventsToMember(readWriteOnlyAdult), false);
assert.equal(shouldShowMemberInTasks(readWriteOnlyAdult), false);
assert.equal(canAssignTasksToMember(readWriteOnlyAdult), false);

const assignableAdult = {
  id: "grandma_assignable",
  type: "adult",
  role: "viewer",
  modules: {
    calendar: { read: false, write: false, visible: true, assignable: true },
    tasks: { read: false, write: false, visible: true, assignable: true },
  },
};

assert.equal(shouldShowMemberInCalendar(assignableAdult), true);
assert.equal(canAssignCalendarEventsToMember(assignableAdult), true);
assert.equal(shouldShowMemberInTasks(assignableAdult), true);
assert.equal(canAssignTasksToMember(assignableAdult), true);

const defaultChild = {
  id: "child_default",
  type: "child",
  role: "child",
};

assert.equal(shouldShowMemberInCalendar(defaultChild), true);
assert.equal(canAssignCalendarEventsToMember(defaultChild), true);
assert.equal(shouldShowMemberInTasks(defaultChild), true);
assert.equal(canAssignTasksToMember(defaultChild), true);

const hiddenChild = {
  id: "child_hidden",
  type: "child",
  role: "child",
  modules: {
    calendar: { visible: false, assignable: false },
    tasks: { visible: false, assignable: false },
  },
};

assert.equal(shouldShowMemberInCalendar(hiddenChild), false);
assert.equal(canAssignCalendarEventsToMember(hiddenChild), false);
assert.equal(shouldShowMemberInTasks(hiddenChild), false);
assert.equal(canAssignTasksToMember(hiddenChild), false);

const admin = {
  id: "admin",
  role: "admin",
};

assert.equal(shouldShowMemberInCalendar(admin), true);
assert.equal(canAssignCalendarEventsToMember(admin), true);
assert.equal(shouldShowMemberInTasks(admin), true);
assert.equal(canAssignTasksToMember(admin), true);

const hiddenAtHome = {
  id: "hidden_home_member",
  role: "caregiver",
  livesHere: true,
  showOnHomeDashboard: false,
};

assert.equal(shouldShowMemberOnHome(hiddenAtHome), false);

console.log("Permission visibility smoke test passed.");
