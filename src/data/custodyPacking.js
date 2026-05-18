export const custodyPackingTemplates = [
  {
    id: "school",
    label: "School Day",
    description: "Backpack, homework, lunchbox, school forms.",
    tone: "blue",
  },
  {
    id: "weekend",
    label: "Weekend Stay",
    description: "Clothes, pajamas, shoes, comfort items.",
    tone: "amber",
  },
  {
    id: "sports",
    label: "Sports Day",
    description: "Uniform, cleats, water bottle, gear bag.",
    tone: "emerald",
  },
  {
    id: "medicine",
    label: "Medicine",
    description: "Medication, dosage notes, instructions.",
    tone: "rose",
  },
];

export const initialCustodyPackingItems = [
  {
    id: "backpack",
    name: "School backpack",
    category: "School",
    owner: "Shared",
    status: "packed",
    important: true,
  },
  {
    id: "medicine",
    name: "Medicine bag",
    category: "Medicine",
    owner: "Dad",
    status: "missing",
    important: true,
  },
  {
    id: "uniform",
    name: "Soccer uniform",
    category: "Sports",
    owner: "Mom",
    status: "review",
    important: false,
  },
  {
    id: "pajamas",
    name: "Pajamas",
    category: "Clothes",
    owner: "Shared",
    status: "packed",
    important: false,
  },
  {
    id: "comfort",
    name: "Favorite blanket",
    category: "Comfort",
    owner: "Shared",
    status: "review",
    important: false,
  },
];

export function getPackingSummary(items = initialCustodyPackingItems) {
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
