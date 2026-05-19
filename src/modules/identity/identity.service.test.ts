import { describe, it, expect } from "vitest";
import { db, dbStorage } from "@/db";
import { IdentityService } from "./identity.service";
import { users } from "./identity.schema";
import { eq } from "drizzle-orm";
import { ConflictError, NotFoundError } from "@/shared/errors/app-error";
import { USER_CONTEXT } from "./identity.constants";
import { RegisterUserPayload, RegisterTalentPayload } from "./validators";
import { SecurityUtil } from "@/shared/utils/security.util";

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
    avatarUrl: "https://storage.vektora.io/avatars/mvp.png",
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

  // Enforces complete isolation by passing the explicit transaction context block down into the test runner
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
    it("should successfully register a new user profile and encrypt credentials", async () => {
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

        // Audit via the isolation parameter reference to avoid fallback connection leakages
        const dbRow = await tx.query.users.findFirst({
          where: eq(users.id, user.id),
        });

        expect(dbRow).toBeDefined();
        expect(dbRow?.passwordHash).toBeDefined();
        expect(dbRow?.passwordHash).not.toBe(payload.password);

        const isValidPassword = await SecurityUtil.verifyPassword(
          payload.password,
          dbRow!.passwordHash,
        );
        expect(isValidPassword).toBe(true);
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

      await runInSandbox(async (tx) => {
        await IdentityService.registerNewUser(firstUser, tx);

        await expect(
          IdentityService.registerNewUser(secondUser, tx),
        ).rejects.toThrow(
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

      await runInSandbox(async (tx) => {
        await IdentityService.registerNewUser(firstUser, tx);

        await expect(
          IdentityService.registerNewUser(secondUser, tx),
        ).rejects.toThrow(new ConflictError("This username is already taken."));
      });
    });
  });

  describe("registerAsTalent", () => {
    it("should throw a NotFoundError if upgrading a non-existent user profile", async () => {
      const payload = createValidTalentPayload();

      await runInSandbox(async (tx) => {
        await expect(
          IdentityService.registerAsTalent(payload, tx),
        ).rejects.toThrow(
          new NotFoundError("Target user profile does not exist."),
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

    it("should throw a ConflictError if the target profile is already a talent", async () => {
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

        await expect(
          IdentityService.registerAsTalent(payload, tx),
        ).rejects.toThrow(
          new ConflictError("This user is already registered as a talent."),
        );
      });
    });

    it("should throw a ConflictError if attempting to upgrade a deactivated user profile", async () => {
      await runInSandbox(async (tx) => {
        const user = await IdentityService.registerNewUser(
          createValidUserPayload({
            email: "banned_user@vektora.io",
            username: "rule_breaker",
          }),
          tx,
        );

        // Target modifications explicitly through the sanboxed tx context reference
        await tx
          .update(users)
          .set({ isActive: false })
          .where(eq(users.id, user.id));

        const payload = createValidTalentPayload({ userId: user.id });

        await expect(
          IdentityService.registerAsTalent(payload, tx),
        ).rejects.toThrow(
          new ConflictError(
            "Action denied. This user account profile is currently deactivated.",
          ),
        );
      });
    });
  });
});
