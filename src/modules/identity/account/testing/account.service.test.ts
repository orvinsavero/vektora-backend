import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { db } from "@/shared/database/client";
import { AccountService } from "../account.service";
import { UserService } from "../../users/user.service";
import { users } from "../../identity.schema";
import { inArray } from "drizzle-orm";
import { NotFoundError } from "@/shared/errors/app-error";
import { Security } from "@/shared/crypto/security";

describe("AccountService Integration Tests", () => {
  let testUser: any;
  let createdUserEmails: string[] = [];

  beforeEach(async () => {
    const payload = {
      email: "acc@t.com",
      username: "acc",
      password: "123",
      firstName: "A",
      lastName: "B",
      birthDate: "1990-01-01",
    };
    createdUserEmails.push(payload.email);
    testUser = await UserService.registerUser(payload, db);
  });

  afterEach(async () => {
    if (createdUserEmails.length > 0) {
      await db.delete(users).where(inArray(users.email, createdUserEmails));
      createdUserEmails = [];
    }
  });

  describe("getProfile", () => {
    it("should return profile", async () => {
      const profile = await AccountService.getProfile(testUser.id, db);
      expect(profile.id).toBe(testUser.id);
    });
  });

  describe("updateAccount", () => {
    it("should re-hash password on update", async () => {
      const newPwd = "NewSecurePassword999!";
      const updated = await AccountService.updateAccount(
        testUser.id,
        { password: newPwd },
        db,
      );

      const dbRow = await db.query.users.findFirst({
        where: (f, { eq }) => eq(f.id, testUser.id),
      });
      expect(await Security.verifyPassword(newPwd, dbRow!.passwordHash)).toBe(
        true,
      );
    });
  });
});
