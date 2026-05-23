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
  portfolio: {
    title: { min: 3, max: 255 },
    description: { max: 5000 },
    externalLink: { max: 500 },
    attachments: { max: 5 },
    mediaUrl: { max: 500 },
  },
} as const;

/**
 * Whitelisted media types permissible for portfolio uploads.
 * Deep frozen to satisfy compile-time Zod enum tuple constraints natively.
 */
export const ALLOWED_MEDIA_TYPES = ["IMAGE", "VIDEO", "DOCUMENT"] as const;

/**
 * Shared Architectural Caching TTL & Key Namespaces for the Catalog Domain.
 */
export const CATALOG_CACHE = {
  keys: {
    categoriesAll: "catalog:categories:all",
  },
  ttl: 1800, // 30-minute storage life window for static lists
} as const;
