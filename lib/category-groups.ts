export interface CategoryGroup {
  slug: string;
  name: string;
  /** Matches Category.slug in the DB */
  categorySlugs: string[];
  /** Subcategory labels shown in sidebar when this group is active */
  subcategories: { label: string; slugs: string[] }[];
}

export const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    slug: "oblacila",
    name: "Oblačila",
    categorySlugs: ["majice", "t-shirt", "srajce", "obleke", "puloverji", "jopici", "hlace", "jakne"],
    subcategories: [
      { label: "Majice & polo", slugs: ["majice", "t-shirt"] },
      { label: "Srajce & bluze", slugs: ["srajce"] },
      { label: "Obleke", slugs: ["obleke"] },
      { label: "Puloverji & jopici", slugs: ["puloverji", "jopici"] },
      { label: "Hlače", slugs: ["hlace"] },
      { label: "Jakne & plašči", slugs: ["jakne"] },
    ],
  },
  {
    slug: "obutev",
    name: "Obutev",
    categorySlugs: ["superge", "skorninji", "sandali"],
    subcategories: [
      { label: "Superge", slugs: ["superge"] },
      { label: "Škornji & čevlji", slugs: ["skorninji"] },
      { label: "Sandali", slugs: ["sandali"] },
    ],
  },
  {
    slug: "sport",
    name: "Šport",
    categorySlugs: ["sport-majice", "sport-hlace", "sport-jakne"],
    subcategories: [
      { label: "Športne majice", slugs: ["sport-majice"] },
      { label: "Športne hlače", slugs: ["sport-hlace"] },
      { label: "Športne jakne", slugs: ["sport-jakne"] },
    ],
  },
  {
    slug: "dodatki",
    name: "Dodatki",
    categorySlugs: ["kape", "pasovi", "torbice"],
    subcategories: [
      { label: "Kape & berete", slugs: ["kape"] },
      { label: "Pasovi", slugs: ["pasovi"] },
      { label: "Torbice", slugs: ["torbice"] },
    ],
  },
];

export function getGroup(slug: string): CategoryGroup | undefined {
  return CATEGORY_GROUPS.find((g) => g.slug === slug);
}
