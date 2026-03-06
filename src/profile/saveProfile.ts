import { writeJsonFile } from "../lib/files.js";
import { PROFILE_PATH } from "../lib/paths.js";
import { extractProviderSecrets, saveProviderSecrets, stripSensitiveProfileState } from "./providerSecrets.js";
import { saveSessionContext } from "./sessionContext.js";
import type { VibeProfile } from "../types.js";

export async function saveProfile(profile: VibeProfile): Promise<void> {
  saveSessionContext(profile.session_context);
  await saveProviderSecrets(extractProviderSecrets(profile));
  await writeJsonFile(PROFILE_PATH, stripSensitiveProfileState(profile));
}
