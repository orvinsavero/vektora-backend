import { describe, it, expect, afterEach } from "vitest";
import { db } from "@/shared/database/client";
import { UserService } from "../user.service";
import { users } from "../../identity.schema";
import { inArray } from "drizzle-orm";

describe("UserService Integration Tests", () => {
  let createdUserEmails: string[] = [];

  afterEach(async () => {
    if (createdUserEmails.length > 0) {
      await db.delete(users).where(inArray(users.email, createdUserEmails));
      createdUserEmails = [];
    }
  });

  describe("registerUser", () => {
    it("should register new user", async () => {
      const payload = {
        email: "test@v.io",
        username: "test",
        password: "123",
        firstName: "F",
        lastName: "L",
        birthDate: "1990-01-01",
      };
      createdUserEmails.push(payload.email);
      const user = await UserService.registerUser(payload, db);
      expect(user.email).toBe(payload.email);
    });
  });
});
