import { vi, describe, it, expect, afterEach } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { cache } from "@/shared/cache/redis";
import { db } from "@/shared/database/client";
import { CATALOG_CACHE } from "../../catalog.constants";
import { categories } from "../../catalog.schema";
import { CategoriesService } from "../categories.service";

describe("CategoriesService Integration Tests", () => {
  let seededCategoryIds: string[] = [];

  // Automated cleanup sequence after each assertion run
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
    // Inject hierarchical test tracking entries directly into Postgres
    const [parent] = await db
      .insert(categories)
      .values({
        name: `Design & Media ${crypto.randomUUID().substring(0, 4)}`,
        slug: `design-media-${crypto.randomUUID().substring(0, 4)}`,
        parentId: null,
        isActive: true,
      })
      .returning();

    seededCategoryIds.push(parent.id);

    // Enable the mock redis network state switch inline
    (cache as any).isOpen = true;
    const setSpy = vi.spyOn(cache, "set");

    const data = await CategoriesService.getAllCategories(db);

    expect(data.length).toBeGreaterThanOrEqual(1);
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

    // Force Redis mock to return pre-built structural strings
    vi.spyOn(cache, "get").mockResolvedValue(JSON.stringify(mockPayload));

    // Provide an empty/broken db reference object. If the logic touches the database, it crashes.
    const result = await CategoriesService.getAllCategories({} as any);

    expect(result).toEqual(mockPayload);
    (cache as any).isOpen = false;
  });
});
