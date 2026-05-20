/**
 * Global Structural Field Limitation Boundaries for Catalog Domain Entities.
 * Frozen object literal enforcing hard runtime constraints.
 */
export const CATALOG_LIMITS = {
  bio: {
    min: 1,
    max: 1000,
  },
  skills: {
    min: 1,
    max: 20,
    itemMin: 1,
    itemMax: 50,
  },
} as const;
