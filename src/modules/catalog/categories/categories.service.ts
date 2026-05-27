import { eq } from "drizzle-orm";
import { db as defaultDb } from "@/shared/database/client";
import { cache } from "@/shared/cache/redis";
import { CATALOG_CACHE } from "../catalog.constants";
import { categories } from "../catalog.schema";

type DatabaseClient = typeof defaultDb;

/**
 * Categories Service Taxonomy Engine.
 * Manages marketplace catalog classification lookups and navigation tree data.
 */
export class CategoriesService {
  /**
   * Resolves a flat listing of all active categories.
   * Utilizes a cache-aside proxy structure using Redis to shield PostgreSQL from high-frequency queries.
   *
   * @param {DatabaseClient} [db=defaultDb] - Active query transaction context or client instance.
   * @returns {Promise<Array<typeof categories.$inferSelect>>} Parsed array of category records.
   */
  static async getAllCategories(db: DatabaseClient = defaultDb) {
    const cacheKey = CATALOG_CACHE.keys.categoriesAll;

    // 1. Memory Pool Lookup Fast-Pathway
    if (cache.isOpen) {
      try {
        const cachedRawData = await cache.get(cacheKey);
        if (cachedRawData) {
          return JSON.parse(cachedRawData);
        }
      } catch (cacheError) {
        // Soft fail-open to preserve API uptime if Redis instances drop packets
      }
    }

    // 2. Persistent Storage Query Pass (Cache Miss)
    const liveCategories = await db
      .select()
      .from(categories)
      .where(eq(categories.isActive, true))
      .orderBy(categories.name);

    // 3. Asynchronous Lazy Cache Ingestion
    if (cache.isOpen && liveCategories.length > 0) {
      cache
        .set(cacheKey, JSON.stringify(liveCategories), {
          EX: CATALOG_CACHE.ttl,
        })
        .catch(() => {
          // Suppress background async write pipeline failures
        });
    }

    return liveCategories;
  }
}
