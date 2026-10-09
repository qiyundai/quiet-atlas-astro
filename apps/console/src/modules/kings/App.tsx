import { Routes, Route, Link } from "react-router-dom";
import { Layout } from "./components/ConsoleLayout";
import { Dashboard } from "./pages/Dashboard";
import { Users } from "./pages/Users";
import { UserDetail } from "./pages/UserDetail";
import { Characters } from "./pages/Characters";
import { CharacterDetail } from "./pages/CharacterDetail";
import { Campaigns } from "./pages/Campaigns";
import { CampaignDetail } from "./pages/CampaignDetail";
import { ActiveCampaigns } from "./pages/ActiveCampaigns";
import { InviteCodes } from "./pages/InviteCodes";
import { AuditPage } from "./pages/AuditPage";

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="users" element={<Users />} />
        <Route path="users/:id" element={<UserDetail />} />
        <Route path="characters" element={<Characters />} />
        <Route path="characters/:id" element={<CharacterDetail />} />
        <Route path="campaigns" element={<Campaigns />} />
        <Route path="campaigns/:id" element={<CampaignDetail />} />
        <Route path="active" element={<ActiveCampaigns />} />
        <Route path="invite-codes" element={<InviteCodes />} />
        <Route path="audit" element={<AuditPage />} />
        <Route
          path="*"
          element={
            <div className="state-panel">
              <h1>Page not found</h1>
              <Link className="admin-btn" to="/">
                Return to overview
              </Link>
            </div>
          }
        />
      </Route>
    </Routes>
  );
}
