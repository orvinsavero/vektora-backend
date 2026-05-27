// src/modules/catalog/portfolios-module/testing/portfolios.service.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/shared/database/client";
import { USER_CONTEXT } from "../../../identity/identity.constants";
import { users } from "../../../identity/identity.schema";
import {
  talents,
  portfolios,
  portfolioAttachments,
} from "../../catalog.schema";
import { PortfoliosService } from "../portfolios.service";

describe("PortfoliosService Integration Tests", () => {
  let activeTalentUser: typeof users.$inferSelect;
  let createdUserIds: string[] = [];

  beforeEach(async () => {
    const [insertedUser] = await db
      .insert(users)
      .values({
        email: `portfolio-creator-${crypto.randomUUID()}@marketplace.com`,
        username: `creator_${crypto.randomUUID().substring(0, 8)}`,
        passwordHash: "argon2id_mock_hash_string",
        birthDate: "1990-01-01",
        currentContext: USER_CONTEXT.TALENT,
        isActive: true,
      })
      .returning();

    await db.insert(talents).values({
      userId: insertedUser.id,
      bio: "Authorized creative designer profile context.",
      skills: ["Photoshop", "Midjourney"],
    });

    activeTalentUser = insertedUser;
    createdUserIds.push(activeTalentUser.id);
  });

  afterEach(async () => {
    if (createdUserIds.length > 0) {
      await db
        .delete(portfolioAttachments)
        .where(
          inArray(
            portfolioAttachments.portfolioId,
            db
              .select({ id: portfolios.id })
              .from(portfolios)
              .where(inArray(portfolios.talentId, createdUserIds)),
          ),
        );
      await db
        .delete(portfolios)
        .where(inArray(portfolios.talentId, createdUserIds));
      await db.delete(talents).where(inArray(talents.userId, createdUserIds));
      await db.delete(users).where(inArray(users.id, createdUserIds));
      createdUserIds = [];
    }
  });

  it("should process atomic transactions, stitch nested attachments collections arrays, and stamp zero-indexed sortOrder weights", async () => {
    const inputPayload = {
      talentId: activeTalentUser.id,
      title: "Immersive 3D Sci-Fi Environment Showcase",
      description: "High-fidelity production environments.",
      externalLink: null, // This was already present, perfect
      attachments: [
        {
          mediaUrl: "https://storage.vektora.io/portfolios/scifi-wide.png",
          mediaType: "IMAGE" as const,
        },
        {
          mediaUrl: "https://storage.vektora.io/portfolios/scifi-detail.png",
          mediaType: "IMAGE" as const,
        },
      ],
    };

    const result = await PortfoliosService.createPortfolio(inputPayload, db);

    expect(result.title).toBe(inputPayload.title);
    expect(result.attachments).toHaveLength(2);
    expect(result.attachments[0].sortOrder).toBe(0);
    expect(result.attachments[1].sortOrder).toBe(1);
  });

  it("should successfully wipe out parent portfolios rows and cascade purge child attachments elements simultaneously", async () => {
    const freshPortfolio = await PortfoliosService.createPortfolio(
      {
        talentId: activeTalentUser.id,
        title: "Short-Lived Temporary Masterpiece",
        description: null,
        externalLink: null,
        attachments: [
          {
            mediaUrl: "https://storage.vektora.io/assets/doomed.png",
            mediaType: "IMAGE" as const,
          }, // Fixed missing 'as const' casting alignment too
        ],
      },
      db,
    );

    await PortfoliosService.deletePortfolio(
      freshPortfolio.id,
      activeTalentUser.id,
      db,
    );

    const verifiedPortfolioRecord = await db.query.portfolios.findFirst({
      where: eq(portfolios.id, freshPortfolio.id),
    });
    expect(verifiedPortfolioRecord).toBeUndefined();
  });

  // Add these inside describe("PortfoliosService Integration Tests")
  it("should throw a ConflictError when trying to exceed the maximum 5 portfolio showcase entries limit", async () => {
    const basePayload = {
      talentId: activeTalentUser.id,
      title: "Test Project Entry",
      description: "Mock description path context string.",
      externalLink: null,
      attachments: [],
    };

    // Seed the database up to the max capacity limit constraint (5 items)
    for (let i = 0; i < 5; i++) {
      await PortfoliosService.createPortfolio(
        { ...basePayload, title: `Project Title ${i}` },
        db,
      );
    }

    // The 6th entry execution block must violate safety constraints and throw a ConflictError
    await expect(
      PortfoliosService.createPortfolio(
        { ...basePayload, title: "The Breaking 6th Entry" },
        db,
      ),
    ).rejects.toThrow(
      "Portfolio limit reached. Maximum allowed is 5 showcase entries per talent profile.",
    );
  });

  it("should reject update actions with a NotFoundError if an account tries to alter an un-owned portfolio item", async () => {
    const freshPortfolio = await PortfoliosService.createPortfolio(
      {
        talentId: activeTalentUser.id,
        title: "Original Project Title",
        attachments: [],
        description: null,
        externalLink: null,
      },
      db,
    );

    const hostileHijackPayload = {
      portfolioId: freshPortfolio.id,
      talentId: crypto.randomUUID(), // Hostile non-owner identifier token context
      title: "Malicious Injection Title Attack Attempt",
    };

    await expect(
      PortfoliosService.updatePortfolio(hostileHijackPayload, db),
    ).rejects.toThrow(
      "Target portfolio item profile does not exist or access is denied.",
    );
  });

  it("should throw an explicit NotFoundError if requested item primary key tracking UUID does not exist inside storage disk", async () => {
    const phantomId = crypto.randomUUID();
    await expect(
      PortfoliosService.getPortfolioById(phantomId, db),
    ).rejects.toThrow(
      "Requested portfolio project showcase item does not exist.",
    );
  });
});
