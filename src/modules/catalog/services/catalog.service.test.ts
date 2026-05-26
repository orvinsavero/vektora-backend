// src/modules/catalog/services/catalog.service.test.ts
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { cache } from "@/shared/cache/redis";
import { db } from "@/shared/database/client";
import { USER_CONTEXT } from "../../identity/identity.constants";
import { CATALOG_CACHE } from "../catalog.constants";
import { CatalogService } from "./catalog.service";
import { users } from "../../identity/identity.schema";
import { talents, categories } from "../catalog.schema";

describe("CatalogService Integration Tests", () => {
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

  describe("registerNewTalent", () => {
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

      await expect(
        CatalogService.registerNewTalent(payload, db),
      ).rejects.toThrow("Target user account identity not found.");
    });

    it("should throw a ConflictError if the user is already registered as a talent storefront", async () => {
      const payload = {
        userId: mockUser.id,
        bio: "First attempt profile initialization parameters.",
        skills: ["Copywriting"],
      };

      await CatalogService.registerNewTalent(payload, db);

      // Second attempt must violate uniqueness barriers and reject the instruction
      await expect(
        CatalogService.registerNewTalent(payload, db),
      ).rejects.toThrow(
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

  describe("getTalentByUserId", () => {
    it("should successfully resolve a fully-hydrated talent and user row record object combination (Happy Path)", async () => {
      // 1. Seed base seller record details
      await CatalogService.registerNewTalent(
        {
          userId: mockUser.id,
          bio: "Expert systems programmer.",
          skills: ["Go", "Docker", "PostgreSQL"],
        },
        db,
      );

      // 2. Fire structural selection engine operations
      const result = await CatalogService.getTalentByUserId(
        { userId: mockUser.id },
        db,
      );

      // 3. Assertions checking combined relation mapping integrity
      expect(result).toBeDefined();
      expect(result.talent).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.talent.userId).toBe(mockUser.id);
      expect(result.talent.bio).toBe("Expert systems programmer.");
      expect(result.user.username).toBe(mockUser.username);
      expect(result.user.email).toBe(mockUser.email);
    });

    it("should throw a NotFoundError if the user id is present in identity but lacks a seller row configuration", async () => {
      // Execute retrieval against mockUser directly without running previous elevation transformations
      await expect(
        CatalogService.getTalentByUserId({ userId: mockUser.id }, db),
      ).rejects.toThrow(
        "Requested marketplace talent storefront profile does not exist.",
      );
    });

    it("should throw a NotFoundError if the requested tracking UUID identifier does not exist in database storage entirely", async () => {
      const deadId = crypto.randomUUID();

      await expect(
        CatalogService.getTalentByUserId({ userId: deadId }, db),
      ).rejects.toThrow(
        "Requested marketplace talent storefront profile does not exist.",
      );
    });
  });

  describe("updateTalentProfile", () => {
    beforeEach(async () => {
      // Automatically elevate our mock user to talent context prior to mutation checks
      await CatalogService.registerNewTalent(
        {
          userId: mockUser.id,
          bio: "Original bio parameters.",
          skills: ["LegacySkill"],
        },
        db,
      );
    });

    it("should successfully execute partial updates for bio and skills while preserving untouched properties", async () => {
      const updates = {
        bio: "Brand new modified system designer biography.",
        skills: ["TypeScript", "Vitest", "Drizzle"],
      };

      const updatedRow = await CatalogService.updateTalentProfile(
        mockUser.id,
        updates,
        db,
      );

      expect(updatedRow).toBeDefined();
      expect(updatedRow.userId).toBe(mockUser.id);
      expect(updatedRow.bio).toBe(updates.bio);
      expect(updatedRow.skills).toEqual(updates.skills);
      expect(updatedRow.isVerified).toBe(false); // Remained untouched
    });

    it("should gracefully return the unmutated record row intact if the payload fields package is completely empty", async () => {
      const emptyPayload = {};

      const untouchedRow = await CatalogService.updateTalentProfile(
        mockUser.id,
        emptyPayload,
        db,
      );

      expect(untouchedRow).toBeDefined();
      expect(untouchedRow.userId).toBe(mockUser.id);
      expect(untouchedRow.bio).toBe("Original bio parameters.");
      expect(untouchedRow.skills).toEqual(["LegacySkill"]);
    });

    it("should throw a NotFoundError instance if the provided target user tracking UUID does not exist inside the talents table", async () => {
      const missingId = crypto.randomUUID();

      await expect(
        CatalogService.updateTalentProfile(missingId, { bio: "New text." }, db),
      ).rejects.toThrow("Target marketplace talent profile does not exist.");
    });
  });

  describe("CatalogService Category Retrieval Integration Tests", () => {
    let seededCategoryIds: string[] = [];

    beforeEach(async () => {
      // Inject two hierarchical items matching database layout rules
      const [parent] = await db
        .insert(categories)
        .values({
          name: `Design & Media ${crypto.randomUUID().substring(0, 4)}`,
          slug: `design-media-${crypto.randomUUID().substring(0, 4)}`,
          parentId: null,
          isActive: true,
        })
        .returning();

      const [subClass] = await db
        .insert(categories)
        .values({
          name: `3D Generation ${crypto.randomUUID().substring(0, 4)}`,
          slug: `3d-generation-${crypto.randomUUID().substring(0, 4)}`,
          parentId: parent.id,
          isActive: true,
        })
        .returning();

      seededCategoryIds.push(parent.id, subClass.id);
    });

    afterEach(async () => {
      if (seededCategoryIds.length > 0) {
        await db
          .delete(categories)
          .where(inArray(categories.id, seededCategoryIds));
        seededCategoryIds = [];
      }
      vi.restoreAllMocks();
    });

    it("should look up active flat records straight from DB on cache miss and write to cache", async () => {
      (cache as any).isOpen = true;
      const setSpy = vi.spyOn(cache, "set");

      const data = await CatalogService.getAllCategories(db);

      expect(data.length).toBeGreaterThanOrEqual(2);
      expect(setSpy).toHaveBeenCalledWith(
        CATALOG_CACHE.keys.categoriesAll,
        expect.any(String),
        { EX: CATALOG_CACHE.ttl },
      );
      (cache as any).isOpen = false;
    });

    it("should completely step around DB lookup if a valid cached string exists inside Redis memory", async () => {
      (cache as any).isOpen = true;
      const mockPayload = [
        {
          id: "fake-id",
          name: "Mock Cat",
          slug: "mock-cat",
          parentId: null,
          isActive: true,
        },
      ];

      vi.spyOn(cache, "get").mockResolvedValue(JSON.stringify(mockPayload));

      // Supply a broken db client reference. If the system hits DB, compilation crashes.
      const result = await CatalogService.getAllCategories({} as any);

      expect(result).toEqual(mockPayload);
      (cache as any).isOpen = false;
    });
  });

  describe("createPortfolio", () => {
    let activeTalentUser: typeof users.$inferSelect;

    beforeEach(async () => {
      // 1. Create a fresh, clean base user account
      const [insertedUser] = await db
        .insert(users)
        .values({
          email: `portfolio-creator-${crypto.randomUUID()}@marketplace.com`,
          username: `creator_${crypto.randomUUID().substring(0, 8)}`,
          passwordHash: "argon2id_mock_hash_string",
          firstName: "Creative",
          lastName: "Individual",
          birthDate: "1990-01-01",
          currentContext: USER_CONTEXT.USER,
          isActive: true,
        })
        .returning();

      // 2. Elevate that account into an active marketplace seller storefront
      await db.insert(talents).values({
        userId: insertedUser.id,
        bio: "Authorized creative designer profile context.",
        skills: ["Photoshop", "Midjourney"],
        isVerified: false,
      });

      activeTalentUser = insertedUser;
      createdUserIds.push(activeTalentUser.id); // Triggers automated teardown cleanup on complete
    });

    it("should successfully build a text-only portfolio project container block when attachments are omitted", async () => {
      const inputPayload = {
        talentId: activeTalentUser.id,
        title: "Minimalist Vector Branding Package",
        description:
          "Pure typography layout guidelines for a corporate client identity module.",
        externalLink: "https://behance.net/branding-minimal",
        attachments: [],
      };

      const result = await CatalogService.createPortfolio(inputPayload, db);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.talentId).toBe(activeTalentUser.id);
      expect(result.title).toBe(inputPayload.title);
      expect(result.description).toBe(inputPayload.description);
      expect(result.externalLink).toBe(inputPayload.externalLink);
      expect(result.attachments).toEqual([]);
    });

    it("should process atomic transactions, stitch nested attachments collections arrays, and stamp zero-indexed sortOrder weights", async () => {
      const inputPayload = {
        talentId: activeTalentUser.id,
        title: "Immersive 3D Sci-Fi Environment Showcase",
        description:
          "High-fidelity production environments mapped inside a sandbox container engine loop.",
        externalLink: null,
        attachments: [
          {
            mediaUrl: "https://storage.vektora.io/portfolios/scifi-wide.png",
            mediaType: "IMAGE" as const,
          },
          {
            mediaUrl: "https://storage.vektora.io/portfolios/scifi-detail.png",
            mediaType: "IMAGE" as const,
          },
          {
            mediaUrl:
              "https://storage.vektora.io/portfolios/scifi-flythrough.mp4",
            mediaType: "VIDEO" as const,
          },
        ],
      };

      const result = await CatalogService.createPortfolio(inputPayload, db);

      // Verify parent metadata layer
      expect(result.title).toBe(inputPayload.title);
      expect(result.description).toBe(inputPayload.description);
      expect(result.externalLink).toBeNull();

      // Verify relation mapping data collections layer bounds
      expect(result.attachments).toHaveLength(3);

      // Validate that sequential array items precisely absorb their computed sorting weights
      expect(result.attachments[0]).toMatchObject({
        mediaUrl: "https://storage.vektora.io/portfolios/scifi-wide.png",
        mediaType: "IMAGE",
        sortOrder: 0, // Zero-indexed first slot
      });

      expect(result.attachments[1]).toMatchObject({
        mediaUrl: "https://storage.vektora.io/portfolios/scifi-detail.png",
        mediaType: "IMAGE",
        sortOrder: 1, // Second slot
      });

      expect(result.attachments[2]).toMatchObject({
        mediaUrl: "https://storage.vektora.io/portfolios/scifi-flythrough.mp4",
        mediaType: "VIDEO",
        sortOrder: 2, // Third slot
      });
    });

    it("should throw a ConflictError when trying to exceed the maximum 5 portfolio showcase entries limit", async () => {
      const basePayload = {
        talentId: activeTalentUser.id,
        title: "Test Project Entry",
        description: "Mock description path context string.",
        externalLink: null,
        attachments: [],
      };

      // Seed the database up to the max capacity (5 items)
      for (let i = 0; i < 5; i++) {
        await CatalogService.createPortfolio(
          { ...basePayload, title: `Project Title ${i}` },
          db,
        );
      }

      // The 6th entry execution block must violate safety constraints and throw a ConflictError
      await expect(
        CatalogService.createPortfolio(
          { ...basePayload, title: "The Breaking 6th Entry" },
          db,
        ),
      ).rejects.toThrow(
        "Portfolio limit reached. Maximum allowed is 5 showcase entries per talent profile.",
      );
    });
  });

  describe("updatePortfolio", () => {
    let creativeUser: typeof users.$inferSelect;
    let baselinePortfolio: any;

    beforeEach(async () => {
      // 1. Seed base credentials user account profile
      const [insertedUser] = await db
        .insert(users)
        .values({
          email: `portfolio-updater-${crypto.randomUUID()}@marketplace.com`,
          username: `updater_${crypto.randomUUID().substring(0, 8)}`,
          passwordHash: "argon2id_mock_hash_string",
          birthDate: "1992-02-02",
          currentContext: USER_CONTEXT.TALENT,
          isActive: true,
        })
        .returning();

      creativeUser = insertedUser;
      createdUserIds.push(creativeUser.id);

      // FIX: Manually seed the nested target storefront profile inside the parent table setup first
      await db.insert(talents).values({
        userId: creativeUser.id,
        bio: "Original talent bio context setup.",
        skills: ["TypeScript"],
        isVerified: false,
      });

      // 2. Initialize fresh showcase entry tracking bounds
      baselinePortfolio = await CatalogService.createPortfolio(
        {
          talentId: creativeUser.id,
          title: "Original Project Title",
          description: "Original Description Text Block Context.",
          externalLink: null,
          attachments: [
            {
              mediaUrl: "https://storage.vektora.io/assets/old-1.png",
              mediaType: "IMAGE",
            },
          ],
        },
        db,
      );
    });

    it("should successfully adjust text parameters while keeping historical attachments intact if omitted", async () => {
      const updatesPayload = {
        portfolioId: baselinePortfolio.id,
        talentId: creativeUser.id,
        title: "Altered Project Title Title Name",
      };

      const result = await CatalogService.updatePortfolio(updatesPayload, db);

      expect(result.title).toBe(updatesPayload.title);
      expect(result.description).toBe(baselinePortfolio.description); // Maintained unmutated column references
      expect(result.attachments).toHaveLength(1);
      expect(result.attachments[0].mediaUrl).toBe(
        "https://storage.vektora.io/assets/old-1.png",
      );
    });

    it("should completely purge old items records arrays and re-apply fresh arrays maps when attachments are modified", async () => {
      const updatesPayload = {
        portfolioId: baselinePortfolio.id,
        talentId: creativeUser.id,
        attachments: [
          {
            mediaUrl: "https://storage.vektora.io/assets/fresh-new-art-1.png",
            mediaType: "IMAGE" as const,
          },
          {
            mediaUrl: "https://storage.vektora.io/assets/fresh-new-art-2.png",
            mediaType: "IMAGE" as const,
          },
        ],
      };

      const result = await CatalogService.updatePortfolio(updatesPayload, db);

      expect(result.title).toBe(baselinePortfolio.title);
      expect(result.attachments).toHaveLength(2);
      expect(result.attachments[0]).toMatchObject({
        mediaUrl: "https://storage.vektora.io/assets/fresh-new-art-1.png",
        sortOrder: 0,
      });
      expect(result.attachments[1]).toMatchObject({
        mediaUrl: "https://storage.vektora.io/assets/fresh-new-art-2.png",
        sortOrder: 1,
      });
    });

    it("should reject operation actions with a NotFoundError if an account tries to alter an un-owned portfolio item", async () => {
      const hostileHijackPayload = {
        portfolioId: baselinePortfolio.id,
        talentId: crypto.randomUUID(), // Completely random fake tracking ID token pointer context
        title: "Malicious Injection Title Attack Attempt",
      };

      await expect(
        CatalogService.updatePortfolio(hostileHijackPayload, db),
      ).rejects.toThrow();
    });
  });
});
