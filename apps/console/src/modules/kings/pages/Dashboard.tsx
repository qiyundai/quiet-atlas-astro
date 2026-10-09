import { Link } from "react-router-dom";
import { fetchStats, fetchCampaigns } from "../api";
import { PageHeader, ResourceState, useResource } from "../components/Resource";
import { DataTable } from "../components/DataTable";
import { campaignColumns } from "./Campaigns";
export function Dashboard() {
  const stats = useResource(fetchStats);
  const recent = useResource(() => fetchCampaigns({ limit: 5 }));
  const refresh = () => {
    stats.reload();
    recent.reload();
  };
  return (
    <>
      <PageHeader
        eyebrow="Your workspace at a glance"
        title="Overview"
        description="A clear view of the players and journeys in your realm."
        actions={
          <button className="admin-btn" onClick={refresh}>
            ↻ Refresh overview
          </button>
        }
      />
      <ResourceState {...stats} retry={stats.reload}>
        {stats.data && (
          <>
            <div className="metric-grid">
              {[
                {
                  label: "Total players",
                  value: stats.data.totalUsers,
                  to: "/users",
                  note: "Registered accounts",
                  symbol: "◎",
                },
                {
                  label: "Characters",
                  value: stats.data.totalCharacters,
                  to: "/characters",
                  note: "Heroes in the realm",
                  symbol: "♙",
                },
                {
                  label: "Active campaigns",
                  value: stats.data.activeCampaigns,
                  to: "/campaigns?status=active",
                  note: "Includes lobbies & planning",
                  symbol: "⚑",
                },
                {
                  label: "Campaign win rate",
                  value: stats.data.completedCampaigns
                    ? `${Math.round((stats.data.totalWins / stats.data.completedCampaigns) * 100)}%`
                    : "—",
                  to: "/campaigns?status=complete",
                  note: `${stats.data.totalWins} wins / ${stats.data.completedCampaigns} completed`,
                  symbol: "↗",
                },
              ].map((metric) => (
                <Link className="metric-card" key={metric.label} to={metric.to}>
                  <div>
                    <span>{metric.label}</span>
                    <span className="metric-symbol" aria-hidden="true">
                      {metric.symbol}
                    </span>
                  </div>
                  <strong>
                    {typeof metric.value === "number"
                      ? metric.value.toLocaleString()
                      : metric.value}
                  </strong>
                  <small>{metric.note}</small>
                </Link>
              ))}
            </div>
            <div className="overview-columns">
              <section className="admin-surface overview-panel">
                <p className="eyebrow">CAMPAIGN OPERATIONS</p>
                <h2>Keep the party moving.</h2>
                <p>
                  Review character reservations and clear stale tracking entries
                  when a player needs help.
                </p>
                <div className="overview-count">
                  <strong>{stats.data.activeSlots}</strong>
                  <span>active character slots</span>
                </div>
                <Link className="admin-btn admin-btn-primary" to="/active">
                  Manage campaign slots <span aria-hidden="true">↗</span>
                </Link>
              </section>
              <section className="admin-surface overview-panel">
                <p className="eyebrow">ACCESS MANAGEMENT</p>
                <h2>Welcome the next adventurers.</h2>
                <p>
                  Create invite codes, check redemption, and remove unused
                  invitations.
                </p>
                <div className="overview-count">
                  <strong>{stats.data.availableInvites}</strong>
                  <span>invitations available</span>
                </div>
                <Link className="admin-btn" to="/invite-codes">
                  Manage invitations <span aria-hidden="true">↗</span>
                </Link>
              </section>
            </div>
          </>
        )}
      </ResourceState>
      <section className="mt-8">
        <div className="section-heading">
          <div>
            <h2>Recent campaigns</h2>
            <p>The latest journeys created by your players.</p>
          </div>
          <Link to="/campaigns" className="text-link">
            View all campaigns ↗
          </Link>
        </div>
        <ResourceState {...recent} retry={recent.reload}>
          <DataTable
            columns={campaignColumns}
            rows={recent.data ?? []}
            getRowKey={(row) => row.id}
            linkTo={(row) => `/campaigns/${row.id}`}
          />
        </ResourceState>
      </section>
    </>
  );
}
