import { describe, it, expect } from "vitest";
import { db, dbStorage } from "@/db";
import { IdentityService } from "./identity.service";
import { users } from "./identity.schema";
import { eq } from "drizzle-orm";
import { ConflictError, NotFoundError } from "@/shared/errors/app-error";
import { USER_CONTEXT } from "./identity.constants";
import { RegisterUserPayload, RegisterTalentPayload } from "./dto";

describe("IdentityService Integration Tests", () => {
  // =========================================================================
  // DATA FACTORIES
  // =========================================================================

  // Encapsulates valid state baselines to prevent data mutation leakage across test hooks
  const createValidUserPayload = (
    overrides?: Partial<RegisterUserPayload>,
  ): RegisterUserPayload => ({
    email: "mvp_player@vektora.io",
    username: "mvp_player",
    fullName: "Jane Doe",
    avatarUrl: "https://storage.vektora.io/avatars/mvp.png",
    ...overrides,
  });

  const createValidTalentPayload = (
    overrides?: Partial<RegisterTalentPayload>,
  ): RegisterTalentPayload => ({
    userId: "00000000-0000-0000-0000-000000000000", // Default invalid UUID anchor, overridden per test block
    bio: "Building low-poly game assets.",
    skills: ["Blender", "Substance Painter"],
    ...overrides,
  });

  // Enforces data isolation by executing test sequences within an automatically aborted transaction block
  const runInSandbox = async (testFn: () => Promise<void> | void) => {
    try {
      await db.transaction(async (tx) => {
        await dbStorage.run(tx, async () => {
          await testFn();
        });
        tx.rollback();
      });
    } catch (error: any) {
      // Intercept expected transaction cancellation markers gracefully to allow test teardown
      if (
        error?.message?.includes("Rollback") ||
        error?.name === "RollbackError"
      ) {
        return;
      }
      throw error;
    }
  };

  // =========================================================================
  // TESTING DOMAINS
  // =========================================================================
  describe("createNewUser", () => {
    it("should successfully register a new user profile", async () => {
      const payload = createValidUserPayload();

      await runInSandbox(async () => {
        const user = await IdentityService.createNewUser(payload);

        expect(user).toBeDefined();
        expect(user.id).toBeDefined();
        expect(user.email).toBe(payload.email);
        expect(user.username).toBe(payload.username);
        expect(user.currentContext).toBe(USER_CONTEXT.USER);

        const dbRow = await db.query.users.findFirst({
          where: eq(users.id, user.id),
        });
        expect(dbRow).toBeDefined();
      });
    });

    it("should throw a ConflictError if the email address is already registered", async () => {
      const firstUser = createValidUserPayload({
        email: "conflict@vektora.io",
        username: "user_a",
      });
      const secondUser = createValidUserPayload({
        email: "conflict@vektora.io",
        username: "user_b",
      });

      await runInSandbox(async () => {
        await IdentityService.createNewUser(firstUser);

        await expect(IdentityService.createNewUser(secondUser)).rejects.toThrow(
          new ConflictError("This email address is already registered."),
        );
      });
    });

    it("should throw a ConflictError if the username is already taken", async () => {
      const firstUser = createValidUserPayload({
        email: "user_a@vektora.io",
        username: "clonewarrior",
      });
      const secondUser = createValidUserPayload({
        email: "user_b@vektora.io",
        username: "clonewarrior",
      });

      await runInSandbox(async () => {
        await IdentityService.createNewUser(firstUser);

        await expect(IdentityService.createNewUser(secondUser)).rejects.toThrow(
          new ConflictError("This username is already taken."),
        );
      });
    });
  });

  describe("registerAsTalent", () => {
    it("should throw a NotFoundError if upgrading a non-existent user profile", async () => {
      const payload = createValidTalentPayload();

      await runInSandbox(async () => {
        await expect(IdentityService.registerAsTalent(payload)).rejects.toThrow(
          new NotFoundError("Target user profile does not exist."),
        );
      });
    });

    it("should atomically create a talent entry and upgrade the user context flag", async () => {
      await runInSandbox(async () => {
        const user = await IdentityService.createNewUser(
          createValidUserPayload({
            email: "creator@vektora.io",
            username: "asset_master",
          }),
        );

        const talentPayload = createValidTalentPayload({ userId: user.id });
        const talent = await IdentityService.registerAsTalent(talentPayload);

        expect(talent).toBeDefined();
        expect(talent.userId).toBe(user.id);
        expect(talent.skills).toContain("Blender");

        const updatedUser = await db.query.users.findFirst({
          where: eq(users.id, user.id),
        });
        expect(updatedUser?.currentContext).toBe(USER_CONTEXT.TALENT);
        expect(updatedUser?.updatedAt).toBeDefined();
      });
    });

    it("should throw a ConflictError if the target profile is already a talent", async () => {
      await runInSandbox(async () => {
        const user = await IdentityService.createNewUser(
          createValidUserPayload({
            email: "double@vektora.io",
            username: "double_talent",
          }),
        );

        const payload = createValidTalentPayload({ userId: user.id });

        await IdentityService.registerAsTalent(payload);

        await expect(IdentityService.registerAsTalent(payload)).rejects.toThrow(
          new ConflictError("This user is already registered as a talent."),
        );
      });
    });
  });
});
