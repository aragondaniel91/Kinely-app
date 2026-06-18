export const custodyPackingTemplates = [
  {
    id: "school",
    label: "School Day",
    description: "Backpack, homework, lunchbox, school forms.",
    tone: "blue",
    items: [
      { name: "Backpack", category: "School", important: true },
      { name: "Homework folder", category: "School" },
      { name: "Lunchbox", category: "School" },
      { name: "School forms", category: "School" },
    ],
  },
  {
    id: "weekend",
    label: "Weekend Stay",
    description: "Clothes, pajamas, shoes, comfort items.",
    tone: "amber",
    items: [
      { name: "Clothes", category: "Clothes", important: true },
      { name: "Pajamas", category: "Clothes" },
      { name: "Shoes", category: "Clothes" },
      { name: "Comfort item", category: "Comfort" },
    ],
  },
  {
    id: "sports",
    label: "Sports Day",
    description: "Uniform, cleats, water bottle, gear bag.",
    tone: "emerald",
    items: [
      { name: "Uniform", category: "Sports", important: true },
      { name: "Cleats", category: "Sports" },
      { name: "Water bottle", category: "Sports" },
      { name: "Gear bag", category: "Sports" },
    ],
  },
  {
    id: "medicine",
    label: "Medicine",
    description: "Medication, dosage notes, instructions.",
    tone: "rose",
    items: [
      { name: "Medication", category: "Medicine", important: true },
      { name: "Dosage notes", category: "Medicine", important: true },
      { name: "Care instructions", category: "Medicine" },
    ],
  },
];

export function getPackingSummary(items = []) {
  const totalCount = items.length;
  const packedCount = items.filter((item) => item.status === "packed").length;
  const missingCount = items.filter((item) => item.status === "missing").length;
  const reviewCount = items.filter((item) => item.status === "review").length;
  const readiness = totalCount ? Math.round((packedCount / totalCount) * 100) : 0;

  return {
    totalCount,
    packedCount,
    missingCount,
    reviewCount,
    readiness,
    isReady: totalCount > 0 && missingCount === 0 && reviewCount === 0,
  };
}
