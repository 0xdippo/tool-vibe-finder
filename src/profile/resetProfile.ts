import { defaultProfile } from "./loadProfile.js";
import { clearProviderSecrets } from "./providerSecrets.js";
import { saveProfile } from "./saveProfile.js";
import { resetSessionContext } from "./sessionContext.js";
import type { VibeProfile } from "../types.js";

export async function resetProfile(): Promise<VibeProfile> {
  const freshProfile = JSON.parse(JSON.stringify(defaultProfile)) as VibeProfile;
  resetSessionContext();
  await clearProviderSecrets();
  await saveProfile(freshProfile);
  return freshProfile;
}
