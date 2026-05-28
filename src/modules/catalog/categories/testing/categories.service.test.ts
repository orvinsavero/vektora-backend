import { vi, describe, it, expect, afterEach } from "vitest";
import { db } from "@/shared/database/client";
import { CategoriesService } from "../categories.service";
import { categories } from "../../catalog.schema";
import { inArray } from "drizzle-orm";

describe("CategoriesService Integration Tests", () => {
  let createdCategoryIds: string[] = [];

  // Central tracking factory to guarantee explicit data cleanup boundaries
  const trackId = (id: string): string => {
    createdCategoryIds.push(id);
    return id;
  };

  afterEach(async () => {
    if (createdCategoryIds.length > 0) {
      await db
        .delete(categories)
        .where(inArray(categories.id, createdCategoryIds));
      createdCategoryIds = [];
    }
  });

  describe("getAllCategories", () => {
    it("should retrieve a complete list of active categories, including nested parent-child relationships", async () => {
      const uniqueSuffix = crypto.randomUUID().substring(0, 8);
      const parentId = crypto.randomUUID();
      const childId = crypto.randomUUID();

      // 1. Seed Parent Category (Using ONLY the columns defined in your schema)
      await db.insert(categories).values({
        id: parentId,
        name: `Parent Classification ${uniqueSuffix}`,
        slug: `parent-classification-${uniqueSuffix}`,
        isActive: true,
      });
      trackId(parentId);

      // 2. Seed Child Category with a self-referencing foreign key mapped to the parent
      await db.insert(categories).values({
        id: childId,
        parentId: parentId,
        name: `Sub Classification ${uniqueSuffix}`,
        slug: `sub-classification-${uniqueSuffix}`,
        isActive: true,
      });
      trackId(childId);

      // Execute Service - using the correct method name
      const results = await CategoriesService.getAllCategories(db);

      // Assertions
      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThanOrEqual(2);

      const foundParent = results.find((c: any) => c.id === parentId);
      const foundChild = results.find((c: any) => c.id === childId);

      expect(foundParent).toBeDefined();
      expect(foundParent!.name).toBe(`Parent Classification ${uniqueSuffix}`);

      expect(foundChild).toBeDefined();
      expect(foundChild!.parentId).toBe(parentId); // Validates self-referential graph integrity
    });

    it("should not return inactive categories in the payload", async () => {
      const uniqueSuffix = crypto.randomUUID().substring(0, 8);
      const inactiveCategoryId = crypto.randomUUID();

      await db.insert(categories).values({
        id: inactiveCategoryId,
        name: `Inactive Category ${uniqueSuffix}`,
        slug: `inactive-category-${uniqueSuffix}`,
        isActive: false, // This should cause the service to filter it out
      });
      trackId(inactiveCategoryId);

      const results = await CategoriesService.getAllCategories(db);

      const foundInactive = results.find(
        (c: any) => c.id === inactiveCategoryId,
      );
      expect(foundInactive).toBeUndefined(); // Should be completely filtered out
    });
  });
});
