/**
 * Task domain model contracts for the Family Rhythm Board.
 *
 * This file is intentionally JSDoc-based instead of TypeScript so it fits the
 * current Vite/React JS structure while still documenting the data model clearly.
 *
 * Future Firestore direction:
 *
 * families/{familyId}
 * children/{childId}
 * familyMembers/{memberId}
 * tasks/{taskId}
 * rewards/{rewardId}
 */


/**
 * @typedef {"calendar" | "custody" | "tasks" | "meals" | "groceries"} FamilyModuleName
 */

/**
 * Module-specific access for a family member.
 *
 * visible:
 * - Whether the person should appear in that module UI.
 *
 * read/write:
 * - Whether the member can access or modify that module.
 *
 * assignable:
 * - Whether the member can be assigned items in that module, even if they cannot write.
 *
 * @typedef {Object} FamilyMemberModuleAccess
 * @property {boolean} visible
 * @property {boolean} read
 * @property {boolean} write
 * @property {boolean} assignable
 */

/**
 * @typedef {Object} FamilyMemberModules
 * @property {FamilyMemberModuleAccess=} calendar
 * @property {FamilyMemberModuleAccess=} custody
 * @property {FamilyMemberModuleAccess=} tasks
 * @property {FamilyMemberModuleAccess=} meals
 * @property {FamilyMemberModuleAccess=} groceries
 */

/**
 * @typedef {"child" | "parent" | "grandparent" | "caregiver" | "family"} TaskPersonRole
 */

/**
 * A person/group displayed in the person-first task board.
 *
 * @typedef {Object} TaskPerson
 * @property {string} id - Stable board person id. Example: "joaquin", "dad", "family".
 * @property {string} name - Display name.
 * @property {TaskPersonRole} role - Board role.
 * @property {string=} familyId - Family this person belongs to.
 * @property {string=} userId - Linked Firebase Auth user id, if this person is a real user.
 * @property {string=} childId - Linked child profile id, if this person represents a child.
 * @property {string=} avatarUrl - Optional real avatar/photo.
 * @property {string=} color - UI color token.
 * @property {boolean=} active - Whether this person should appear on the board.
 */

/**
 * @typedef {"pending" | "done" | "completed" | "skipped" | "needs_help"} FamilyTaskStatus
 */

/**
 * @typedef {"house" | "school" | "personal" | "work" | "family" | "other"} FamilyTaskCategory
 */

/**
 * A task assigned to a person or family group.
 *
 * @typedef {Object} FamilyTask
 * @property {string} id - Firestore document id.
 * @property {string} familyId - Family ownership boundary. Required for multi-family isolation.
 * @property {string} title - Short wall-screen-friendly task label.
 * @property {string=} description - Optional longer details.
 * @property {string} assignedTo - Person id or display name. Future: prefer assignedToPersonId.
 * @property {string=} assignedToPersonId - Stable TaskPerson id.
 * @property {string=} childId - Child id when task is child-specific.
 * @property {string=} icon - Icon key. Example: "bed", "read", "medicine".
 * @property {FamilyTaskCategory=} category - Task category.
 * @property {FamilyTaskStatus} status - Task state.
 * @property {string=} date - YYYY-MM-DD local family date.
 * @property {string=} dueDate - Optional due date.
 * @property {string=} dueTime - Optional due time.
 * @property {boolean=} rewardEligible - Whether this task counts toward rewards.
 * @property {string=} createdBy - User id that created the task.
 * @property {string=} updatedBy - User id that last updated the task.
 * @property {*} createdAt - Firestore timestamp.
 * @property {*} updatedAt - Firestore timestamp.
 */

/**
 * @typedef {"child" | "family"} TaskRewardType
 */

/**
 * A reward that tracks progress from completed tasks.
 *
 * @typedef {Object} TaskReward
 * @property {string} id - Firestore document id.
 * @property {string} familyId - Family ownership boundary.
 * @property {TaskRewardType} type - Child reward or family reward.
 * @property {string=} childId - Required for child rewards.
 * @property {string=} childName - Display name fallback.
 * @property {string} title - Reward title. Example: "Helado", "Pizza Night".
 * @property {string=} icon - Reward icon key.
 * @property {number} requiredTasks - Number of completed eligible tasks needed.
 * @property {boolean} active - Only active rewards should show on the wall board.
 * @property {string=} createdBy - User id that created the reward.
 * @property {*} createdAt - Firestore timestamp.
 * @property {*} updatedAt - Firestore timestamp.
 */

/**
 * Derived board state used by the UI layer.
 *
 * @typedef {Object} TaskBoardState
 * @property {TaskPerson[]} people
 * @property {FamilyTask[]} tasks
 * @property {Record<string, FamilyTask[]>} tasksByPerson
 * @property {TaskPerson|null} selectedPerson
 * @property {FamilyTask[]} selectedTasks
 * @property {TaskReward|null} childReward
 * @property {TaskReward|null} familyReward
 */

/**
 * Collection names used by the Tasks feature.
 * Keep these centralized so later Firestore hooks do not hardcode paths everywhere.
 */
export const TASK_COLLECTIONS = {
  tasks: "tasks",
  rewards: "rewards",
  templates: "taskTemplates",
  children: "children",
  familyMembers: "familyMembers",
};

/**
 * Supported task statuses.
 */
export const TASK_STATUSES = {
  pending: "pending",
  done: "done",
  completed: "completed",
  skipped: "skipped",
  needsHelp: "needs_help",
};

/**
 * Supported reward types.
 */
export const TASK_REWARD_TYPES = {
  child: "child",
  family: "family",
};

/**
 * Supported person roles.
 */
export const TASK_PERSON_ROLES = {
  child: "child",
  parent: "parent",
  grandparent: "grandparent",
  caregiver: "caregiver",
  family: "family",
};


/**
 * Supported family modules.
 */
export const TASK_MODULES = {
  calendar: "calendar",
  custody: "custody",
  tasks: "tasks",
  meals: "meals",
  groceries: "groceries",
};

/**
 * Default module visibility/access for optional family members.
 */
export const DEFAULT_MEMBER_MODULE_ACCESS = {
  visible: false,
  read: false,
  write: false,
  assignable: false,
};


/**
 * Supported routine/template types.
 */
export const TASK_TEMPLATE_TYPES = {
  daily: "daily",
  weekday: "weekday",
  weekend: "weekend",
  bedtime: "bedtime",
  custom: "custom",
};
