import { TDSMobileAITProvider } from "@toss/tds-mobile-ait";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App, { AppErrorBoundary } from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppErrorBoundary>
      <TDSMobileAITProvider brandPrimaryColor="#3b6cff">
        <App />
      </TDSMobileAITProvider>
    </AppErrorBoundary>
  </StrictMode>,
);
