import { fetchUsers, type User } from "../api";
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
const columns: Column<User>[] = [
  { key: "display_name", label: "Player" },
  {
    key: "oauth_provider",
    label: "Sign-in method",
    render: (row) => <Badge value={row.oauth_provider} />,
  },
  {
    key: "last_login",
    label: "Last seen",
    render: (row) => formatDate(row.last_login),
  },
  {
    key: "created_at",
    label: "Joined",
    render: (row) => formatDate(row.created_at),
  },
  {
    key: "id",
    label: "Account ID",
    render: (row) => <code title={row.id}>{row.id}</code>,
  },
];
export function Users() {
  const list = useListOptions();
  const resource = useResource(() => fetchUsers(list.options), [list.key]);
  return (
    <>
      <PageHeader
        title="Players"
        description="Find accounts, review their characters, and resolve account issues."
      />
      <ListToolbar
        search={list.options.search!}
        onSearch={(value) => list.update("search", value)}
        onRefresh={resource.reload}
      />
      <ResourceState {...resource} retry={resource.reload}>
        <DataTable
          columns={columns}
          rows={resource.data ?? []}
          getRowKey={(row) => row.id}
          linkTo={(row) => `/users/${row.id}`}
          total={resource.total}
          {...list.options}
          onPageChange={list.page}
        />
      </ResourceState>
    </>
  );
}
