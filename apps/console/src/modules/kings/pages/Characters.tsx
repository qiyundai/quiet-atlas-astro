import { fetchCharacters, type Character } from "../api";
import { DataTable, type Column } from "../components/DataTable";
import {
  ListToolbar,
  PageHeader,
  ResourceState,
  useListOptions,
  useResource,
  Badge,
} from "../components/Resource";
import { formatDate } from "../format";
export const characterColumns: Column<Character>[] = [
  { key: "name", label: "Character" },
  { key: "class", label: "Class" },
  {
    key: "is_alive",
    label: "Status",
    render: (row) => (
      <Badge
        value={
          !row.is_alive
            ? "fallen"
            : row.in_campaign
              ? "in campaign"
              : "available"
        }
      />
    ),
  },
  { key: "mode", label: "Mode" },
  { key: "user_name", label: "Player" },
  {
    key: "wins",
    label: "Wins / Losses",
    render: (row) => `${row.wins} / ${row.losses}`,
  },
  {
    key: "created_at",
    label: "Created",
    render: (row) => formatDate(row.created_at),
  },
];
export function Characters() {
  const list = useListOptions();
  const resource = useResource(() => fetchCharacters(list.options), [list.key]);
  return (
    <>
      <PageHeader
        title="Characters"
        description="Inspect hero progression, saved decks, and campaign history."
      />
      <ListToolbar
        search={list.options.search!}
        onSearch={(value) => list.update("search", value)}
        onRefresh={resource.reload}
      />
      <ResourceState {...resource} retry={resource.reload}>
        <DataTable
          columns={characterColumns}
          rows={resource.data ?? []}
          getRowKey={(row) => row.id}
          linkTo={(row) => `/characters/${row.id}`}
          total={resource.total}
          {...list.options}
          onPageChange={list.page}
        />
      </ResourceState>
    </>
  );
}
