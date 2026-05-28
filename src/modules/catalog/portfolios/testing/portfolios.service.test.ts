import { vi, describe, it, expect, afterEach } from "vitest";
import { db } from "@/shared/database/client";
import { PortfoliosService } from "../portfolios.service";
import { portfolios, talents } from "../../catalog.schema";
import { users } from "@/modules/identity/identity.schema";
import { eq, inArray } from "drizzle-orm";
import { NotFoundError } from "@/shared/errors/app-error";

describe("PortfoliosService Integration Tests", () => {
  let createdUserIds: string[] = [];
  let createdTalentIds: string[] = [];
  let createdPortfolioIds: string[] = [];

  // Helper factory to provision a strictly legal, relational parent tree context
  const seedValidTalentContext = async (): Promise<string> => {
    const uniqueSuffix = crypto.randomUUID().substring(0, 8);
    const userId = crypto.randomUUID();
    const talentId = crypto.randomUUID();

    // 1. Provision foundational user identity boundary record row
    await db.insert(users).values({
      id: userId,
      email: `test_portfolio_owner_${uniqueSuffix}@vektora.io`,
      username: `owner_${uniqueSuffix}`,
      passwordHash: "dummy-hash-string-value",
      firstName: "Portfolio",
      lastName: "Tester",
      birthDate: "1995-01-01",
    });
    createdUserIds.push(userId);

    // 2. Link a legal talent record matching your EXACT schema
    await db.insert(talents).values({
      id: talentId,
      userId: userId,
      bio: "Automating validation engines.",
      skills: ["architecture", "typescript"],
    });
    createdTalentIds.push(talentId);

    // FIXED: Return userId because portfolios.talentId foreign key references talents.userId
    return userId;
  };

  const trackPortfolioId = (id: string): string => {
    createdPortfolioIds.push(id);
    return id;
  };

  // CLEAN UP RELATIONAL TREES IN PRECISE REVERSE ORDER OF DEPENDENCY
  afterEach(async () => {
    if (createdPortfolioIds.length > 0) {
      await db
        .delete(portfolios)
        .where(inArray(portfolios.id, createdPortfolioIds));
      createdPortfolioIds = [];
    }
    if (createdTalentIds.length > 0) {
      await db.delete(talents).where(inArray(talents.id, createdTalentIds));
      createdTalentIds = [];
    }
    if (createdUserIds.length > 0) {
      await db.delete(users).where(inArray(users.id, createdUserIds));
      createdUserIds = [];
    }
  });

  describe("createPortfolio", () => {
    it("should successfully insert a portfolio project card via the service layer", async () => {
      const mappedUserId = await seedValidTalentContext();
      const payload = {
        talentId: mappedUserId,
        title: "Distributed Streaming Infrastructure",
        description: "High-throughput messaging fabric using event logs.",
        externalLink: "https://github.com/vektora/event-stream",
        categoryIds: [],
        attachments: [
          {
            mediaUrl: "https://storage.vektora.io/docs/architecture_v2.pdf",
            mediaType: "DOCUMENT" as const,
          },
        ],
      };

      const result = await PortfoliosService.createPortfolio(payload);
      trackPortfolioId(result.id);

      expect(result.id).toBeDefined();
      expect(result.title).toBe(payload.title);
      expect(result.talentId).toBe(mappedUserId);

      const dbRow = await db.query.portfolios.findFirst({
        where: eq(portfolios.id, result.id),
      });
      expect(dbRow).toBeDefined();
      expect(dbRow!.title).toBe(payload.title);
    });
  });

  describe("getPortfolioById", () => {
    it("should resolve a fully hydrated portfolio record by its primary key", async () => {
      const mappedUserId = await seedValidTalentContext();
      const portfolioId = crypto.randomUUID();

      await db.insert(portfolios).values({
        id: portfolioId,
        talentId: mappedUserId,
        title: "Transient Storage Engine",
        description: "In-memory LSM tree architecture.",
        externalLink: "https://storage.vektora.io/spec.md",
      });
      trackPortfolioId(portfolioId);

      const resolved = await PortfoliosService.getPortfolioById(portfolioId);

      expect(resolved).toBeDefined();
      expect(resolved.id).toBe(portfolioId);
      expect(resolved.title).toBe("Transient Storage Engine");
    });

    it("should throw a NotFoundError instance when target ID is missing", async () => {
      const ghostId = crypto.randomUUID();
      await expect(PortfoliosService.getPortfolioById(ghostId)).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe("getPortfoliosByTalentId", () => {
    it("should extract all portfolios assigned down to a specific parent talent handle", async () => {
      const targetUserId = await seedValidTalentContext();
      const unrelatedUserId = await seedValidTalentContext();

      const p1 = crypto.randomUUID();
      const p2 = crypto.randomUUID();

      await db.insert(portfolios).values({
        id: p1,
        talentId: targetUserId,
        title: "Target Project Alpha",
        description: null,
        externalLink: null,
      });
      trackPortfolioId(p1);

      await db.insert(portfolios).values({
        id: p2,
        talentId: unrelatedUserId,
        title: "Isolation Noise Project",
        description: null,
        externalLink: null,
      });
      trackPortfolioId(p2);

      const items =
        await PortfoliosService.getPortfoliosByTalentId(targetUserId);

      expect(items).toBeDefined();
      expect(items.length).toBe(1);
      expect(items[0].id).toBe(p1);
    });
  });

  describe("updatePortfolio", () => {
    it("should apply partial updates wrapped correctly in a layout input object", async () => {
      const mappedUserId = await seedValidTalentContext();
      const portfolioId = crypto.randomUUID();

      await db.insert(portfolios).values({
        id: portfolioId,
        talentId: mappedUserId,
        title: "Immutable Document Store",
        description: "Untouched metadata fields.",
        externalLink: null,
      });
      trackPortfolioId(portfolioId);

      const updatePayload = {
        portfolioId: portfolioId,
        talentId: mappedUserId,
        title: "Mutated Document Store V2",
        attachments: [
          {
            mediaUrl: "https://storage.io/notes.png",
            mediaType: "IMAGE" as const,
          },
        ],
      };

      const updated = await PortfoliosService.updatePortfolio(updatePayload);

      expect(updated.title).toBe(updatePayload.title);
      expect(updated.description).toBe("Untouched metadata fields.");
    });
  });

  describe("deletePortfolio", () => {
    it("should cleanly purge targeted portfolio records from storage using dual matching keys", async () => {
      const mappedUserId = await seedValidTalentContext();
      const portfolioId = crypto.randomUUID();

      await db.insert(portfolios).values({
        id: portfolioId,
        talentId: mappedUserId,
        title: "Temporary Volatile Workspace Card",
        description: null,
        externalLink: null,
      });

      await PortfoliosService.deletePortfolio(portfolioId, mappedUserId);

      const searchCheck = await db.query.portfolios.findFirst({
        where: eq(portfolios.id, portfolioId),
      });
      expect(searchCheck).toBeUndefined();
    });
  });
});
