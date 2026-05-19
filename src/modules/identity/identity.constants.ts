export const IDENTITY_LIMITS = {
  email: { max: 255 },
  username: { min: 3, max: 50 },
  password: {
    min: 8,
    max: 100,
    hash: { max: 255 },
  },
  firstName: { max: 100 },
  lastName: { max: 100 },
  avatarUrl: { max: 500 },
  currentContext: { max: 20 },
  bio: { max: 1000 },
  saldoWallet: { precision: 12, scale: 2 },
  skills: { min: 1, itemMin: 1 },
} as const;

export const USER_CONTEXT = {
  USER: "USER",
  TALENT: "TALENT",
  ADMIN: "ADMIN",
} as const;

// Systemic profile verification boundaries and enrollment filters
export const REGISTRATION_RULES = {
  minAgeRequired: 13, // Centralized platform age floor gate
} as const;

export const HASH_CONFIG = {
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
} as const;
