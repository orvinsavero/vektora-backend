import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { db } from "@/shared/database/client";
import { IdentityService } from "./identity.service";
import { users } from "../identity.schema";
import { eq, inArray } from "drizzle-orm";
import { ConflictError, UnauthorizedError } from "@/shared/errors/app-error";
import { USER_CONTEXT } from "../identity.constants";
import { RegisterUserPayload } from "../request";
import { Security } from "@/shared/crypto/security";

describe("IdentityService Integration Tests", () => {
  let createdUserEmails: string[] = [];

  const createValidUserPayload = (
    overrides?: Partial<RegisterUserPayload>,
  ): RegisterUserPayload => {
    const id = crypto.randomUUID().substring(0, 8);
    const payload = {
      email: `mvp_player_${id}@vektora.io`,
      username: `mvp_player_${id}`,
      password: "SecureMvpPassword123!",
      firstName: "Jane",
      lastName: "Doe",
      birthDate: "1995-06-15",
      ...overrides,
    };
    createdUserEmails.push(payload.email);
    return payload;
  };

  // FORCE CLEANUP AFTER EACH TEST LANE RUNS
  afterEach(async () => {
    if (createdUserEmails.length > 0) {
      await db.delete(users).where(inArray(users.email, createdUserEmails));
      createdUserEmails = [];
    }
  });

  describe("registerNewUser", () => {
    it("should successfully register a new user profile, encrypt credentials, and attach schema asset placeholders", async () => {
      const payload = createValidUserPayload();
      const user = await IdentityService.registerNewUser(payload, db);

      expect(user).toBeDefined();
      expect(user.id).toBeDefined();
      expect(user.email).toBe(payload.email);
      expect(user.username).toBe(payload.username);
      expect(user.firstName).toBe(payload.firstName);
      expect(user.lastName).toBe(payload.lastName);
      expect(user.birthDate).toBe(payload.birthDate);
      expect(user.currentContext).toBe(USER_CONTEXT.USER);
      expect(user.isVerified).toBe(false);
      expect(user.isActive).toBe(true);
      expect(user.avatarUrl).toBe(
        "https://storage.vektora.io/avatars/default-placeholder.png",
      );

      const dbRow = await db.query.users.findFirst({
        where: eq(users.id, user.id),
      });

      expect(dbRow).toBeDefined();
      const isValidPassword = await Security.verifyPassword(
        payload.password,
        dbRow!.passwordHash,
      );
      expect(isValidPassword).toBe(true);
    });

    it("should throw an operational ConflictError instance if the email address is already registered", async () => {
      const commonEmail = `conflict_${crypto.randomUUID().substring(0, 8)}@vektora.io`;
      const firstUser = createValidUserPayload({
        email: commonEmail,
        username: "user_a",
      });
      const secondUser = createValidUserPayload({
        email: commonEmail,
        username: "user_b",
      });

      await IdentityService.registerNewUser(firstUser, db);

      await expect(
        IdentityService.registerNewUser(secondUser, db),
      ).rejects.toThrow(ConflictError);
    });

    it("should throw an operational ConflictError instance if the username is already taken", async () => {
      const commonUsername = `clonewarrior_${crypto.randomUUID().substring(0, 8)}`;
      const firstUser = createValidUserPayload({
        email: "user_a@vektora.io",
        username: commonUsername,
      });
      const secondUser = createValidUserPayload({
        email: "user_b@vektora.io",
        username: commonUsername,
      });

      await IdentityService.registerNewUser(firstUser, db);

      await expect(
        IdentityService.registerNewUser(secondUser, db),
      ).rejects.toThrow(ConflictError);
    });
  });

  describe("authenticateUser", () => {
    it("should successfully log in a user using their email address with correct credentials", async () => {
      const registerPayload = createValidUserPayload();
      await IdentityService.registerNewUser(registerPayload, db);

      const user = await IdentityService.authenticateUser(
        {
          usernameOrEmail: registerPayload.email,
          password: registerPayload.password,
        },
        db,
      );

      expect(user).toBeDefined();
      expect(user.email).toBe(registerPayload.email);
    });

    it("should successfully log in a user using their username with correct credentials", async () => {
      const registerPayload = createValidUserPayload();
      await IdentityService.registerNewUser(registerPayload, db);

      const user = await IdentityService.authenticateUser(
        {
          usernameOrEmail: registerPayload.username,
          password: registerPayload.password,
        },
        db,
      );

      expect(user).toBeDefined();
      expect(user.username).toBe(registerPayload.username);
    });

    it("should throw an UnauthorizedError if the provided username or email does not exist", async () => {
      await expect(
        IdentityService.authenticateUser(
          {
            usernameOrEmail: "ghost_user_non_existent",
            password: "SomePassword123!",
          },
          db,
        ),
      ).rejects.toThrow(UnauthorizedError);
    });

    it("should throw an UnauthorizedError if the credentials contain an invalid password string", async () => {
      const registerPayload = createValidUserPayload();
      await IdentityService.registerNewUser(registerPayload, db);

      await expect(
        IdentityService.authenticateUser(
          {
            usernameOrEmail: registerPayload.username,
            password: "WrongPassword123!",
          },
          db,
        ),
      ).rejects.toThrow(UnauthorizedError);
    });
  });
});
