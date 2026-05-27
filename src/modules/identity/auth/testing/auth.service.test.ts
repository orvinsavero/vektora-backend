import { vi, describe, it, expect, afterEach } from "vitest";
import { db } from "@/shared/database/client";
import { AuthService } from "../auth.service";
import { UserService } from "../../users/user.service";
import { users } from "../../identity.schema";
import { inArray } from "drizzle-orm";
import { UnauthorizedError } from "@/shared/errors/app-error";

describe("AuthService Integration Tests", () => {
  let createdUserEmails: string[] = [];

  afterEach(async () => {
    if (createdUserEmails.length > 0) {
      await db.delete(users).where(inArray(users.email, createdUserEmails));
      createdUserEmails = [];
    }
  });

  describe("login", () => {
    it("should log in with email", async () => {
      const p = {
        email: "a@b.com",
        username: "abc",
        password: "123",
        firstName: "A",
        lastName: "B",
        birthDate: "1990-01-01",
      };
      createdUserEmails.push(p.email);
      await UserService.registerUser(p, db);

      const result = await AuthService.login(
        { usernameOrEmail: "a@b.com", password: "123" },
        db,
      );
      expect(result.user.email).toBe("a@b.com");
      expect(result).toHaveProperty("token");
    });

    it("should throw UnauthorizedError for bad password", async () => {
      await expect(
        AuthService.login({ usernameOrEmail: "ghost", password: "123" }, db),
      ).rejects.toThrow(UnauthorizedError);
    });
  });
});
