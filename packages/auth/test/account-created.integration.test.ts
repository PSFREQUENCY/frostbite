import { authUsers, walletIdentities } from "@frostbite/database";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { createDrizzleWalletAuthRepository } from "../src/adapters/drizzle-wallet-auth-repository.ts";
import type {
  AccountCreatedHook,
  NewAccount,
} from "../src/application/account-created.ts";
import { createWalletAuthService } from "../src/application/service.ts";
import { strictBip322Verifier } from "../src/bitcoin/verifier.ts";
import { createDrizzleContactCodeRepository } from "../src/contacts/drizzle-repository.ts";
import {
  clock,
  database,
  issueInput,
  sessionMaterial,
  useContactWorld,
} from "./support/contact-world.ts";
import {
  signWalletMessage,
  validChallengeInput,
  walletAuthPolicy,
} from "./support/fixtures.ts";

useContactWorld();

// A hook that records what it was told, and may be told to fail.
function recorder(failing = false) {
  const told: NewAccount[] = [];
  const hook: AccountCreatedHook = async (transaction, account) => {
    // It is given the transaction that is making the account: the account is there to be read, and goes if the transaction does.
    const [found] = await transaction
      .select({ id: authUsers.id })
      .from(authUsers)
      .where(eq(authUsers.id, account.userId));
    expect(found?.id).toBe(account.userId);
    told.push(account);
    if (failing) throw new Error("the hook failed");
  };
  return { hook, told };
}

const signInWithCode = async (
  repository: ReturnType<typeof createDrizzleContactCodeRepository>,
  referralCode: string | null,
  destination = "ada@example.com",
) => {
  const input = issueInput({ destination });
  await repository.issue(input);
  return {
    codeId: input.id,
    result: await repository.completeSignIn({
      accountName: "Email user",
      codeId: input.id,
      destination,
      kind: "email",
      now: clock.now,
      referralCode,
      session: sessionMaterial(),
    }),
  };
};

describe("telling that signing in made a new account, by email", () => {
  it("tells once, inside the transaction that makes the account, with the code the person arrived with", async () => {
    const { hook, told } = recorder();
    const repository = createDrizzleContactCodeRepository(database, {
      onAccountCreated: hook,
    });
    const { result } = await signInWithCode(repository, "23456789");
    if (result.kind !== "signed-in") throw new Error("expected a sign-in");
    expect(told).toEqual([
      {
        referralCode: "23456789",
        source: { kind: "contact" },
        userId: result.userId,
      },
    ]);
  });

  it("tells of no code when the person arrived with none, and never tells of an account that already existed", async () => {
    const { hook, told } = recorder();
    const repository = createDrizzleContactCodeRepository(database, {
      onAccountCreated: hook,
    });
    await signInWithCode(repository, null);
    expect(told.map(({ referralCode }) => referralCode)).toEqual([null]);
    clock.now = new Date(clock.now.getTime() + 120_000);
    await signInWithCode(repository, "23456789");
    expect(told).toHaveLength(1);
  });

  it("makes no account, spends no code and starts no session when the hook fails, so the person can try again", async () => {
    const { hook } = recorder(true);
    const repository = createDrizzleContactCodeRepository(database, {
      onAccountCreated: hook,
    });
    await expect(signInWithCode(repository, "23456789")).rejects.toThrow(
      "the hook failed",
    );
    expect(await database.select().from(authUsers)).toEqual([]);
  });

  it("signs in as before when no hook is given", async () => {
    const repository = createDrizzleContactCodeRepository(database);
    const { result } = await signInWithCode(repository, "23456789");
    expect(result.kind).toBe("signed-in");
  });
});

function walletServiceWith(hook?: AccountCreatedHook) {
  return createWalletAuthService({
    clock: () => clock.now,
    policy: walletAuthPolicy,
    repository: createDrizzleWalletAuthRepository(
      database,
      hook === undefined ? {} : { onAccountCreated: hook },
    ),
    verifier: strictBip322Verifier,
  });
}

async function walletSignIn(
  service: ReturnType<typeof walletServiceWith>,
  referralCode: string | null,
) {
  const challenge = await service.issue(validChallengeInput());
  if (challenge === null) throw new Error("The challenge was refused.");
  return service.verify({
    challengeId: challenge.challengeId,
    expectedAction: "sign-in",
    referralCode,
    signature: signWalletMessage(challenge.message),
  });
}

describe("telling that signing in made a new account, with a wallet", () => {
  it("tells once, with the code and the wallet the account was made with, and not again when the wallet signs in later", async () => {
    const { hook, told } = recorder();
    const service = walletServiceWith(hook);
    const first = await walletSignIn(service, "23456789");
    if (!first.ok) throw new Error(first.code);
    const [identity] = await database
      .select()
      .from(walletIdentities)
      .where(eq(walletIdentities.userId, first.userId));
    expect(told).toEqual([
      {
        referralCode: "23456789",
        source: {
          kind: "wallet",
          network: "signet",
          scriptIdentity: identity?.scriptIdentity,
        },
        userId: first.userId,
      },
    ]);
    await walletSignIn(service, "BCDFGHJK");
    expect(told).toHaveLength(1);
  });

  it("makes no account and spends no challenge when the hook fails, so the signature still works afterwards", async () => {
    const failing = walletServiceWith(recorder(true).hook);
    const challenge = await failing.issue(validChallengeInput());
    if (challenge === null) throw new Error("The challenge was refused.");
    const input = {
      challengeId: challenge.challengeId,
      expectedAction: "sign-in" as const,
      referralCode: null,
      signature: signWalletMessage(challenge.message),
    };
    await expect(failing.verify(input)).rejects.toThrow("the hook failed");
    expect(await database.select().from(authUsers)).toEqual([]);
    expect((await walletServiceWith().verify(input)).ok).toBe(true);
  });
});
