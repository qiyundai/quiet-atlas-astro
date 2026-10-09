import { useState } from "react";
import { Link } from "react-router-dom";
import {
  fetchActiveCampaigns,
  deleteActiveCampaignByCharacter,
  deleteActiveCampaignByCampaign,
  type ActiveCampaign,
} from "../api";
import { Confirm } from "../components/Confirm";
import { DataTable, type Column } from "../components/DataTable";
import {
  ListToolbar,
  PageHeader,
  ResourceState,
  useListOptions,
  useResource,
  Badge,
} from "../components/Resource";
import { formatDateTime } from "../format";
type Action = { type: "character" | "campaign"; id: string; name: string };
export function ActiveCampaigns() {
  const list = useListOptions();
  const resource = useResource(
    () => fetchActiveCampaigns(list.options),
    [list.key],
  );
  const [action, setAction] = useState<Action | null>(null);
  const [notice, setNotice] = useState("");
  const columns: Column<ActiveCampaign>[] = [
    {
      key: "character_name",
      label: "Character",
      render: (row) => (
        <Link className="text-link" to={`/characters/${row.character_id}`}>
          {row.character_name}
        </Link>
      ),
    },
    {
      key: "user_name",
      label: "Player",
      render: (row) => (
        <Link className="text-link" to={`/users/${row.user_id}`}>
          {row.user_name ?? row.user_id}
        </Link>
      ),
    },
    {
      key: "campaign_id",
      label: "Campaign",
      render: (row) => (
        <Link className="text-link" to={`/campaigns/${row.campaign_id}`}>
          <code>{row.campaign_id}</code>
        </Link>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => <Badge value={row.status} />,
    },
    {
      key: "joined_at",
      label: "Joined",
      render: (row) => formatDateTime(row.joined_at),
    },
    {
      key: "actions",
      label: "Recovery actions",
      render: (row) => (
        <div className="flex gap-2">
          <button
            className="admin-btn"
            onClick={() =>
              setAction({
                type: "character",
                id: row.character_id,
                name: row.character_name,
              })
            }
          >
            Clear character
          </button>
          <button
            className="admin-btn"
            onClick={() =>
              setAction({
                type: "campaign",
                id: row.campaign_id,
                name: row.campaign_id,
              })
            }
          >
            Clear campaign
          </button>
        </div>
      ),
    },
  ];
  return (
    <>
      <PageHeader
        title="Campaign slots"
        description="Review active reservations and completed journeys awaiting dismissal."
      />
      <div className="info-note">
        Clearing a slot removes resume tracking and releases the character. It
        does not end a campaign or remove a player from its live game. Use
        recovery actions only for stale entries.
      </div>
      {notice && (
        <p className="success-note" role="status">
          {notice}
        </p>
      )}
      <ListToolbar
        search={list.options.search!}
        status={list.options.status}
        statuses={["active", "complete"]}
        onSearch={(value) => list.update("search", value)}
        onStatus={(value) => list.update("status", value)}
        onRefresh={resource.reload}
      />
      <ResourceState {...resource} retry={resource.reload}>
        <DataTable
          columns={columns}
          rows={resource.data ?? []}
          getRowKey={(row) =>
            `${row.user_id}-${row.campaign_id}-${row.character_id}`
          }
          total={resource.total}
          {...list.options}
          onPageChange={list.page}
        />
      </ResourceState>
      <Confirm
        open={!!action}
        title={
          action?.type === "character"
            ? "Clear character tracking?"
            : "Clear campaign tracking?"
        }
        message={
          action?.type === "character"
            ? `Clear all resume entries for ${action.name}? This releases the character for selection without changing the live game.`
            : `Clear all players’ resume entries for ${action?.name}? The live campaign will continue to exist.`
        }
        confirmLabel="Clear tracking"
        onCancel={() => setAction(null)}
        onConfirm={async () => {
          if (!action) return;
          const result = await (action.type === "character"
            ? deleteActiveCampaignByCharacter(action.id)
            : deleteActiveCampaignByCampaign(action.id));
          setNotice(`${result.deleted ?? 0} tracking entries cleared.`);
          setAction(null);
          resource.reload();
        }}
      />
    </>
  );
}
