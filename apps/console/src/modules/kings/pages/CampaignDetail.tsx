import { Link, useParams } from "react-router-dom";
import { fetchCampaign } from "../api";
import { DataTable } from "../components/DataTable";
import {
  PageHeader,
  ResourceState,
  useResource,
  Badge,
} from "../components/Resource";
import { formatDateTime } from "../format";
export function CampaignDetail() {
  const { id = "" } = useParams();
  const resource = useResource(() => fetchCampaign(id), [id]);
  const data = resource.data;
  return (
    <>
      <Link className="back-link" to="/campaigns">
        ← All campaigns
      </Link>
      <ResourceState {...resource} retry={resource.reload}>
        {data && (
          <>
            <PageHeader
              title="Campaign details"
              description={data.campaign.id}
              actions={
                <>
                  <Badge value={data.campaign.status} />
                  <button className="admin-btn" onClick={resource.reload}>
                    Refresh
                  </button>
                </>
              }
            />
            <dl className="detail-grid">
              <div>
                <dt>Stage</dt>
                <dd>{data.campaign.stage}</dd>
              </div>
              <div>
                <dt>Result</dt>
                <dd>
                  {data.campaign.result?.replace(/_/g, " ") ?? "In progress"}
                </dd>
              </div>
              <div>
                <dt>Created</dt>
                <dd>{formatDateTime(data.campaign.created_at)}</dd>
              </div>
              <div>
                <dt>Completed</dt>
                <dd>{formatDateTime(data.campaign.completed_at)}</dd>
              </div>
            </dl>
            <div className="section-heading">
              <h2>
                Party members{" "}
                <span className="muted">({data.enrollments.length})</span>
              </h2>
              <Link
                className="text-link"
                to={`/active?search=${encodeURIComponent(id)}`}
              >
                View tracking slots ↗
              </Link>
            </div>
            <DataTable
              rows={data.enrollments}
              getRowKey={(row) => `${row.campaign_id}-${row.character_id}`}
              columns={[
                {
                  key: "character_name",
                  label: "Character",
                  render: (row) => (
                    <Link
                      className="text-link"
                      to={`/characters/${row.character_id}`}
                    >
                      {row.character_name}
                    </Link>
                  ),
                },
                {
                  key: "user_name",
                  label: "Player",
                  render: (row) => (
                    <Link className="text-link" to={`/users/${row.user_id}`}>
                      {row.user_name}
                    </Link>
                  ),
                },
                { key: "class", label: "Class" },
                { key: "mode", label: "Mode" },
                {
                  key: "survived",
                  label: "Survived",
                  render: (row) =>
                    row.survived === null
                      ? "Pending"
                      : row.survived
                        ? "Yes"
                        : "No",
                },
                {
                  key: "joined_at",
                  label: "Joined",
                  render: (row) => formatDateTime(row.joined_at),
                },
              ]}
            />
          </>
        )}
      </ResourceState>
    </>
  );
}
