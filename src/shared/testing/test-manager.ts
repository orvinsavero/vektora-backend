import { db } from "@/shared/database/client";
import { users } from "@/modules/identity/identity.schema";
import { inArray } from "drizzle-orm";

export const TestManager = {
  createdIds: new Set<string>(),

  track(id: string) {
    this.createdIds.add(id);
  },

  async cleanup() {
    if (this.createdIds.size > 0) {
      await db
        .delete(users)
        .where(inArray(users.id, Array.from(this.createdIds)));
      this.createdIds.clear();
    }
  },
};
