import { AgentSecret } from "cojson";
import { BrowserDemoAuth } from "jazz-browser";
import { Account, ID } from "jazz-tools";
import { computed, watch } from "vue";
import { useJazzContext } from "../composables.js";
import { useIsAnonymousUser } from "./useIsAnonymousUser.js";

export function useDemoAuth(
  options: {
    seedAccounts?: {
      [name: string]: { accountID: ID<Account>; accountSecret: AgentSecret };
    };
  } = {},
) {
  const context = useJazzContext();

  const authMethod = computed(
    () => new BrowserDemoAuth(context.value.authenticate, options.seedAccounts),
  );

  const isAnonymousUser = useIsAnonymousUser();

  watch(isAnonymousUser, () => {
    console.log("isAnonymousUser", isAnonymousUser.value);
  });

  return computed(() => ({
    state: isAnonymousUser.value ? "anonymous" : "signedIn",
    logIn(username: string) {
      authMethod.value.logIn(username);
    },
    signUp(username: string) {
      authMethod.value.signUp(username);
    },
    existingUsers: authMethod.value.getExistingUsers(),
  }));
}
