import { TDSMobileAITProvider } from "@toss/tds-mobile-ait";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import AccountAction from "./pages/AccountAction/AccountAction.jsx";
import SecurityAssistant from "./pages/AccountAction/SecurityAssistant.jsx";
import IncidentIntakePage from "./pages/IncidentIntake/IncidentIntakePage.jsx";
import App, { AppErrorBoundary, ChatTab, RecordsTab } from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppErrorBoundary>
      <TDSMobileAITProvider brandPrimaryColor="#3b6cff">
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<IncidentIntakePage />} />
            <Route path="/chat" element={<App />}>
              <Route index element={<ChatTab />} />
              <Route path="records" element={<RecordsTab />} />
            </Route>
            <Route path="/security-assistant" element={<SecurityAssistant />} />
            <Route path="/account-action/:serviceAccountId" element={<AccountAction />} />
          </Routes>
        </BrowserRouter>
      </TDSMobileAITProvider>
    </AppErrorBoundary>
  </StrictMode>,
);
