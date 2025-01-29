import { JazzProvider, PasskeyAuthBasicUI } from "jazz-react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

function JazzAndAuth({ children }: { children: React.ReactNode }) {
  return (
    <JazzProvider peer="wss://cloud.jazz.tools/?key=minimal-auth-passkey-example@garden.co">
      <PasskeyAuthBasicUI appName="Jazz Minimal Auth Passkey Example">
        {children}
      </PasskeyAuthBasicUI>
    </JazzProvider>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <JazzAndAuth>
      <App />
    </JazzAndAuth>
  </StrictMode>,
);
