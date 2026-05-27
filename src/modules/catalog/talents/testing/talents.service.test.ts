import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { cache } from "@/shared/cache/redis";
import { db } from "@/shared/database/client";
import { USER_CONTEXT } from "../../../identity/identity.constants";
import { users } from "../../../identity/identity.schema";
import { talents } from "../../catalog.schema";
import { TalentsService } from "../talents.service";

describe("TalentsService Integration Tests", () => {
  let mockUser: typeof users.$inferSelect;
  let createdUserIds: string[] = [];

  beforeEach(async () => {
    // Initialize isolated user entries matching core schema invariants
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

  afterEach(async () => {
    if (createdUserIds.length > 0) {
      // Flush database entries sequentially to safely avoid foreign key errors
      await db.delete(talents).where(inArray(talents.userId, createdUserIds));
      await db.delete(users).where(inArray(users.id, createdUserIds));
      createdUserIds = [];
    }
    vi.restoreAllMocks();
  });

  describe("registerNewTalent", () => {
    it("should successfully upgrade a base user to a talent storefront profile (Happy Path)", async () => {
      const payload = {
        userId: mockUser.id,
        bio: "Senior full stack designer specializing in hyper-scalable UI systems.",
        skills: ["TypeScript", "Next.js", "TailwindCSS"],
      };

      const talentResult = await TalentsService.registerNewTalent(payload, db);

      expect(talentResult).toBeDefined();
      expect(talentResult.userId).toBe(mockUser.id);
      expect(talentResult.bio).toBe(payload.bio);
      expect(talentResult.skills).toEqual(payload.skills);
      expect(talentResult.isVerified).toBe(false);

      const updatedUser = await db.query.users.findFirst({
        where: eq(users.id, mockUser.id),
      });

      expect(updatedUser).toBeDefined();
      expect(updatedUser?.currentContext).toBe(USER_CONTEXT.TALENT);
    });

    it("should attempt to clear the active session cache when a user upgrades to talent", async () => {
      const payload = {
        userId: mockUser.id,
        bio: "Valid bio string",
        skills: ["Design"],
      };

      (cache as any).isOpen = true;
      const delSpy = vi.spyOn(cache, "del");

      await TalentsService.registerNewTalent(payload, db);

      expect(delSpy).toHaveBeenCalledWith(`session:active:${payload.userId}`);
      (cache as any).isOpen = false;
    });
  });

  describe("getTalentByUserId", () => {
    it("should successfully resolve a fully-hydrated talent and user row record combination", async () => {
      await TalentsService.registerNewTalent(
        {
          userId: mockUser.id,
          bio: "Expert systems programmer.",
          skills: ["Go", "Docker", "PostgreSQL"],
        },
        db,
      );

      const result = await TalentsService.getTalentByUserId(
        { userId: mockUser.id },
        db,
      );

      expect(result).toBeDefined();
      expect(result.talent.bio).toBe("Expert systems programmer.");
      expect(result.user.username).toBe(mockUser.username);
    });
  });

  it("should throw a ConflictError if the user is already registered as a talent storefront", async () => {
    const payload = {
      userId: mockUser.id,
      bio: "First attempt profile initialization parameters.",
      skills: ["Copywriting"],
    };

    // Elevate the user the first time
    await TalentsService.registerNewTalent(payload, db);

    // Second attempt must violate uniqueness barriers and reject the instruction
    await expect(TalentsService.registerNewTalent(payload, db)).rejects.toThrow(
      "This user identity is already configured as a seller profile.",
    );
  });

  it("should throw a NotFoundError if the user id is present in identity but lacks a seller row configuration", async () => {
    // Execute retrieval against mockUser directly without running elevation transformations
    await expect(
      TalentsService.getTalentByUserId({ userId: mockUser.id }, db),
    ).rejects.toThrow(
      "Requested marketplace talent storefront profile does not exist.",
    );
  });
});
