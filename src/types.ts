const CATEGORIES = [
  "Hersteller",
  "Großhändler",
  "Installationsunternehmen",
  "EPC-Unternehmen",
  "Finanzdienstleister",
  "Beratungsunternehmen",
  "Sonstige",
  "Unknown",
];

export type Category = (typeof CATEGORIES)[number];

// I only need these infos, as the country is not accurate, e.g. Huawei is counted as German company (branch company).
export type Company = {
  name: string;
  category: Category;
  website?: string;
};
