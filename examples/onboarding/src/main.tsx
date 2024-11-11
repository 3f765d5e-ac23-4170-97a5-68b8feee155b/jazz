import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { DemoAuthBasicUI, createJazzReactApp, useDemoAuth } from "jazz-react";
import { HRAccount } from "./schema.ts";

const Jazz = createJazzReactApp({
  AccountSchema: HRAccount,
});
export const { useAccount, useCoState, useAcceptInvite } = Jazz;

function JazzAndAuth({ children }: { children: React.ReactNode }) {
  const [auth, authState] = useDemoAuth();
  return (
    <>
      <Jazz.Provider
        auth={auth}
        // replace `you@example.com` with your email as a temporary API key
        peer="wss://cloud.jazz.tools/?key=you@example.com"
      >
        {children}
      </Jazz.Provider>
      {authState.state !== "signedIn" && (
        <DemoAuthBasicUI appName="Jazz Onboarding" state={authState} />
      )}
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <JazzAndAuth>
      <App />
    </JazzAndAuth>
  </React.StrictMode>,
);
