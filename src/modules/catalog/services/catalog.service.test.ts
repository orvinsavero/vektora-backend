// src/modules/catalog/services/catalog.service.test.ts
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { db } from "@/shared/database/client";
import { CatalogService } from "./catalog.service";
import { users } from "../../identity/identity.schema";
import { talents } from "../catalog.schema";
import { USER_CONTEXT } from "../../identity/identity.constants";
import { eq, inArray } from "drizzle-orm";
import { cache } from "@/shared/cache/redis";

describe("CatalogService - registerNewTalent", () => {
  let mockUser: typeof users.$inferSelect;
  let createdUserIds: string[] = [];

  beforeEach(async () => {
    // Generate a clean, isolated database user entry matching core schema constraints
    const [insertedUser] = await db
      .insert(users)
      .values({
        email: `test-talent-${crypto.randomUUID()}@marketplace.com`,
        username: `talent_${crypto.randomUUID().substring(0, 8)}`,
        passwordHash: "argon2id_mock_hash_string",
        firstName: "Test",
        lastName: "Talent Account",
        birthDate: "1995-06-15",
        currentContext: USER_CONTEXT.USER,
        isActive: true,
      })
      .returning();

    mockUser = insertedUser;
    createdUserIds.push(mockUser.id);
  });

  /* FORCE RELATIONAL CLEANUP AFTER EACH TEST LANE RUNS */
  afterEach(async () => {
    if (createdUserIds.length > 0) {
      // Clean talents table first to prevent breaking relational foreign key constraints
      await db.delete(talents).where(inArray(talents.userId, createdUserIds));
      // Clean parent user identity nodes cleanly
      await db.delete(users).where(inArray(users.id, createdUserIds));
      createdUserIds = [];
    }
  });

  it("should successfully upgrade a base user to a talent storefront profile (Happy Path)", async () => {
    const payload = {
      userId: mockUser.id,
      bio: "Senior full stack designer specializing in hyper-scalable UI systems.",
      skills: ["TypeScript", "Next.js", "TailwindCSS"],
    };

    const talentResult = await CatalogService.registerNewTalent(payload, db);

    expect(talentResult).toBeDefined();
    expect(talentResult.userId).toBe(mockUser.id);
    expect(talentResult.bio).toBe(payload.bio);
    expect(talentResult.skills).toEqual(payload.skills);
    expect(talentResult.isVerified).toBe(false);

    // Verify cache fields are default-initialized to integers to prevent floating-point anomalies
    expect(talentResult.ratingCache).toBe(0);
    expect(talentResult.reviewCountCache).toBe(0);

    const updatedUser = await db.query.users.findFirst({
      where: eq(users.id, mockUser.id),
    });

    expect(updatedUser).toBeDefined();
    expect(updatedUser?.currentContext).toBe(USER_CONTEXT.TALENT);
  });

  it("should throw a NotFoundError if the target user id does not exist in the database", async () => {
    const payload = {
      userId: crypto.randomUUID(),
      bio: "Valid bio string",
      skills: ["Design"],
    };

    await expect(CatalogService.registerNewTalent(payload, db)).rejects.toThrow(
      "Target user account identity not found.",
    );
  });

  it("should throw a ConflictError if the user is already registered as a talent storefront", async () => {
    const payload = {
      userId: mockUser.id,
      bio: "First attempt profile initialization parameters.",
      skills: ["Copywriting"],
    };

    await CatalogService.registerNewTalent(payload, db);

    // Second attempt must violate uniqueness barriers and reject the instruction
    await expect(CatalogService.registerNewTalent(payload, db)).rejects.toThrow(
      "This user identity is already configured as a seller profile.",
    );
  });

  it("should attempt to clear the active session cache when a user upgrades to talent", async () => {
    const payload = {
      userId: mockUser.id,
      bio: "Valid bio string",
      skills: ["Design"],
    };

    // 1. Force isOpen to evaluate to true for this specific execution context
    (cache as any).isOpen = true;

    // 2. Set up a spy on the mocked del implementation
    const delSpy = vi.spyOn(cache, "del");

    // 3. Trigger your service mutation method
    await CatalogService.registerNewTalent(payload, db);

    // 4. Verify that the cache eviction line was successfully triggered with the correct key pattern
    expect(delSpy).toHaveBeenCalledWith(`session:active:${payload.userId}`);

    // 5. Clean up your state tracking and mock configuration after the pass
    delSpy.mockRestore();
    (cache as any).isOpen = false;
  });
});
