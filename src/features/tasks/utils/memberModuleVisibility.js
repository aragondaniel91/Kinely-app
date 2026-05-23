export const FAMILY_MODULES = {
  calendar: "calendar",
  custody: "custody",
  tasks: "tasks",
  meals: "meals",
  groceries: "groceries",
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
    booleanOrUndefined(member.visibleInTasks) ??
    booleanOrUndefined(member.visible_in_tasks) ??
    read;

  const assignable =
    booleanOrUndefined(member[legacyAssignableKey]) ??
    booleanOrUndefined(member.taskAssignable) ??
    booleanOrUndefined(member.task_assignable) ??
    false;

  return {
    visible,
    read,
    write,
    assignable,
  };
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

export function shouldShowMemberInTasks(member = {}) {
  const access = getMemberModuleAccess(member, FAMILY_MODULES.tasks);

  return access.visible === true || access.assignable === true;
}

export function canAssignTasksToMember(member = {}) {
  const access = getMemberModuleAccess(member, FAMILY_MODULES.tasks);

  return access.assignable === true;
}

export function buildDefaultTasksModuleAccess({
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
