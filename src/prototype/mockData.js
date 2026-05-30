// Mock data for the Kinely Family Dashboard prototype.
// No backend, no Firebase — this is UI-only sample data that Codex can later
// swap for real Kinely data sources.

export const family = {
  name: "Aragon's Family",
  shortName: "Aragon Family",
  // Toggle this in the prototype to preview custody-enabled vs. normal family mode.
  custodyEnabled: true,
};

// Brand-aligned tone keys. Each maps to soft surfaces + accents in the components.
export const people = [
  {
    id: "joaquin",
    name: "Joaquin",
    role: "Age 9 · 3rd grade",
    kind: "child",
    tone: "blue",
    initials: "Jo",
    tasksToday: 3,
    tasksDone: 1,
    nextEvent: "Soccer practice · 4:00 PM",
    rewardLabel: "Stars this week",
    rewardValue: 12,
    rewardGoal: 20,
    status: "Reading log due tonight",
    alert: false,
  },
  {
    id: "emma",
    name: "Emma",
    role: "Age 7 · 1st grade",
    kind: "child",
    tone: "rose",
    initials: "Em",
    tasksToday: 2,
    tasksDone: 2,
    nextEvent: "Gymnastics · 5:30 PM",
    rewardLabel: "Stars this week",
    rewardValue: 18,
    rewardGoal: 20,
    status: "All done for today",
    alert: false,
  },
  {
    id: "lucas",
    name: "Lucas",
    role: "Age 4 · Pre-K",
    kind: "child",
    tone: "amber",
    initials: "Lu",
    tasksToday: 1,
    tasksDone: 0,
    nextEvent: "Library story time · 10 AM",
    rewardLabel: "Stickers",
    rewardValue: 6,
    rewardGoal: 10,
    status: "Pack water bottle",
    alert: true,
  },
  {
    id: "dad",
    name: "Dad",
    role: "Daniel",
    kind: "adult",
    tone: "teal",
    initials: "Da",
    tasksToday: 4,
    tasksDone: 1,
    nextEvent: "Pickup Joaquin · 5:00 PM",
    status: "Grocery run after work",
    alert: false,
  },
  {
    id: "mom",
    name: "Mom",
    role: "Sofia",
    kind: "adult",
    tone: "violet",
    initials: "So",
    tasksToday: 2,
    tasksDone: 2,
    nextEvent: "Dentist · 2:15 PM",
    status: "Working from home today",
    alert: false,
  },
  {
    id: "grandma",
    name: "Grandma",
    role: "Caregiver",
    kind: "caregiver",
    tone: "green",
    initials: "Gr",
    tasksToday: 1,
    tasksDone: 0,
    nextEvent: "Watch Lucas · 1–4 PM",
    status: "Helping with afternoon",
    alert: false,
  },
];

export const tasks = [
  { id: "t1", title: "Reading log — 20 minutes", who: "Joaquin", tone: "blue", due: "Tonight", overdue: false },
  { id: "t2", title: "Pack soccer cleats & water", who: "Joaquin", tone: "blue", due: "Before 4 PM", overdue: false },
  { id: "t3", title: "Lucas — return library books", who: "Lucas", tone: "amber", due: "Overdue", overdue: true },
  { id: "t4", title: "Sign Emma's permission slip", who: "Mom", tone: "violet", due: "Today", overdue: false },
  { id: "t5", title: "Refill prescriptions", who: "Dad", tone: "teal", due: "Today", overdue: false },
];

export const meals = {
  dinner: {
    title: "Sheet-pan chicken fajitas",
    note: "Mild for the kids · guacamole on the side",
    time: "6:30 PM",
    cook: "Dad",
    tags: ["Family favorite", "30 min"],
  },
  others: [
    { label: "Breakfast", value: "Oatmeal & berries" },
    { label: "Lunch", value: "School / leftovers" },
    { label: "Snack", value: "Apples & string cheese" },
  ],
};

export const groceries = {
  primaryList: "Weekly groceries",
  openItems: 11,
  lists: [
    { name: "Weekly groceries", count: 11 },
    { name: "Target run", count: 4 },
    { name: "Birthday party", count: 6 },
  ],
  highlights: ["Bell peppers", "Tortillas", "Greek yogurt", "Lucas's diapers"],
};

// Family Calendar events (school, sports, appointments, birthdays, activities).
export const familyEvents = [
  {
    id: "e1",
    title: "Soccer practice",
    person: "Joaquin",
    tone: "blue",
    time: "4:00 PM",
    day: "Today",
    location: "Riverside Park · Field 2",
    category: "Sports",
  },
  {
    id: "e2",
    title: "Gymnastics",
    person: "Emma",
    tone: "rose",
    time: "5:30 PM",
    day: "Today",
    location: "Little Stars Gym",
    category: "Activity",
  },
  {
    id: "e3",
    title: "Dentist — cleaning",
    person: "Mom",
    tone: "violet",
    time: "2:15 PM",
    day: "Tomorrow",
    location: "Bright Smile Dental",
    category: "Appointment",
  },
  {
    id: "e4",
    title: "Grandpa's birthday dinner",
    person: "Family",
    tone: "amber",
    time: "6:00 PM",
    day: "Sat",
    location: "Home",
    category: "Birthday",
  },
];

// Custody Calendar blocks — kept visually distinct from Family Calendar events.
export const custodyToday = {
  child: "Joaquin",
  withParent: "Dad",
  summary: "Joaquin with Dad today",
  exchange: "Pickup 5:00 PM at school",
  nextChange: "Switch to Mom on Friday",
};

export const recentUpdates = [
  { id: "a1", text: "Mom added \"Dentist\" to the Family Calendar", tone: "violet", time: "12m ago", type: "event" },
  { id: "a2", text: "Emma completed all her tasks 🎉", tone: "rose", time: "1h ago", type: "task" },
  { id: "a3", text: "Dad updated dinner to fajitas", tone: "amber", time: "2h ago", type: "meal" },
  { id: "a4", text: "Grandma confirmed she can watch Lucas", tone: "green", time: "3h ago", type: "custody" },
];

export const weather = {
  temp: 78,
  condition: "Sunny",
  high: 81,
  low: 64,
  tip: "Rain after 4 PM — bring jackets for soccer",
};

export const familyNote = {
  author: "Mom",
  text: "Don't forget Grandpa's gift before Saturday — Lucas wants to help wrap it!",
};
