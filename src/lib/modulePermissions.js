export const FAMILY_MODULE_KEYS = {
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

const MODULE_ALIASES = {
  grocery: ["lists", "groceries"],
  groceries: ["lists", "groceries"],
  lists: ["lists", "groceries"],
};

function moduleKeys(moduleName) {
  const key = String(moduleName || "").trim();
  return MODULE_ALIASES[key] || [key];
}

function permissionValues(perms = {}, moduleName = "") {
  return moduleKeys(moduleName)
    .map((key) => perms?.[key])
    .filter(Boolean);
}

export function getModulePermission(perms = {}, moduleName = "") {
  const values = permissionValues(perms, moduleName);

  return {
    read: values.some((permission) => permission?.read === true || permission?.write === true),
    write: values.some((permission) => permission?.write === true),
  };
}

export function canReadModule(perms = {}, moduleName = "") {
  return getModulePermission(perms, moduleName).read === true;
}

export function canWriteModule(perms = {}, moduleName = "") {
  return getModulePermission(perms, moduleName).write === true;
}

export function canReadAllModules(perms = {}, moduleNames = []) {
  return moduleNames.every((moduleName) => canReadModule(perms, moduleName));
}

export function canWriteAllModules(perms = {}, moduleNames = []) {
  return moduleNames.every((moduleName) => canWriteModule(perms, moduleName));
}
