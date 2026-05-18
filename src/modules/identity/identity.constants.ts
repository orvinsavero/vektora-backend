export const IDENTITY_LIMITS = {
  // Field length, array scale, and numeric precision constraints enforced across validation and database layers
  email: { max: 255 },
  username: { min: 3, max: 50 },
  fullName: { max: 100 },
  avatarUrl: { max: 500 },
  currentContext: { max: 20 },
  bio: { max: 1000 },
  saldoWallet: { precision: 12, scale: 2 },
  skills: { min: 1, itemMin: 1 },
} as const;

export const USER_CONTEXT = {
  // Domain context discriminators representing active user behavioral and permission profiles
  USER: "USER",
  TALENT: "TALENT",
  ADMIN: "ADMIN",
} as const;
