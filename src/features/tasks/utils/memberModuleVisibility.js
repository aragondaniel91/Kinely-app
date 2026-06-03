export const FAMILY_MODULES = {
  home: "home",
  calendar: "calendar",
  tasks: "tasks",
  meals: "meals",
  lists: "lists",
  groceries: "groceries",
  custody: "custody",
  budget: "budget",
  notifications: "notifications",
};

export const DEFAULT_MEMBER_MODULE_ACCESS = {
  visible: false,
  read: false,
  write: false,
  assignable: false,
};

function booleanOrUndefined(value) {
  return typeof value === "boolean" ? value : undefined;
}

function normalizeModuleAccess(value = {}) {
  return {
    visible: booleanOrUndefined(value.visible),
    read: booleanOrUndefined(value.read),
    write: booleanOrUndefined(value.write),
    assignable: booleanOrUndefined(value.assignable),
  };
}

function getLegacyModuleAccess(member = {}, moduleName) {
  const permissions = member.permissions?.[moduleName] || {};
  const legacyShareKey = `share_${moduleName}`;
  const legacyWriteKey = `${moduleName}_write`;
  const legacyVisibleKey = `${moduleName}_visible`;
  const legacyAssignableKey = `${moduleName}_assignable`;
  const legacyTaskVisible =
    moduleName === FAMILY_MODULES.tasks
      ? booleanOrUndefined(member.visibleInTasks) ??
        booleanOrUndefined(member.visible_in_tasks)
      : undefined;
  const legacyCalendarVisible =
    moduleName === FAMILY_MODULES.calendar
      ? booleanOrUndefined(member.visibleInCalendar) ??
        booleanOrUndefined(member.visible_in_calendar)
      : undefined;

  const read =
    booleanOrUndefined(member[legacyShareKey]) ??
    booleanOrUndefined(permissions.read) ??
    false;

  const write =
    booleanOrUndefined(member[legacyWriteKey]) ??
    booleanOrUndefined(permissions.write) ??
    false;

  const visible =
    booleanOrUndefined(member[legacyVisibleKey]) ??
    legacyTaskVisible ??
    legacyCalendarVisible ??
    false;

  const assignable =
    booleanOrUndefined(member[legacyAssignableKey]) ??
    (moduleName === FAMILY_MODULES.tasks
      ? booleanOrUndefined(member.taskAssignable) ??
        booleanOrUndefined(member.task_assignable)
      : undefined) ??
    (moduleName === FAMILY_MODULES.calendar
      ? booleanOrUndefined(member.calendarAssignable) ??
        booleanOrUndefined(member.calendar_assignable)
      : undefined) ??
    false;

  return {
    visible,
    read,
    write,
    assignable,
  };
}

function hasExplicitModuleAccess(member = {}, moduleName = FAMILY_MODULES.tasks) {
  const modernAccess = normalizeModuleAccess(member.modules?.[moduleName]);
  if (Object.values(modernAccess).some((value) => typeof value === "boolean")) {
    return true;
  }

  const legacyAccess = getLegacyModuleAccess(member, moduleName);
  return Object.values(legacyAccess).some((value) => typeof value === "boolean" && value === true);
}

function shouldUseDefaultChildAssignment(member = {}, moduleName) {
  return isChildMember(member) && !hasExplicitModuleAccess(member, moduleName);
}

/**
 * Returns member access for a module.
 *
 * Preferred modern shape:
 * member.modules.tasks = {
 *   visible: true,
 *   read: true,
 *   write: false,
 *   assignable: true
 * }
 *
 * Legacy fallback:
 * - member.permissions.tasks.read/write
 * - member.share_tasks
 * - member.tasks_write
 * - member.taskAssignable
 */
export function getMemberModuleAccess(member = {}, moduleName = FAMILY_MODULES.tasks) {
  const modernAccess = normalizeModuleAccess(member.modules?.[moduleName]);

  const hasModernAccess = Object.values(modernAccess).some(
    (value) => typeof value === "boolean"
  );

  if (hasModernAccess) {
    return {
      ...DEFAULT_MEMBER_MODULE_ACCESS,
      ...modernAccess,
    };
  }

  return {
    ...DEFAULT_MEMBER_MODULE_ACCESS,
    ...getLegacyModuleAccess(member, moduleName),
  };
}

function hasExplicitFalse(value) {
  return value === false;
}

function hasExplicitTrue(value) {
  return value === true;
}

export function isAdminLikeMember(member = {}) {
  const appRole = String(member.appRole || member.app_role || "").trim().toLowerCase();
  const role = String(member.role || "").trim().toLowerCase();

  return (
    member.admin === true ||
    member.isAdmin === true ||
    member.is_admin === true ||
    role === "owner" ||
    role === "admin" ||
    appRole === "owner" ||
    appRole === "admin"
  );
}

export function isChildMember(member = {}) {
  const type = String(member.type || member.personType || member.person_type || "").trim().toLowerCase();
  const relationship = String(
    member.relationship ||
      member.memberRelationship ||
      member.member_relationship ||
      member.role ||
      ""
  )
    .trim()
    .toLowerCase();

  return type === "child" || relationship === "child";
}

export function shouldShowMemberOnHome(member = {}) {
  if (hasExplicitFalse(member.showOnHomeDashboard)) return false;
  if (hasExplicitFalse(member.show_on_home_dashboard)) return false;
  if (hasExplicitFalse(member.homeDashboard)) return false;
  if (hasExplicitFalse(member.home_dashboard)) return false;

  if (hasExplicitTrue(member.showOnHomeDashboard)) return true;
  if (hasExplicitTrue(member.show_on_home_dashboard)) return true;
  if (hasExplicitTrue(member.homeDashboard)) return true;
  if (hasExplicitTrue(member.home_dashboard)) return true;

  if (isAdminLikeMember(member)) return true;
  if (isChildMember(member)) return true;
  if (member.livesHere === true || member.lives_here === true) return true;

  return false;
}

export function shouldShowMemberInTasks(member = {}) {
  const access = getMemberModuleAccess(member, FAMILY_MODULES.tasks);

  return (
    isAdminLikeMember(member) ||
    shouldUseDefaultChildAssignment(member, FAMILY_MODULES.tasks) ||
    access.visible === true ||
    access.assignable === true
  );
}

export function canAssignTasksToMember(member = {}) {
  const access = getMemberModuleAccess(member, FAMILY_MODULES.tasks);

  return (
    isAdminLikeMember(member) ||
    shouldUseDefaultChildAssignment(member, FAMILY_MODULES.tasks) ||
    access.assignable === true
  );
}

export function shouldShowMemberInCalendar(member = {}) {
  const access = getMemberModuleAccess(member, FAMILY_MODULES.calendar);

  return (
    isAdminLikeMember(member) ||
    shouldUseDefaultChildAssignment(member, FAMILY_MODULES.calendar) ||
    access.visible === true ||
    access.assignable === true
  );
}

export function canAssignCalendarEventsToMember(member = {}) {
  const access = getMemberModuleAccess(member, FAMILY_MODULES.calendar);

  return (
    isAdminLikeMember(member) ||
    shouldUseDefaultChildAssignment(member, FAMILY_MODULES.calendar) ||
    access.assignable === true
  );
}

export function buildDefaultModuleAccess({
  visible = false,
  read = false,
  write = false,
  assignable = false,
} = {}) {
  return {
    visible,
    read,
    write,
    assignable,
  };
}

export const buildDefaultTasksModuleAccess = buildDefaultModuleAccess;
