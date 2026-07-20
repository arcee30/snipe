import type { User } from "@/lib/auction-ui";

const underworldUnlockPrefix = "snipe-underworld-unlocked";
const underworldOnboardingPrefix = "snipe-underworld-arrival-2026-06-27";
const underworldAliasPrefix = "snipe-underworld-alias";

export function underworldStorageKeys(
  user: Pick<User, "id" | "email" | "username"> | null
) {
  const accountKey = user?.id ?? user?.email ?? user?.username ?? "anonymous";
  const safeAccountKey = accountKey.toLowerCase().replace(/[^a-z0-9_-]/g, "-");

  return {
    unlock: `${underworldUnlockPrefix}:${safeAccountKey}`,
    alias: `${underworldAliasPrefix}:${safeAccountKey}`,
    onboarding: `${underworldOnboardingPrefix}:${safeAccountKey}:complete`
  };
}
