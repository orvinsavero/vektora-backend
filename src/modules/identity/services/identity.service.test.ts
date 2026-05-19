import { describe, it, expect } from "vitest";
import { db, dbStorage } from "@/shared/database/client";
import { IdentityService } from "./identity.service";
import { users } from "../identity.schema";
import { eq } from "drizzle-orm";
import {
  ConflictError,
  NotFoundError,
  UnauthorizedError,
} from "@/shared/errors/app-error"; // Ensure UnauthorizedError is imported
import { USER_CONTEXT } from "../identity.constants";
import { RegisterUserPayload, RegisterTalentPayload } from "../request";
import { Security } from "@/shared/crypto/security";

describe("IdentityService Integration Tests", () => {
  // =========================================================================
  // DATA FACTORIES
  // =========================================================================

  const createValidUserPayload = (
    overrides?: Partial<RegisterUserPayload>,
  ): RegisterUserPayload => ({
    email: "mvp_player@vektora.io",
    username: "mvp_player",
    password: "SecureMvpPassword123!",
    firstName: "Jane",
    lastName: "Doe",
    birthDate: "1995-06-15",
    ...overrides,
  });

  const createValidTalentPayload = (
    overrides?: Partial<RegisterTalentPayload>,
  ): RegisterTalentPayload => ({
    userId: "00000000-0000-0000-0000-000000000000",
    bio: "Building low-poly game assets.",
    skills: ["Blender", "Substance Painter"],
    ...overrides,
  });

  const runInSandbox = async (testFn: (tx: any) => Promise<void> | void) => {
    try {
      await db.transaction(async (tx) => {
        await dbStorage.run(tx, async () => {
          await testFn(tx);
        });
        tx.rollback();
      });
    } catch (error: any) {
      if (
        error?.message?.includes("Rollback") ||
        error?.name === "RollbackError" ||
        error?.message?.includes("rollback")
      ) {
        return;
      }
      throw error;
    }
  };

  // =========================================================================
  // TESTING DOMAINS
  // =========================================================================
  describe("registerNewUser", () => {
    it("should successfully register a new user profile, encrypt credentials, and attach schema asset placeholders", async () => {
      const payload = createValidUserPayload();

      await runInSandbox(async (tx) => {
        const user = await IdentityService.registerNewUser(payload, tx);

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

        const dbRow = await tx.query.users.findFirst({
          where: eq(users.id, user.id),
        });

        expect(dbRow).toBeDefined();
        expect(dbRow?.passwordHash).toBeDefined();
        expect(dbRow?.passwordHash).not.toBe(payload.password);

        const isValidPassword = await Security.verifyPassword(
          payload.password,
          dbRow!.passwordHash,
        );
        expect(isValidPassword).toBe(true);
      });
    });

    it("should throw an operational ConflictError instance if the email address is already registered", async () => {
      const firstUser = createValidUserPayload({
        email: "conflict@vektora.io",
        username: "user_a",
      });
      const secondUser = createValidUserPayload({
        email: "conflict@vektora.io",
        username: "user_b",
      });

      await runInSandbox(async (tx) => {
        await IdentityService.registerNewUser(firstUser, tx);
        const promise = IdentityService.registerNewUser(secondUser, tx);

        await expect(promise).rejects.toThrow(ConflictError);
        await expect(promise).rejects.toThrow(
          "This email address is already registered.",
        );
      });
    });

    it("should throw an operational ConflictError instance if the username is already taken", async () => {
      const firstUser = createValidUserPayload({
        email: "user_a@vektora.io",
        username: "clonewarrior",
      });
      const secondUser = createValidUserPayload({
        email: "user_b@vektora.io",
        username: "clonewarrior",
      });

      await runInSandbox(async (tx) => {
        await IdentityService.registerNewUser(firstUser, tx);
        const promise = IdentityService.registerNewUser(secondUser, tx);

        await expect(promise).rejects.toThrow(ConflictError);
        await expect(promise).rejects.toThrow(
          "This username is already taken.",
        );
      });
    });
  });

  describe("registerAsTalent", () => {
    it("should throw an operational NotFoundError instance if upgrading a non-existent user profile", async () => {
      const payload = createValidTalentPayload();

      await runInSandbox(async (tx) => {
        const promise = IdentityService.registerAsTalent(payload, tx);

        await expect(promise).rejects.toThrow(NotFoundError);
        await expect(promise).rejects.toThrow(
          "Target user profile does not exist.",
        );
      });
    });

    it("should atomically create a talent entry and upgrade the user context flag", async () => {
      await runInSandbox(async (tx) => {
        const user = await IdentityService.registerNewUser(
          createValidUserPayload({
            email: "creator@vektora.io",
            username: "asset_master",
          }),
          tx,
        );

        const talentPayload = createValidTalentPayload({ userId: user.id });
        const talent = await IdentityService.registerAsTalent(
          talentPayload,
          tx,
        );

        expect(talent).toBeDefined();
        expect(talent.userId).toBe(user.id);
        expect(talent.skills).toContain("Blender");

        const updatedUser = await tx.query.users.findFirst({
          where: eq(users.id, user.id),
        });
        expect(updatedUser?.currentContext).toBe(USER_CONTEXT.TALENT);
        expect(updatedUser?.updatedAt).toBeDefined();
      });
    });

    it("should throw an operational ConflictError instance if the target profile is already a talent", async () => {
      await runInSandbox(async (tx) => {
        const user = await IdentityService.registerNewUser(
          createValidUserPayload({
            email: "double@vektora.io",
            username: "double_talent",
          }),
          tx,
        );

        const payload = createValidTalentPayload({ userId: user.id });

        await IdentityService.registerAsTalent(payload, tx);
        const promise = IdentityService.registerAsTalent(payload, tx);

        await expect(promise).rejects.toThrow(ConflictError);
        await expect(promise).rejects.toThrow(
          "This user is already registered as a talent.",
        );
      });
    });

    it("should throw an operational ConflictError instance if attempting to upgrade a deactivated user profile", async () => {
      await runInSandbox(async (tx) => {
        const user = await IdentityService.registerNewUser(
          createValidUserPayload({
            email: "banned_user@vektora.io",
            username: "rule_breaker",
          }),
          tx,
        );

        await tx
          .update(users)
          .set({ isActive: false })
          .where(eq(users.id, user.id));

        const payload = createValidTalentPayload({ userId: user.id });
        const promise = IdentityService.registerAsTalent(payload, tx);

        await expect(promise).rejects.toThrow(ConflictError);
        await expect(promise).rejects.toThrow(
          "Action denied. This user account profile is currently deactivated.",
        );
      });
    });
  });

  describe("authenticateUser", () => {
    it("should successfully log in a user using their email address with correct credentials", async () => {
      const registerPayload = createValidUserPayload({
        email: "auth_email@vektora.io",
        username: "auth_test_1",
        password: "ValidPassword123!",
      });

      await runInSandbox(async (tx) => {
        await IdentityService.registerNewUser(registerPayload, tx);

        const user = await IdentityService.authenticateUser(
          {
            usernameOrEmail: "auth_email@vektora.io",
            password: "ValidPassword123!",
          },
          tx,
        );

        expect(user).toBeDefined();
        expect(user.email).toBe(registerPayload.email);
        expect(user.username).toBe(registerPayload.username);
      });
    });

    it("should successfully log in a user using their username with correct credentials", async () => {
      const registerPayload = createValidUserPayload({
        email: "auth_username@vektora.io",
        username: "auth_test_2",
        password: "ValidPassword123!",
      });

      await runInSandbox(async (tx) => {
        await IdentityService.registerNewUser(registerPayload, tx);

        const user = await IdentityService.authenticateUser(
          {
            usernameOrEmail: "auth_test_2",
            password: "ValidPassword123!",
          },
          tx,
        );

        expect(user).toBeDefined();
        expect(user.username).toBe(registerPayload.username);
      });
    });

    it("should throw an UnauthorizedError if the provided username or email does not exist", async () => {
      await runInSandbox(async (tx) => {
        const promise = IdentityService.authenticateUser(
          {
            usernameOrEmail: "ghost_user",
            password: "SomePassword123!",
          },
          tx,
        );

        await expect(promise).rejects.toThrow(UnauthorizedError);
        await expect(promise).rejects.toThrow("Invalid credentials provided.");
      });
    });

    it("should throw an UnauthorizedError if the credentials contain an invalid password string", async () => {
      const registerPayload = createValidUserPayload({
        email: "wrong_password@vektora.io",
        username: "auth_test_3",
        password: "CorrectPassword123!",
      });

      await runInSandbox(async (tx) => {
        await IdentityService.registerNewUser(registerPayload, tx);

        const promise = IdentityService.authenticateUser(
          {
            usernameOrEmail: "auth_test_3",
            password: "WrongPassword123!",
          },
          tx,
        );

        await expect(promise).rejects.toThrow(UnauthorizedError);
        await expect(promise).rejects.toThrow("Invalid credentials provided.");
      });
    });
  });
});
