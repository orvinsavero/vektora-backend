// src/shared/database/seed.ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { CONFIG } from "@/config/env.config";
import { categories } from "@/modules/catalog/catalog.schema";
import { SEED_CATEGORIES } from "@/modules/catalog/config/categories.seed";
import { appSchema } from "@/shared/database/client";

const seedDatabase = async () => {
  console.log("🚀 SEED ENGINE: Initializing database connectivity pipeline...");

  // Open an isolated, short-lived diagnostic connection client
  const migrationClient = postgres(CONFIG.databaseUrl, { max: 1 });
  const db = drizzle(migrationClient, { schema: appSchema });

  try {
    // 1. Isolate Root Parent records first (items where parentId is completely null)
    const rootCategories = SEED_CATEGORIES.filter((c) => c.parentId === null);

    // 2. Isolate Child Sub-categories next (items that depend on a parent anchor node)
    const childCategories = SEED_CATEGORIES.filter((c) => c.parentId !== null);

    console.log(
      `📦 SEED ENGINE: Processing ${rootCategories.length} root system blocks...`,
    );
    for (const root of rootCategories) {
      await db
        .insert(categories)
        .values({
          id: root.id,
          name: root.name,
          slug: root.slug,
          parentId: null,
          isActive: true,
        })
        .onConflictDoNothing({ target: categories.id });
    }

    console.log(
      `📦 SEED ENGINE: Intercepting and binding ${childCategories.length} sub-category leaf rows...`,
    );
    for (const child of childCategories) {
      await db
        .insert(categories)
        .values({
          id: child.id,
          name: child.name,
          slug: child.slug,
          parentId: child.parentId,
          isActive: true,
        })
        .onConflictDoNothing({ target: categories.id });
    }

    console.log(
      "✨ SEED ENGINE: Category ingestion sequence completed cleanly.",
    );
  } catch (error) {
    console.error(
      "❌ SEED ENGINE FATAL CRASH: Process broken mid-execution trace loop.",
    );
    console.error(error);
    process.exit(1);
  } finally {
    // Gracefully terminate connection pools so terminal steps don't hang indefinitely
    await migrationClient.end();
    console.log(
      "🔌 SEED ENGINE: Connection loops drained successfully. Script exiting.",
    );
    process.exit(0);
  }
};

// Fire execution pipeline
seedDatabase();
