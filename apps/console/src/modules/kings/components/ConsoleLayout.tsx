import { NavLink, Outlet } from "react-router-dom";
import { useState } from "react";
import { setEnvironment } from "../api";
const sections = [
  ["/", "Overview"],
  ["/users", "Players"],
  ["/characters", "Characters"],
  ["/campaigns", "Campaigns"],
  ["/active", "Campaign slots"],
  ["/invite-codes", "Invitations"],
  ["/audit", "Activity"],
];
export function Layout() {
  const [environment, changeEnvironment] = useState("production");
  return (
    <>
      <label className="environment-picker">
        Environment{" "}
        <select
          value={environment}
          onChange={(event) => {
            setEnvironment(event.target.value);
            changeEnvironment(event.target.value);
          }}
        >
          <option value="production">Production</option>
          <option value="staging">Staging</option>
        </select>
      </label>
      <p className="notice">
        {environment === "production"
          ? "Actions affect live game data."
          : "Actions affect the staging database."}{" "}
        Clearing a slot removes database tracking; it does not stop an ongoing
        game. Reviving a character restores the saved character, not an ongoing
        campaign.
      </p>
      <nav className="game-tabs" aria-label="King’s administration">
        {sections.map(([to, label]) => (
          <NavLink key={to} to={to} end={to === "/"}>
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="game-workspace" key={environment}>
        <Outlet />
      </div>
    </>
  );
}
