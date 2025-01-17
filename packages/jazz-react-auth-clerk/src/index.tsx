import {
  BrowserClerkAuth,
  type MinimalClerkClient,
} from "jazz-browser-auth-clerk";
import { useAnonymousUserUpgrade } from "jazz-react";
import { useMemo, useState } from "react";

export function useJazzClerkAuth(
  clerk: MinimalClerkClient & {
    signOut: () => Promise<unknown>;
  },
  onAnonymousUserUpgrade: (props: {
    username: string;
    isSignUp: boolean;
    isLogIn: boolean;
  }) => void = () => {},
) {
  const [state, setState] = useState<{ errors: string[] }>({ errors: [] });

  const authMethod = useMemo(() => {
    return new BrowserClerkAuth(
      {
        onError: (error) => {
          void clerk.signOut();
          setState((state) => ({
            ...state,
            errors: [...state.errors, error.toString()],
          }));
        },
      },
      clerk,
    );
  }, [clerk.user]);

  useAnonymousUserUpgrade({
    auth: authMethod,
    onUpgrade: onAnonymousUserUpgrade,
  });

  return [authMethod, state] as const;
}
