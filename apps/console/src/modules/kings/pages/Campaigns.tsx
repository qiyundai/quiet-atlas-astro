import { fetchCampaigns, type Campaign } from "../api";
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
export const campaignColumns: Column<Campaign>[] = [
  { key: "id", label: "Campaign", render: (row) => <code>{row.id}</code> },
  {
    key: "status",
    label: "Status",
    render: (row) => <Badge value={row.status} />,
  },
  { key: "stage", label: "Stage" },
  {
    key: "result",
    label: "Result",
    render: (row) =>
      row.result ? <Badge value={row.result} /> : "In progress",
  },
  {
    key: "created_at",
    label: "Created",
    render: (row) => formatDateTime(row.created_at),
  },
];
export function Campaigns() {
  const list = useListOptions();
  const resource = useResource(() => fetchCampaigns(list.options), [list.key]);
  return (
    <>
      <PageHeader
        title="Campaigns"
        description="Browse the campaign register and inspect each party’s journey."
      />
      <ListToolbar
        search={list.options.search!}
        status={list.options.status}
        statuses={["lobby", "planning", "active", "complete"]}
        onSearch={(value) => list.update("search", value)}
        onStatus={(value) => list.update("status", value)}
        onRefresh={resource.reload}
      />
      <ResourceState {...resource} retry={resource.reload}>
        <DataTable
          columns={campaignColumns}
          rows={resource.data ?? []}
          getRowKey={(row) => row.id}
          linkTo={(row) => `/campaigns/${row.id}`}
          total={resource.total}
          {...list.options}
          onPageChange={list.page}
        />
      </ResourceState>
    </>
  );
}
